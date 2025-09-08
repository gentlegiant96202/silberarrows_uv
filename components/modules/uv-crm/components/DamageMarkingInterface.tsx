"use client";

import React, { useState, useRef, useCallback } from 'react';
import DamageAnnotationOverlay from './DamageAnnotationOverlay';

interface DamageMarker {
  id: string;
  x: number;        // Pixel coordinate (0-2029)
  y: number;        // Pixel coordinate (0-765)  
  damageType: 'B' | 'BR' | 'C' | 'CR' | 'D' | 'F' | 'FI' | 'L' | 'M' | 'P' | 'PA' | 'PC' | 'R' | 'RU' | 'S' | 'ST';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

interface DamageMarkingInterfaceProps {
  carId: string;
  initialAnnotations?: DamageMarker[];
  onSave: (annotations: DamageMarker[], inspectionNotes: string) => void;
  readOnly?: boolean;
  initialInspectionNotes?: string;
}

const DamageMarkingInterface: React.FC<DamageMarkingInterfaceProps> = ({
  carId,
  initialAnnotations = [],
  onSave,
  readOnly = false,
  initialInspectionNotes = ''
}) => {
  const [annotations, setAnnotations] = useState<DamageMarker[]>(initialAnnotations);
  const [isMarking, setIsMarking] = useState(false);
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [editingMarker, setEditingMarker] = useState<DamageMarker | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState<string>(initialInspectionNotes);
  const imageRef = useRef<HTMLImageElement>(null);

  // Image dimensions
  const IMAGE_WIDTH = 2029;
  const IMAGE_HEIGHT = 765;


  const getSeverityColor = (severity: DamageMarker['severity']) => {
    switch (severity) {
      case 'minor': return '#FFA500'; // Orange
      case 'moderate': return '#FF6B35'; // Red-orange  
      case 'major': return '#FF0000'; // Red
      default: return '#FFD700'; // Gold
    }
  };

  const getDamageTypeLabel = (type: DamageMarker['damageType']) => {
    switch (type) {
      case 'B': return 'B - Bent';
      case 'BR': return 'BR - Broken';
      case 'C': return 'C - Cut';
      case 'CR': return 'CR - Cracked';
      case 'D': return 'D - Dented';
      case 'F': return 'F - Faded';
      case 'FI': return 'FI - Filler';
      case 'L': return 'L - Loose';
      case 'M': return 'M - Missing';
      case 'P': return 'P - Pitted';
      case 'PA': return 'PA - Painted';
      case 'PC': return 'PC - Paint Chip';
      case 'R': return 'R - Rubbed';
      case 'RU': return 'RU - Rust';
      case 'S': return 'S - Scratched';
      case 'ST': return 'ST - Stained';
      default: return 'Unknown';
    }
  };

  const handleDamageClick = (x: number, y: number) => {
    // Show damage form with the coordinates directly
    setEditingMarker({
      id: Date.now().toString(),
      x: Math.round(x),
      y: Math.round(y),
      damageType: 'S', // Default to Scratched
      severity: 'minor',
      description: '' // Start with empty description
    });
    setShowDamageForm(true);
    setIsMarking(false);
    
    // Prevent any scrolling by stopping event propagation
    setTimeout(() => {
      if (imageRef.current) {
        imageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleSaveDamageMarker = (damageData: Partial<DamageMarker>) => {
    if (!editingMarker) return;

    const newMarker: DamageMarker = {
      ...editingMarker,
      ...damageData
    };

    const existingIndex = annotations.findIndex(a => a.id === newMarker.id);
    let updatedAnnotations;
    if (existingIndex >= 0) {
      // Update existing
      updatedAnnotations = [...annotations];
      updatedAnnotations[existingIndex] = newMarker;
    } else {
      // Add new
      updatedAnnotations = [...annotations, newMarker];
    }
    
    setAnnotations(updatedAnnotations);
    
    // Auto-update inspection notes
    updateInspectionNotes(updatedAnnotations);
    
    // Auto-save to parent component
    setTimeout(() => {
      onSave(updatedAnnotations, inspectionNotes);
    }, 100);

    setShowDamageForm(false);
    setEditingMarker(null);
    setCurrentPath('');
  };

  const handleDeleteMarker = (markerId: string) => {
    const updatedAnnotations = annotations.filter(a => a.id !== markerId);
    setAnnotations(updatedAnnotations);
    // Auto-update inspection notes
    updateInspectionNotes(updatedAnnotations);
    // Auto-save to parent component
    setTimeout(() => {
      onSave(updatedAnnotations, inspectionNotes);
    }, 100);
  };

  const handleEditMarker = (marker: DamageMarker) => {
    setEditingMarker(marker);
    setShowDamageForm(true);
  };


  const handleCancelDamageForm = () => {
    setShowDamageForm(false);
    setEditingMarker(null);
    setCurrentPath('');
    setIsMarking(false);
  };

  const updateInspectionNotes = (markers: DamageMarker[]) => {
    if (markers.length === 0) {
      setInspectionNotes('');
      return;
    }

    // Group markers by damage type
    const damageGroups: Record<string, DamageMarker[]> = {};
    markers.forEach(marker => {
      const key = `${marker.damageType}-${marker.severity}`;
      if (!damageGroups[key]) {
        damageGroups[key] = [];
      }
      damageGroups[key].push(marker);
    });

    // Generate inspection notes
    let notes = 'VEHICLE DAMAGE ASSESSMENT:\n\n';
    
    Object.entries(damageGroups).forEach(([key, groupMarkers]) => {
      const [damageType, severity] = key.split('-');
      const label = getDamageTypeLabel(damageType as DamageMarker['damageType']);
      const count = groupMarkers.length;
      
      notes += `${label.toUpperCase()} (${severity.toUpperCase()}): ${count} location${count > 1 ? 's' : ''}\n`;
      
      groupMarkers.forEach((marker, index) => {
        if (marker.description.trim()) {
          notes += `  ${index + 1}. ${marker.description}\n`;
        }
      });
      notes += '\n';
    });

    // Add summary
    const totalMarkers = markers.length;
    const uniqueTypes = Array.from(new Set(markers.map(m => m.damageType)));
    notes += `SUMMARY: ${totalMarkers} total damage marker${totalMarkers > 1 ? 's' : ''} identified across ${uniqueTypes.length} damage type${uniqueTypes.length > 1 ? 's' : ''} (${uniqueTypes.join(', ')}).`;

    setInspectionNotes(notes);
  };

  return (
    <div className="damage-marking-container space-y-6">

      {/* Main diagram container */}
      <div className="relative w-full max-w-5xl mx-auto">
        <img 
          ref={imageRef}
          src="/Pre uvc-2.jpg"
          alt="Vehicle Damage Assessment Diagram"
          className="w-full h-auto"
          style={{ aspectRatio: `${IMAGE_WIDTH}/${IMAGE_HEIGHT}` }}
          draggable={false}
        />
        
        {/* Damage annotation overlay */}
        {!readOnly && (
          <DamageAnnotationOverlay
            width="100%"
            height="100%" 
            viewBoxWidth={IMAGE_WIDTH}
            viewBoxHeight={IMAGE_HEIGHT}
            isActive={isMarking && !showDamageForm}
            onDamageClick={handleDamageClick}
            onCancel={() => {
              setIsMarking(false);
              setCurrentPath('');
            }}
            existingMarkers={annotations}
          />
        )}

        {/* Interactive overlay for editing (only show when not in marking mode) */}
        {!isMarking && annotations.map(marker => (
          <div
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{
              left: `${(marker.x / IMAGE_WIDTH) * 100}%`,
              top: `${(marker.y / IMAGE_HEIGHT) * 100}%`,
              zIndex: 30,
            }}
            onClick={() => !readOnly && handleEditMarker(marker)}
          >
            {/* Invisible clickable area for editing */}
            <div className="w-10 h-10 rounded-full bg-transparent hover:bg-white/10 flex items-center justify-center">
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {getDamageTypeLabel(marker.damageType)} - {marker.severity}
                  <div className="text-xs text-gray-300">{marker.description}</div>
                  {!readOnly && <div className="text-xs text-blue-300">Click to edit</div>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      {!readOnly && (
        <div className="flex gap-4 justify-center">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMarking(!isMarking);
            }}
            disabled={showDamageForm}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              isMarking 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg' 
                : 'bg-gradient-to-r from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500 text-white shadow-lg hover:shadow-xl'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMarking ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop Marking Damage
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Mark Damage
              </>
            )}
          </button>

          {annotations.length > 0 && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAnnotations([]);
                setInspectionNotes(''); // Clear notes when clearing all markers
              }}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Visual Inspection Notes */}
      <div className="bg-white/10 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          Visual Inspection Notes
          {annotations.length > 0 && (
            <span className="text-sm font-normal text-white/70 ml-2">
              ({annotations.length} damage marker{annotations.length !== 1 ? 's' : ''} marked)
            </span>
          )}
        </h4>
        <textarea
          value={inspectionNotes}
          onChange={(e) => setInspectionNotes(e.target.value)}
          placeholder="Damage markers will automatically appear here, or enter custom inspection notes..."
          className="w-full h-48 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono text-sm"
          readOnly={readOnly}
        />
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-white/50">
            {inspectionNotes.length}/1000 characters
          </div>
          {annotations.length > 0 && (
            <div className="text-xs text-white/60">
              Damage types marked: {Array.from(new Set(annotations.map(a => a.damageType))).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Damage form modal */}
      {showDamageForm && editingMarker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 border border-white/20 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {annotations.find(a => a.id === editingMarker.id) ? 'Edit' : 'Add'} Damage Details
            </h3>
            
            <div className="space-y-4">
              {/* Damage Type */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Damage Type</label>
                <select
                  value={editingMarker.damageType}
                  onChange={(e) => setEditingMarker({
                    ...editingMarker,
                    damageType: e.target.value as DamageMarker['damageType']
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="B">B - Bent</option>
                  <option value="BR">BR - Broken</option>
                  <option value="C">C - Cut</option>
                  <option value="CR">CR - Cracked</option>
                  <option value="D">D - Dented</option>
                  <option value="F">F - Faded</option>
                  <option value="FI">FI - Filler</option>
                  <option value="L">L - Loose</option>
                  <option value="M">M - Missing</option>
                  <option value="P">P - Pitted</option>
                  <option value="PA">PA - Painted</option>
                  <option value="PC">PC - Paint Chip</option>
                  <option value="R">R - Rubbed</option>
                  <option value="RU">RU - Rust</option>
                  <option value="S">S - Scratched</option>
                  <option value="ST">ST - Stained</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Severity</label>
                <select
                  value={editingMarker.severity}
                  onChange={(e) => setEditingMarker({
                    ...editingMarker,
                    severity: e.target.value as DamageMarker['severity']
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editingMarker.description}
                  onChange={(e) => setEditingMarker({
                    ...editingMarker,
                    description: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the damage location and details..."
                />
              </div>

              {/* Position info */}
              <div className="text-sm text-white/60">
                Position: ({editingMarker.x}, {editingMarker.y})
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelDamageForm}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveDamageMarker(editingMarker)}
                disabled={!editingMarker.description.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {annotations.find(a => a.id === editingMarker.id) ? 'Update' : 'Add'} Damage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DamageMarkingInterface;
