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
  const [selectedDepartment, setSelectedDepartment] = useState<'used_car' | 'service' | 'all'>('used_car');
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
            setNodes((prev) => {
              // Prevent duplicates
              const exists = prev.some(node => node.id === payload.new.id);
              if (exists) {
                return prev;
              }
              const newNodes = [...prev, payload.new as JourneyNode];
              return newNodes;
            });
          } else if (payload.eventType === 'UPDATE') {
            setNodes((prev) =>
              prev.map((node) => (node.id === payload.new.id ? payload.new as JourneyNode : node))
            );
          } else if (payload.eventType === 'DELETE') {
            setNodes((prev) => prev.filter((node) => node.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
      });

    const connectionsChannel = supabase
      .channel('buyer_journey_connections_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buyer_journey_connections' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConnections((prev) => {
              // Prevent duplicates from realtime
              const exists = prev.some(conn => conn.id === payload.new.id);
              if (exists) {
                return prev;
              }
              return [...prev, payload.new as Connection];
            });
          } else if (payload.eventType === 'DELETE') {
            setConnections((prev) => prev.filter((conn) => conn.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
      });

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
      if (nodesRes.error) {
        if (nodesRes.error.message.includes('relation "buyer_journey_nodes" does not exist')) {
          alert('Database tables not created yet. Please run the SQL setup files first:\n1. create_buyer_journey_tables.sql\n2. create_buyer_journey_storage.sql');
        }
      }

      if (connectionsRes.error) {
      }

      if (nodesRes.data) {
        setNodes(nodesRes.data);
      }
      if (connectionsRes.data) {
        setConnections(connectionsRes.data);
      }
    } catch (error) {
    }
  };

  // Create new node
  const createNode = async (department: 'used_car' | 'service') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      // Calculate position to avoid overlap - spread nodes in a grid pattern
      const existingNodesCount = nodes.filter(n => n.department === department).length;
      const gridCols = 3;
      const nodeWidth = 300;
      const nodeHeight = 400;
      const spacing = 50;
      
      const gridX = (existingNodesCount % gridCols) * (nodeWidth + spacing);
      const gridY = Math.floor(existingNodesCount / gridCols) * (nodeHeight + spacing);
      
      const newNode = {
        department,
        title: 'New Stage',
        caption: 'Add description here...',
        video_url: null,
        video_filename: null,
        position_x: gridX,
        position_y: gridY,
        created_by: userData?.user?.id
      };
      const { data, error } = await supabase
        .from('buyer_journey_nodes')
        .insert([newNode])
        .select()
        .single();

      if (error) {
        throw error;
      }
      // Manually refresh data since realtime might not work due to WebSocket issues
      setTimeout(() => {
        loadData();
      }, 500);
      
    } catch (error) {
      alert(`Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      alert('Failed to upload video. Make sure the "buyer-journey-videos" storage bucket exists.');
    }
  };

  // Create connection
  const createConnection = async (fromNodeId: string, toNodeId: string) => {
    if (fromNodeId === toNodeId) {
      return;
    }
    
    // Check if connection already exists (only one direction needed)
    const exists = connections.some(
      (conn) => conn.from_node_id === fromNodeId && conn.to_node_id === toNodeId
    );
    
    if (exists) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('buyer_journey_connections')
        .insert([{ from_node_id: fromNodeId, to_node_id: toNodeId }])
        .select();

      if (error) {
        throw error;
      }
      // Manually add to local state since realtime might not work
      const newConnection = {
        id: data[0].id,
        from_node_id: fromNodeId,
        to_node_id: toNodeId
      };
      setConnections(prev => {
        // Check if connection already exists to prevent duplicates
        const exists = prev.some(conn => conn.id === newConnection.id);
        if (exists) {
          return prev;
        }
        const updated = [...prev, newConnection];
        return updated;
      });
      
    } catch (error) {
      alert(`Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // Start panning if clicking on canvas, svg, or background (not on nodes/connections/buttons)
    const target = e.target as HTMLElement;
    
    // Don't pan if clicking on a button or node
    if (target.closest('button') || target.closest('.node-card')) {
      return;
    }
    
    const isCanvas = target === canvasRef.current || 
                     target.tagName === 'svg' || 
                     target.classList.contains('canvas-background');
    
    if (isCanvas) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      setOffset(newOffset);
      e.preventDefault();
    }

    // Update connection preview
    if (connectingFrom && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectionPreview({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      e.preventDefault();
    }
    if (connectingFrom) {
      setConnectingFrom(null);
      setConnectionPreview(null);
    }
  };

  // Node drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // If in connecting mode, don't start dragging - we want to complete the connection
    if (connectingFrom) {
      return;
    }
    
    // Don't start dragging if clicking on connection points, controls, or buttons
    const target = e.target as HTMLElement;
    if (target.closest('.node-control') || 
        target.closest('button') ||
        target.closest('[title*="Connection point"]')) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setDragStart({
        x: e.clientX - node.position_x * scale,
        y: e.clientY - node.position_y * scale
      });
    }
  };

  const handleNodeMouseMove = useCallback((e: MouseEvent) => {
    if (draggingNode && dragStart) {
      e.preventDefault();
      
      const newX = (e.clientX - dragStart.x) / scale;
      const newY = (e.clientY - dragStart.y) / scale;
      
      // Update immediately without requestAnimationFrame for smoother connection tracking
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNode
            ? { ...n, position_x: newX, position_y: newY }
            : n
        )
      );
    }
  }, [draggingNode, dragStart, scale]);

  const handleNodeMouseUp = useCallback((e: MouseEvent) => {
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
  }, [draggingNode, nodes, updateNode]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingNode) {
        handleNodeMouseMove(e);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleNodeMouseUp(e);
    };

    if (draggingNode) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [draggingNode, handleNodeMouseMove, handleNodeMouseUp]);

  // Get node position for rendering
  const getNodeScreenPosition = (node: JourneyNode) => {
    return {
      x: node.position_x * scale + offset.x,
      y: node.position_y * scale + offset.y
    };
  };

  // Filter nodes by department - show one department at a time
  const filteredNodes = nodes.filter((node) => {
    if (selectedDepartment === 'all') return true;
    return node.department === selectedDepartment;
  });
  // Render connection line with arrow
  const renderConnection = (conn: Connection) => {
    const fromNode = nodes.find((n) => n.id === conn.from_node_id);
    const toNode = nodes.find((n) => n.id === conn.to_node_id);

    if (!fromNode || !toNode) {
      return null;
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      if (fromNode.department !== selectedDepartment || toNode.department !== selectedDepartment) {
        return null;
      }
    }

    // Calculate connection points from the small dots on the right/left of cards
    // The dot is positioned at right: 0, top: 50% with translate-x-1/2 (6px offset)
    // Card height is approximately 200px, so middle is at 100px
    const cardMidHeight = 100;
    const dotRadius = 1.5; // Small dot is 3x3 pixels (w-3 h-3), radius is 1.5px
    
    const fromConnectionPoint = {
      x: (fromNode.position_x + 300) * scale + offset.x + dotRadius, // Start from the dot center
      y: (fromNode.position_y + cardMidHeight) * scale + offset.y
    };
    
    const toConnectionPoint = {
      x: toNode.position_x * scale + offset.x - dotRadius, // End at the dot center
      y: (toNode.position_y + cardMidHeight) * scale + offset.y
    };
    // Calculate arrow angle
    const angle = Math.atan2(toConnectionPoint.y - fromConnectionPoint.y, toConnectionPoint.x - fromConnectionPoint.x);
    const arrowSize = 10;

    // Create smooth bezier curve path
    const controlPointOffset = Math.abs(toConnectionPoint.x - fromConnectionPoint.x) * 0.5;
    const controlPoint1X = fromConnectionPoint.x + controlPointOffset;
    const controlPoint1Y = fromConnectionPoint.y;
    const controlPoint2X = toConnectionPoint.x - controlPointOffset;
    const controlPoint2Y = toConnectionPoint.y;
    
    const pathD = `M ${fromConnectionPoint.x} ${fromConnectionPoint.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toConnectionPoint.x} ${toConnectionPoint.y}`;
    
    // Calculate path midpoint for delete button using bezier formula
    const t = 0.5;
    const bezierMidX = Math.pow(1-t, 3) * fromConnectionPoint.x + 
                       3 * Math.pow(1-t, 2) * t * controlPoint1X + 
                       3 * (1-t) * Math.pow(t, 2) * controlPoint2X + 
                       Math.pow(t, 3) * toConnectionPoint.x;
    const bezierMidY = Math.pow(1-t, 3) * fromConnectionPoint.y + 
                       3 * Math.pow(1-t, 2) * t * controlPoint1Y + 
                       3 * (1-t) * Math.pow(t, 2) * controlPoint2Y + 
                       Math.pow(t, 3) * toConnectionPoint.y;

    return (
      <g key={conn.id} className="connection-group">
        {/* Invisible wider path for easier hover */}
        <path
          d={pathD}
          stroke="transparent"
          strokeWidth={20}
          fill="none"
          className="cursor-pointer pointer-events-auto"
        />
        
        {/* Visible smooth bezier curve */}
        <path
          d={pathD}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={2.5}
          fill="none"
          className="cursor-pointer hover:stroke-white transition-all pointer-events-none"
        />
        
        {/* Arrow head at end */}
        <polygon
          points={`
            ${toConnectionPoint.x - arrowSize * Math.cos(angle - Math.PI / 6)},${toConnectionPoint.y - arrowSize * Math.sin(angle - Math.PI / 6)}
            ${toConnectionPoint.x},${toConnectionPoint.y}
            ${toConnectionPoint.x - arrowSize * Math.cos(angle + Math.PI / 6)},${toConnectionPoint.y - arrowSize * Math.sin(angle + Math.PI / 6)}
          `}
          fill="rgba(255, 255, 255, 0.7)"
          className="pointer-events-none"
        />
        
        {/* Delete button at midpoint */}
        <g className="connection-delete-btn opacity-0 transition-opacity pointer-events-auto" style={{ cursor: 'pointer' }}>
          <circle
            cx={bezierMidX}
            cy={bezierMidY}
            r={14}
            fill="rgba(239, 68, 68, 0.95)"
            stroke="white"
            strokeWidth="2"
            className="hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              deleteConnection(conn.id);
            }}
          />
          <text
            x={bezierMidX}
            y={bezierMidY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="16"
            fontWeight="bold"
            className="pointer-events-none"
          >
            ×
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Toolbar */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
            Buyer Journey Builder
          </h2>
          
          {/* Add Node Button - Shows based on selected department */}
          <button
            onClick={() => createNode(selectedDepartment as 'used_car' | 'service')}
            className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium text-sm flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Add {selectedDepartment === 'used_car' ? 'Used Car' : 'Service'} Stage
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40"
            >
              <option value="used_car">Used Car Department</option>
              <option value="service">Service Department</option>
            </select>
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
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden canvas-background ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      >
        {/* SVG Layer for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none connection-svg"
          style={{ zIndex: 1 }}
        >
          <style>{`
            .connection-group:hover .connection-delete-btn {
              opacity: 1;
            }
            .connection-svg {
              will-change: transform;
            }
            .connection-group path {
              transition: stroke 0.2s ease;
            }
          `}</style>
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
          
          {/* Debug info */}
          {connections.length > 0 && (
            <text x="10" y="20" fill="white" fontSize="12">
              Connections: {connections.length}
            </text>
          )}
          
          {/* Render all connections */}
          {connections.map((conn) => {
            return renderConnection(conn);
          })}

          {/* Connection preview with smooth curve */}
          {connectingFrom && connectionPreview && (() => {
            const fromNode = nodes.find((n) => n.id === connectingFrom);
            if (!fromNode) return null;
            
            const fromConnectionPoint = {
              x: (fromNode.position_x + 300) * scale + offset.x + 1.5, // From the dot
              y: (fromNode.position_y + 100) * scale + offset.y
            };
            
            const controlPointOffset = Math.abs(connectionPreview.x - fromConnectionPoint.x) * 0.5;
            const controlPoint1X = fromConnectionPoint.x + controlPointOffset;
            const controlPoint1Y = fromConnectionPoint.y;
            const controlPoint2X = connectionPreview.x - controlPointOffset;
            const controlPoint2Y = connectionPreview.y;
            
            const pathD = `M ${fromConnectionPoint.x} ${fromConnectionPoint.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${connectionPreview.x} ${connectionPreview.y}`;
            
            return (
              <path
                d={pathD}
                stroke="rgba(255, 200, 100, 0.7)"
                strokeWidth={2.5}
                fill="none"
                strokeDasharray="6 3"
              />
            );
          })()}
        </svg>

        {/* Nodes Layer - pointer-events-none on container, re-enable on nodes */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          {filteredNodes.map((node) => {
            return (
              <JourneyNodeCard
                key={node.id}
                node={node}
                position={{ x: node.position_x, y: node.position_y }}
                scale={scale}
                offset={offset}
                isSelected={selectedNode === node.id}
                isDragging={draggingNode === node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onUpdateNode={updateNode}
                onDeleteNode={deleteNode}
                onUploadVideo={uploadVideo}
        onStartConnection={(nodeId) => {
          if (nodeId === '') {
            // Cancel connection mode
            setConnectingFrom(null);
            setConnectionPreview(null);
          } else {
            setConnectingFrom(nodeId);
          }
        }}
                onEndConnection={(nodeId) => {
                  if (connectingFrom) {
                    createConnection(connectingFrom, nodeId);
                    setConnectingFrom(null);
                    setConnectionPreview(null);
                  } else {
                  }
                }}
                isConnecting={!!connectingFrom && connectingFrom !== node.id}
              />
            );
          })}
        </div>

        {/* Instructions */}
        {filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/50">
              <p className="text-lg mb-2">No {selectedDepartment === 'used_car' ? 'Used Car' : 'Service'} journey stages yet</p>
              <p className="text-sm">Click "Add {selectedDepartment === 'used_car' ? 'Used Car' : 'Service'} Stage" to begin</p>
            </div>
          </div>
        )}
      </div>

        {/* Instructions Panel */}
      <div className="bg-black/40 backdrop-blur-sm border-t border-white/10 p-3">
        {connectingFrom ? (
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-yellow-400 font-bold animate-pulse">🔗 CONNECTING MODE: Click on any card to connect</span>
            <button
              onClick={() => {
                setConnectingFrom(null);
                setConnectionPreview(null);
              }}
              className="px-3 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6 text-xs text-white/50">
            <span>💡 Drag cards to reposition</span>
            <span>🔗 Click 🔗 button in card header, then click another card to connect</span>
            <span>🖱️ Drag canvas to pan • Ctrl+Scroll to zoom</span>
            <span>📹 Upload videos and add captions to each stage</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Journey Node Card Component
interface JourneyNodeCardProps {
  node: JourneyNode;
  position: Point;
  scale: number;
  offset: Point;
  isSelected: boolean;
  isDragging: boolean;
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
  offset,
  isSelected,
  isDragging,
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
      alert('Failed to download video');
    }
  };

  // Silver gradient for all cards, with subtle department differentiation
  const departmentColor = node.department === 'used_car' 
    ? 'from-gray-700/40 via-gray-600/30 to-gray-800/40 border-gray-500/40'
    : 'from-gray-700/40 via-gray-600/30 to-gray-800/40 border-gray-500/40';

  return (
    <div
      className={`node-card absolute bg-gradient-to-br ${departmentColor} backdrop-blur-md border-2 rounded-xl shadow-2xl transition-all pointer-events-auto ${
        isSelected ? 'ring-2 ring-white/50 shadow-white/20' : ''
      } ${isConnecting ? 'ring-4 ring-yellow-400/80 animate-pulse cursor-pointer' : ''}`}
        style={{
          left: position.x * scale + offset.x,
          top: position.y * scale + offset.y,
          width: 300,
          transformOrigin: 'top left',
          cursor: isDragging ? 'grabbing' : isConnecting ? 'pointer' : 'grab',
          zIndex: isDragging ? 1000 : 'auto',
          transition: isDragging ? 'none' : 'all 0.1s ease-out'
        }}
      onMouseDown={(e) => {
        // Don't handle onMouseDown if clicking a button
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
          return;
        }
        
        // If we're in connecting mode, complete the connection
        if (isConnecting) {
          e.stopPropagation();
          e.preventDefault();
          onEndConnection(node.id);
          return;
        }
        // Otherwise, handle normal drag
        onMouseDown(e);
      }}
    >
      {/* Connection overlay when in connecting mode */}
      {isConnecting && (
        <div 
          className="absolute inset-0 bg-yellow-400/20 rounded-xl flex items-center justify-center cursor-pointer z-50"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onEndConnection(node.id);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onEndConnection(node.id);
          }}
        >
          <div className="bg-black/80 px-6 py-3 rounded-lg border-2 border-yellow-400 pointer-events-none">
            <span className="text-yellow-400 font-bold text-lg">CLICK TO CONNECT</span>
          </div>
        </div>
      )}
      
      <div className="p-4 space-y-3 pointer-events-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Grip className="w-4 h-4 text-white/40" />
            <span className="text-xs font-medium text-white/60 uppercase">
              {node.department === 'used_car' ? '🚗 Used Car' : '🔧 Service'}
            </span>
          </div>
          <div className="flex items-center gap-1 node-control">
            {/* Connection button */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isConnecting) {
                  // If this card is in connecting mode, cancel it
                  onStartConnection(''); // Clear by passing empty string
                } else {
                  onStartConnection(node.id);
                }
              }}
              className={`p-1.5 rounded-lg transition-all pointer-events-auto ${
                isConnecting 
                  ? 'bg-yellow-500/40 text-yellow-200 animate-pulse scale-110' 
                  : 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black hover:scale-105'
              }`}
              title={isConnecting ? "Click to cancel connection mode" : "Click to connect to another stage"}
            >
              🔗
            </button>
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteNode(node.id);
              }}
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

      {/* Small connection point indicator on the right */}
      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-full border border-white shadow-md pointer-events-none z-10" />
    </div>
  );
}

