'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Download, Trash2, Upload, ZoomIn, ZoomOut, Grip, Play } from 'lucide-react';

interface JourneyNode {
  id: string;
  department: 'used_car' | 'service';
  title: string;
  caption: string;
  video_url: string | null;
  video_filename: string | null;
  position_x: number;
  position_y: number;
  created_at?: string;
  updated_at?: string;
}

interface Connection {
  id: string;
  from_node_id: string;
  to_node_id: string;
}

interface Point {
  x: number;
  y: number;
}

export default function BuyerJourneyCanvas() {
  // State
  const [nodes, setNodes] = useState<JourneyNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<'used_car' | 'service' | 'all'>('all');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Node interaction states
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  
  // Connection states
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<Point | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load nodes and connections from database
  useEffect(() => {
    loadData();
    
    // Set up realtime subscriptions
    const nodesChannel = supabase
      .channel('buyer_journey_nodes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buyer_journey_nodes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNodes((prev) => [...prev, payload.new as JourneyNode]);
          } else if (payload.eventType === 'UPDATE') {
            setNodes((prev) =>
              prev.map((node) => (node.id === payload.new.id ? payload.new as JourneyNode : node))
            );
          } else if (payload.eventType === 'DELETE') {
            setNodes((prev) => prev.filter((node) => node.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const connectionsChannel = supabase
      .channel('buyer_journey_connections_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buyer_journey_connections' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConnections((prev) => [...prev, payload.new as Connection]);
          } else if (payload.eventType === 'DELETE') {
            setConnections((prev) => prev.filter((conn) => conn.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(nodesChannel);
      supabase.removeChannel(connectionsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [nodesRes, connectionsRes] = await Promise.all([
        supabase.from('buyer_journey_nodes').select('*').order('created_at', { ascending: true }),
        supabase.from('buyer_journey_connections').select('*')
      ]);

      if (nodesRes.data) setNodes(nodesRes.data);
      if (connectionsRes.data) setConnections(connectionsRes.data);
    } catch (error) {
      console.error('Error loading buyer journey data:', error);
    }
  };

  // Create new node
  const createNode = async (department: 'used_car' | 'service') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const newNode = {
        department,
        title: 'New Stage',
        caption: 'Add description here...',
        video_url: null,
        video_filename: null,
        position_x: (300 - offset.x) / scale,
        position_y: (200 - offset.y) / scale,
        created_by: userData?.user?.id
      };

      const { data, error } = await supabase
        .from('buyer_journey_nodes')
        .insert([newNode])
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error creating node:', error);
      alert('Failed to create node');
    }
  };

  // Update node
  const updateNode = async (nodeId: string, updates: Partial<JourneyNode>) => {
    try {
      const { error } = await supabase
        .from('buyer_journey_nodes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', nodeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  // Delete node
  const deleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node?')) return;
    
    try {
      const { error } = await supabase
        .from('buyer_journey_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  // Upload video
  const uploadVideo = async (nodeId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${nodeId}_${Date.now()}.${fileExt}`;
      const filePath = `buyer-journey/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('buyer-journey-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('buyer-journey-videos')
        .getPublicUrl(filePath);

      await updateNode(nodeId, {
        video_url: publicUrl,
        video_filename: file.name
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video. Make sure the "buyer-journey-videos" storage bucket exists.');
    }
  };

  // Create connection
  const createConnection = async (fromNodeId: string, toNodeId: string) => {
    if (fromNodeId === toNodeId) return;
    
    // Check if connection already exists
    const exists = connections.some(
      (conn) =>
        (conn.from_node_id === fromNodeId && conn.to_node_id === toNodeId) ||
        (conn.from_node_id === toNodeId && conn.to_node_id === fromNodeId)
    );
    
    if (exists) return;

    try {
      const { error } = await supabase
        .from('buyer_journey_connections')
        .insert([{ from_node_id: fromNodeId, to_node_id: toNodeId }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  };

  // Delete connection
  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('buyer_journey_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  };

  // Pan and zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY / 1000;
      setScale((prev) => Math.min(Math.max(0.1, prev + delta), 3));
    }
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }

    // Update connection preview
    if (connectingFrom && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectionPreview({
        x: (e.clientX - rect.left - offset.x) / scale,
        y: (e.clientY - rect.top - offset.y) / scale
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    if (connectingFrom) {
      setConnectingFrom(null);
      setConnectionPreview(null);
    }
  };

  // Node drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest('.node-control')) return;
    
    e.stopPropagation();
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setDragStart({
        x: e.clientX / scale - node.position_x,
        y: e.clientY / scale - node.position_y
      });
    }
  };

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode && dragStart) {
      const node = nodes.find((n) => n.id === draggingNode);
      if (node) {
        const newX = e.clientX / scale - dragStart.x;
        const newY = e.clientY / scale - dragStart.y;
        
        setNodes((prev) =>
          prev.map((n) =>
            n.id === draggingNode
              ? { ...n, position_x: newX, position_y: newY }
              : n
          )
        );
      }
    }
  }, [draggingNode, dragStart, nodes, scale]);

  const handleNodeMouseUp = () => {
    if (draggingNode) {
      const node = nodes.find((n) => n.id === draggingNode);
      if (node) {
        updateNode(draggingNode, {
          position_x: node.position_x,
          position_y: node.position_y
        });
      }
      setDraggingNode(null);
      setDragStart(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingNode) {
        handleNodeMouseMove(e as any);
      }
    };

    const handleGlobalMouseUp = () => {
      handleNodeMouseUp();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingNode, handleNodeMouseMove]);

  // Get node position for rendering
  const getNodeScreenPosition = (node: JourneyNode) => {
    return {
      x: node.position_x * scale + offset.x,
      y: node.position_y * scale + offset.y
    };
  };

  // Filter nodes by department
  const filteredNodes = nodes.filter((node) => {
    if (selectedDepartment === 'all') return true;
    return node.department === selectedDepartment;
  });

  // Render connection line with arrow
  const renderConnection = (conn: Connection) => {
    const fromNode = nodes.find((n) => n.id === conn.from_node_id);
    const toNode = nodes.find((n) => n.id === conn.to_node_id);

    if (!fromNode || !toNode) return null;

    // Filter by department
    if (selectedDepartment !== 'all') {
      if (fromNode.department !== selectedDepartment || toNode.department !== selectedDepartment) {
        return null;
      }
    }

    const from = getNodeScreenPosition(fromNode);
    const to = getNodeScreenPosition(toNode);

    // Calculate arrow angle
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowSize = 10;

    return (
      <g key={conn.id}>
        <line
          x1={from.x + 150 * scale}
          y1={from.y + 100 * scale}
          x2={to.x + 150 * scale}
          y2={to.y + 100 * scale}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={2}
          className="cursor-pointer hover:stroke-white/60 transition-all"
          onClick={() => {
            if (confirm('Delete this connection?')) {
              deleteConnection(conn.id);
            }
          }}
        />
        {/* Arrow head */}
        <polygon
          points={`
            ${to.x + 150 * scale - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y + 100 * scale - arrowSize * Math.sin(angle - Math.PI / 6)}
            ${to.x + 150 * scale},${to.y + 100 * scale}
            ${to.x + 150 * scale - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y + 100 * scale - arrowSize * Math.sin(angle + Math.PI / 6)}
          `}
          fill="rgba(255, 255, 255, 0.3)"
        />
      </g>
    );
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Toolbar */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
            Buyer Journey Builder
          </h2>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">Department:</span>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40"
          >
            <option value="all">All Departments</option>
            <option value="used_car">Used Car Department</option>
            <option value="service">Service Department</option>
          </select>
        </div>

        {/* Add Node Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => createNode('used_car')}
            className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium text-sm flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Add Used Car Stage
          </button>
          <button
            onClick={() => createNode('service')}
            className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium text-sm flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Add Service Stage
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.1, 3))}
            className="p-2 bg-black/60 border border-white/20 rounded-lg hover:bg-black/80 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-sm text-white/70 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.1))}
            className="p-2 bg-black/60 border border-white/20 rounded-lg hover:bg-black/80 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="px-3 py-2 bg-black/60 border border-white/20 rounded-lg hover:bg-black/80 transition-colors text-sm"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleWheel}
      >
        {/* SVG Layer for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="rgba(255, 255, 255, 0.3)" />
            </marker>
          </defs>
          
          {/* Render all connections */}
          {connections.map((conn) => renderConnection(conn))}

          {/* Connection preview */}
          {connectingFrom && connectionPreview && (() => {
            const fromNode = nodes.find((n) => n.id === connectingFrom);
            if (!fromNode) return null;
            const from = getNodeScreenPosition(fromNode);
            return (
              <line
                x1={from.x + 150 * scale}
                y1={from.y + 100 * scale}
                x2={connectionPreview.x * scale + offset.x}
                y2={connectionPreview.y * scale + offset.y}
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            );
          })()}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute inset-0" style={{ zIndex: 2 }}>
          {filteredNodes.map((node) => {
            const pos = getNodeScreenPosition(node);
            return (
              <JourneyNodeCard
                key={node.id}
                node={node}
                position={pos}
                scale={scale}
                isSelected={selectedNode === node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onUpdateNode={updateNode}
                onDeleteNode={deleteNode}
                onUploadVideo={uploadVideo}
                onStartConnection={(nodeId) => {
                  setConnectingFrom(nodeId);
                }}
                onEndConnection={(nodeId) => {
                  if (connectingFrom) {
                    createConnection(connectingFrom, nodeId);
                    setConnectingFrom(null);
                    setConnectionPreview(null);
                  }
                }}
                isConnecting={connectingFrom === node.id}
              />
            );
          })}
        </div>

        {/* Instructions */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/50">
              <p className="text-lg mb-2">No journey stages yet</p>
              <p className="text-sm">Click "Add Used Car Stage" or "Add Service Stage" to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Panel */}
      <div className="bg-black/40 backdrop-blur-sm border-t border-white/10 p-3">
        <div className="flex items-center justify-center gap-6 text-xs text-white/50">
          <span>💡 Drag cards to reposition</span>
          <span>🔗 Click "Connect" then click another card to link</span>
          <span>🖱️ Drag canvas to pan • Ctrl+Scroll to zoom</span>
          <span>📹 Upload videos and add captions to each stage</span>
        </div>
      </div>
    </div>
  );
}

// Journey Node Card Component
interface JourneyNodeCardProps {
  node: JourneyNode;
  position: Point;
  scale: number;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdateNode: (nodeId: string, updates: Partial<JourneyNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUploadVideo: (nodeId: string, file: File) => void;
  onStartConnection: (nodeId: string) => void;
  onEndConnection: (nodeId: string) => void;
  isConnecting: boolean;
}

function JourneyNodeCard({
  node,
  position,
  scale,
  isSelected,
  onMouseDown,
  onUpdateNode,
  onDeleteNode,
  onUploadVideo,
  onStartConnection,
  onEndConnection,
  isConnecting
}: JourneyNodeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editCaption, setEditCaption] = useState(node.caption || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdateNode(node.id, { title: editTitle, caption: editCaption });
    setIsEditing(false);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert('Video file must be less than 100MB');
        return;
      }
      onUploadVideo(node.id, file);
    }
  };

  const downloadVideo = async () => {
    if (!node.video_url) return;
    
    try {
      const response = await fetch(node.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.video_filename || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video');
    }
  };

  const departmentColor = node.department === 'used_car' 
    ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30'
    : 'from-green-500/20 to-green-600/20 border-green-500/30';

  return (
    <div
      className={`absolute bg-gradient-to-br ${departmentColor} backdrop-blur-md border-2 rounded-xl shadow-2xl transition-all ${
        isSelected ? 'ring-2 ring-white/50 shadow-white/20' : ''
      } ${isConnecting ? 'ring-2 ring-yellow-500/50' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: 300 * scale,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        cursor: 'move'
      }}
      onMouseDown={onMouseDown}
    >
      <div className="p-4 space-y-3 pointer-events-auto" style={{ transform: `scale(${1 / scale})`, transformOrigin: 'top left' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Grip className="w-4 h-4 text-white/40" />
            <span className="text-xs font-medium text-white/60 uppercase">
              {node.department === 'used_car' ? '🚗 Used Car' : '🔧 Service'}
            </span>
          </div>
          <div className="flex items-center gap-1 node-control">
            <button
              onClick={() => {
                if (isConnecting) {
                  onEndConnection(node.id);
                } else {
                  onStartConnection(node.id);
                }
              }}
              className={`p-1.5 rounded-lg transition-all text-xs ${
                isConnecting
                  ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              title={isConnecting ? 'Click another card to connect' : 'Start connection'}
            >
              🔗
            </button>
            <button
              onClick={() => onDeleteNode(node.id)}
              className="p-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-2 py-1 bg-black/40 border border-white/20 rounded text-sm text-white focus:outline-none focus:border-white/40"
            autoFocus
          />
        ) : (
          <h3
            className="text-lg font-semibold text-white cursor-text hover:bg-white/5 px-2 py-1 rounded"
            onClick={() => setIsEditing(true)}
          >
            {node.title}
          </h3>
        )}

        {/* Caption */}
        {isEditing ? (
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            className="w-full px-2 py-1 bg-black/40 border border-white/20 rounded text-sm text-white/80 focus:outline-none focus:border-white/40 resize-none"
            rows={3}
          />
        ) : (
          <p
            className="text-sm text-white/70 cursor-text hover:bg-white/5 px-2 py-1 rounded min-h-[60px]"
            onClick={() => setIsEditing(true)}
          >
            {node.caption || 'Click to add description...'}
          </p>
        )}

        {/* Video Section */}
        <div className="space-y-2 node-control">
          {node.video_url ? (
            <div className="space-y-2">
              <video
                src={node.video_url}
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: 200 }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadVideo}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <Download className="w-3 h-3" />
                  Download Video
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-xs hover:bg-white/20 transition-colors"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
        </div>

        {/* Save button when editing */}
        {isEditing && (
          <div className="flex gap-2 node-control">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg text-sm font-medium hover:scale-105 transition-transform"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditTitle(node.title);
                setEditCaption(node.caption || '');
                setIsEditing(false);
              }}
              className="px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

