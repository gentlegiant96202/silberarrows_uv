"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  onImageGenerated?: (imageUrl: string, filename: string) => void;
}

const DamageMarkingInterface: React.FC<DamageMarkingInterfaceProps> = ({
  carId,
  initialAnnotations = [],
  onSave,
  readOnly = false,
  initialInspectionNotes = '',
  onImageGenerated
}) => {
  const [annotations, setAnnotations] = useState<DamageMarker[]>(initialAnnotations);
  const [isMarking, setIsMarking] = useState(false);
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [editingMarker, setEditingMarker] = useState<DamageMarker | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState<string>(initialInspectionNotes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Image dimensions
  const IMAGE_WIDTH = 2029;
  const IMAGE_HEIGHT = 765;

  // Auto-generate inspection notes when component loads with existing annotations
  useEffect(() => {
    if (initialAnnotations.length > 0 && !initialInspectionNotes) {
      console.log('🔄 Auto-generating inspection notes for existing annotations...');
      updateInspectionNotes(initialAnnotations);
    }
  }, [initialAnnotations, initialInspectionNotes]);


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
    
    // Auto-update inspection notes first
    updateInspectionNotes(updatedAnnotations);
    
    // Auto-save to parent component with a delay to ensure notes are updated
    setTimeout(() => {
      // Use the updated inspection notes that were just generated
      const updatedNotes = generateInspectionNotesSync(updatedAnnotations);
      onSave(updatedAnnotations, updatedNotes);
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
    // Auto-save to parent component with updated notes
    setTimeout(() => {
      const updatedNotes = generateInspectionNotesSync(updatedAnnotations);
      onSave(updatedAnnotations, updatedNotes);
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

  // Synchronous function to generate inspection notes (for immediate use)
  const generateInspectionNotesSync = (markers: DamageMarker[]): string => {
    if (markers.length === 0) {
      return '';
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
    let notes = 'PRE-USED VEHICLE CHECK:\n\n';
    
    Object.entries(damageGroups).forEach(([key, groupMarkers]) => {
      const [damageType, severity] = key.split('-');
      const label = getDamageTypeLabel(damageType as DamageMarker['damageType']);
      const count = groupMarkers.length;
      
      notes += `${label.toUpperCase()} (${severity.toUpperCase()}): ${count} location${count > 1 ? 's' : ''}\n`;
      
      groupMarkers.forEach((marker, index) => {
        const description = marker.description.trim();
        if (description) {
          notes += `  ${index + 1}. ${description}\n`;
        } else {
          notes += `  ${index + 1}. [No description provided]\n`;
        }
      });
      notes += '\n';
    });

    // Add summary
    const totalMarkers = markers.length;
    const uniqueTypes = Array.from(new Set(markers.map(m => m.damageType)));
    notes += `SUMMARY: ${totalMarkers} total damage marker${totalMarkers > 1 ? 's' : ''} identified across ${uniqueTypes.length} damage type${uniqueTypes.length > 1 ? 's' : ''} (${uniqueTypes.join(', ')}).`;

    return notes;
  };

  const updateInspectionNotes = (markers: DamageMarker[]) => {
    const notes = generateInspectionNotesSync(markers);
    setInspectionNotes(notes);
  };

  // Handle manual notes changes (no auto-save, just update state)
  const handleManualNotesChange = (value: string) => {
    setInspectionNotes(value);
    setIsSavingNotes(false); // Reset saving state when user types
    
    // Clear existing timeout if any
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="damage-marking-container space-y-6">

      {/* Main diagram container */}
      <div className="relative w-full max-w-5xl mx-auto">
        <img 
          ref={imageRef}
          src="/Pre uvc-2.jpg"
          alt="Pre-Used Vehicle Check Diagram"
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


      {/* Visual Inspection Notes */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white uppercase tracking-wide">
            Visual Inspection Notes
          </h4>
          {annotations.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-semibold">
                {annotations.length} marker{annotations.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-white/60">
                {Array.from(new Set(annotations.map(a => a.damageType))).join(', ')}
              </span>
            </div>
          )}
        </div>
        
        <div className="relative">
          <textarea
            value={inspectionNotes}
            onChange={(e) => handleManualNotesChange(e.target.value)}
            placeholder="Damage markers will automatically appear here, or enter custom inspection notes..."
            className="w-full h-48 px-4 py-4 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 resize-y font-mono text-sm leading-relaxed transition-all duration-200"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            readOnly={readOnly}
          />
          
          {/* Character count overlay */}
          <div className="absolute bottom-3 right-3 flex items-center gap-3">
            {isSavingNotes && (
              <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 border border-green-500/30 px-2 py-1 rounded">
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </div>
            )}
            <div className={`text-xs font-medium px-2 py-1 rounded ${
              inspectionNotes.length > 1000 
                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                : 'bg-black/40 text-white/60'
            }`}>
              {inspectionNotes.length}/1000
            </div>
          </div>
        </div>
        
        {inspectionNotes.length > 1000 && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Notes exceed character limit
          </p>
        )}
      </div>

      {/* Controls - Moved below Visual Inspection Notes */}
      {!readOnly && (
        <div className="flex gap-2 justify-center flex-wrap">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMarking(!isMarking);
            }}
            disabled={showDamageForm}
            className={`px-4 py-2 rounded transition-colors text-xs flex items-center gap-1.5 ${
              isMarking 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-brand hover:bg-brand/90 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMarking ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop Marking Damage
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Mark Damage
              </>
            )}
          </button>

          {annotations.length > 0 && (
            <>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAnnotations([]);
                  setInspectionNotes(''); // Clear notes when clearing all markers
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
              >
                Clear All
              </button>

              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (carId === 'temp-car-id') {
                    alert('Please save the car first before generating report image.');
                    return;
                  }

                  try {
                    setIsGeneratingReport(true);
                    
                    // First, save the current manual notes before generating report
                    setIsSavingNotes(true);
                    console.log('💾 Saving manual inspection notes before generating report...');
                    onSave(annotations, inspectionNotes);
                    
                    // Brief delay to ensure save completes
                    await new Promise(resolve => setTimeout(resolve, 500));
                    setIsSavingNotes(false);

                    console.log('🔧 Generating damage report image from edit mode...');
                    const response = await fetch('/api/generate-damage-report-image', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        carId,
                        damageAnnotations: annotations,
                        inspectionNotes
                      })
                    });

                    const result = await response.json();
                    console.log('📊 Generation result:', result);
                    
                    if (result.success) {
                      console.log('✅ Damage report image generated:', result.imageUrl);
                      alert('Damage report image generated successfully!');
                      // Notify parent component about the new image
                      if (onImageGenerated) {
                        onImageGenerated(result.imageUrl, result.fileName);
                      }
                    } else {
                      console.error('❌ Failed to generate damage report image:', result.error);
                      alert(`Failed to generate image: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('❌ Error generating damage report image:', error);
                    alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setIsGeneratingReport(false);
                    setIsSavingNotes(false);
                  }
                }}
                disabled={isGeneratingReport || isSavingNotes}
                className={`px-4 py-2 rounded transition-colors text-xs flex items-center gap-1.5 ${
                  isGeneratingReport || isSavingNotes
                    ? 'bg-gray-500 cursor-not-allowed opacity-75 text-white'
                    : 'bg-brand hover:bg-brand/90 text-white'
                }`}
              >
                {isGeneratingReport ? (
                  <>
                    <div className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full"></div>
                    {isSavingNotes ? 'Saving Notes...' : 'Generating Report...'}
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

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
                className="flex-1 px-4 py-2 bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-black/60 hover:border-white/30 text-white rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveDamageMarker(editingMarker)}
                disabled={!editingMarker.description.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500 disabled:from-gray-500 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
