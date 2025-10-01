import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Car, Phone, MapPin, Calendar, DollarSign, ExternalLink, Edit2, Save, X } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import NotesTimeline, { NoteItem } from '@/components/shared/NotesTimeline';

dayjs.extend(relativeTime);

interface Consignment {
  id: string;
  status: string;
  phone_number: string;
  vehicle_model: string;
  asking_price: number;
  listing_url: string;
  notes?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Negotiation fields
  vehicle_make?: string;
  vehicle_year?: number;
  mileage?: number;
  vin?: string;
  direct_purchase_price?: number;
  consignment_price?: number;
  negotiation_notes?: string;
}

interface Props {
  consignment: Consignment;
  onClose: () => void;
  onUpdated: (updatedConsignment: Consignment) => void;
  onDeleted: (consignmentId: string) => void;
}

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'preinspection', label: 'Pre-Inspection' },
  { value: 'consigned', label: 'Consigned / Purchased' },
  { value: 'lost', label: 'Lost' },
];

export default function ConsignmentDetailsModal({ consignment, onClose, onUpdated, onDeleted }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  
  // Form fields
  const [status, setStatus] = useState(consignment.status);
  const [phoneNumber, setPhoneNumber] = useState(consignment.phone_number || '');
  const [vehicleModel, setVehicleModel] = useState(consignment.vehicle_model || '');
  const [askingPrice, setAskingPrice] = useState(consignment.asking_price?.toString() || '');
  const [listingUrl, setListingUrl] = useState(consignment.listing_url || '');
  const [notes, setNotes] = useState(consignment.notes || '');
  
  // Timeline notes
  const [notesArray, setNotesArray] = useState<NoteItem[]>([]);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);

  useEffect(() => {
    // Parse existing notes if they exist
    console.log('Loading consignment notes:', consignment.notes);
    if (consignment.notes) {
      try {
        const parsed = JSON.parse(consignment.notes);
        if (Array.isArray(parsed)) {
          console.log('Parsed notes array:', parsed);
          // Convert to proper NoteItem format if needed
          const formattedNotes = parsed.map(note => ({
            ts: note.ts || note.timestamp || new Date().toISOString(),
            text: note.text || '',
            user: note.user || note.author || 'System'
          }));
          setNotesArray(formattedNotes);
        }
      } catch (error) {
        console.log('Failed to parse notes as JSON, converting string to timeline format');
        // If notes is just a string, convert to timeline format
        setNotesArray([{
          ts: consignment.created_at,
          text: consignment.notes,
          user: 'System'
        }]);
      }
    } else {
      console.log('No existing notes found');
      setNotesArray([]);
    }
  }, [consignment.notes]);

  const handleSave = async () => {
    if (!vehicleModel.trim()) {
      alert('Vehicle model is required');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        status,
        phone_number: phoneNumber.trim() || null,
        vehicle_model: vehicleModel.trim(),
        asking_price: askingPrice ? parseInt(askingPrice.replace(/[^0-9]/g, ''), 10) : null,
        listing_url: listingUrl.trim() || null,
        notes: JSON.stringify(notesArray),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('consignments')
        .update(updateData)
        .eq('id', consignment.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating consignment:', error);
        alert('Error updating consignment: ' + error.message);
        return;
      }

      onUpdated(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating consignment:', error);
      alert('Error updating consignment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save notes immediately when timeline is updated
  const handleNoteAdded = async (note: NoteItem) => {
    console.log('Adding new note:', note);
    const updatedNotes = [note, ...notesArray];
    console.log('Updated notes array:', updatedNotes);
    setNotesArray(updatedNotes);
    setSavingNote(true);
    setHasUnsavedNotes(true);
    
    // Save to database immediately
    try {
      console.log('Saving notes to database for consignment:', consignment.id);
      console.log('Notes JSON string length:', JSON.stringify(updatedNotes).length);
      
      // Log the update data
      const updateData = {
        notes: JSON.stringify(updatedNotes),
        updated_at: new Date().toISOString()
      };
      console.log('Update data:', updateData);
      console.log('Update data JSON length:', updateData.notes.length);
      
      const { data, error } = await supabase
        .from('consignments')
        .update(updateData)
        .eq('id', consignment.id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Note saved successfully, updated consignment:', data);
      // Mark that we have successfully saved notes
      setHasUnsavedNotes(false);
      // Don't call onUpdated here as it might close the modal
      // The parent will get updated when the modal is closed or form is saved
    } catch (error: any) {
      console.error('Error saving note:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Revert the state if save failed
      setNotesArray(notesArray);
      setHasUnsavedNotes(false);
      
      // More detailed error message
      const errorMessage = error?.message || 'Unknown error occurred';
      const errorDetails = error?.details || '';
      const fullMessage = `Failed to save note: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`;
      
      alert(fullMessage);
    } finally {
      setSavingNote(false);
    }
  };

  const handleClose = async () => {
    // If notes were saved, fetch the latest data and update parent
    if (notesArray.length > 0) {
      try {
        const { data, error } = await supabase
          .from('consignments')
          .select('*')
          .eq('id', consignment.id)
          .single();
        
        if (data && !error) {
          onUpdated(data);
        }
      } catch (error) {
        console.error('Error fetching latest consignment data:', error);
      }
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this consignment? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('consignments')
        .delete()
        .eq('id', consignment.id);

      if (error) {
        console.error('Error deleting consignment:', error);
        alert('Error deleting consignment: ' + error.message);
        return;
      }

      onDeleted(consignment.id);
    } catch (error) {
      console.error('Error deleting consignment:', error);
      alert('Error deleting consignment. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'No price set';
    return `AED ${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    // Use consistent styling like appointment modal - simple white/gray
    return 'bg-white/10 text-white/80 border-white/20';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-4xl text-xs relative max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white transition-colors"
        >
          ×
        </button>
        
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white mb-0.5">Consignment Details</h2>
            <p className="text-xs text-white/60">
              Created {dayjs(consignment.created_at).fromNow()} • Updated {dayjs(consignment.updated_at).fromNow()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-xs"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors text-xs disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-xs"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-green-200 transition-colors text-xs disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main Details */}
          <div className="flex-1 space-y-4">
            {/* Status */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-white flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  Status
                </label>
                {!isEditing && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                    {statusOptions.find(opt => opt.value === status)?.label || status}
                  </span>
                )}
              </div>
              {isEditing ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-white/70">
                  Current status: {statusOptions.find(opt => opt.value === status)?.label || status}
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Contact Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-white/70 mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      placeholder="Phone number"
                    />
                  ) : (
                    <div className="text-xs text-white font-mono">
                      {phoneNumber || 'No phone number'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                Vehicle Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-white/70 mb-1">Vehicle Model</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      placeholder="Vehicle model"
                      required
                    />
                  ) : (
                    <div className="text-xs text-white">
                      {vehicleModel || 'No vehicle model'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Asking Price</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      placeholder="Asking price in AED"
                    />
                  ) : (
                    <div className="text-xs text-white">
                      {formatPrice(consignment.asking_price)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Listing URL */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Listing URL
              </h3>
              {isEditing ? (
                <input
                  type="url"
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="Listing URL"
                />
              ) : (
                <div className="text-xs">
                  {listingUrl ? (
                    <a
                      href={listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline break-all"
                    >
                      {listingUrl}
                    </a>
                  ) : (
                    <span className="text-white/50">No listing URL</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden h-full">
              <div className="p-3 border-b border-white/10">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Timeline & Notes
                  {savingNote && (
                    <span className="text-[10px] text-blue-400 animate-pulse">Saving...</span>
                  )}
                </h3>
              </div>
              <div className="p-3 h-96 overflow-y-auto">
                <NotesTimeline 
                  notes={notesArray} 
                  canEdit={true} 
                  onAdded={handleNoteAdded} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 