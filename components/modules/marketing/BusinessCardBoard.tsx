'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Eye, Globe, ExternalLink, Copy, Trash2, User, Phone, Mail, Building, Star, Facebook, Instagram, Linkedin, QrCode, Download, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import BusinessCardModal from './BusinessCardModal';
import { useMarketingLoading } from '@/lib/MarketingLoadingContext';

interface BusinessCard {
  id: number; // Simple integer ID
  name: string;
  title: string | null;
  company: string | null;
  landline_phone: string | null;
  mobile_phone: string | null;
  email: string | null;
  website: string | null;
  google_review_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  qr_generated_at?: string | null;
}

export default function BusinessCardBoard() {
  const { setLoading: setGlobalLoading } = useMarketingLoading();
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState<BusinessCard | null>(null);
  const { user } = useAuth();
  
  // Sync local loading state with global loading context
  useEffect(() => {
    setGlobalLoading(loading);
  }, [loading, setGlobalLoading]);

  // Load business cards
  const loadBusinessCards = async () => {
    if (!user) return;
    
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const response = await fetch('/api/business-cards', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch business cards');
      }

      const result = await response.json();
      setBusinessCards(result.businessCards || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessCards();
  }, [user]);

  // Copy public URL to clipboard
  const copyPublicUrl = async (id: number) => {
    const url = `${window.location.origin}/business-card/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Public URL copied to clipboard!');
    } catch (err) {
    }
  };

  // Toggle card active status
  const toggleCardStatus = async (id: number, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/business-cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          name: businessCards.find(card => card.id === id)?.name || '',
          is_active: !currentStatus 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update card status');
      }

      await loadBusinessCards();
    } catch (error) {
    }
  };

  // Delete business card
  const deleteCard = async (id: number) => {
    if (!confirm('Are you sure you want to delete this business card?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/business-cards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      await loadBusinessCards();
    } catch (error) {
    }
  };

  // Generate and download QR code
  const downloadQRCode = async (id: number, name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/business-cards/${id}/qr-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      // Download the QR code PNG
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name.replace(/\s+/g, '_')}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Reload cards to update QR status
      await loadBusinessCards();
    } catch (error) {
      alert('Failed to generate QR code');
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black overflow-auto">
      {/* Full viewport container */}
      <div className="min-h-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-semibold text-white">Business Cards</h1>
              <p className="text-white/70">Manage digital business cards with public URLs</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black px-4 py-2 rounded-lg font-medium hover:from-gray-300 hover:via-gray-200 hover:to-gray-500 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Business Card
          </button>
        </div>

        {/* Business Cards Grid */}
        {businessCards.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            <CreditCard className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Business Cards Yet</h2>
            <p className="text-white/70 mb-6">
              Create your first digital business card to get started
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black px-6 py-3 rounded-lg font-medium hover:from-gray-300 hover:via-gray-200 hover:to-gray-500 transition-all flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create First Business Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {businessCards.map((card) => (
              <div key={card.id} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{card.name}</h3>
                    {card.title && <p className="text-white/70 text-sm">{card.title}</p>}
                    {card.company && <p className="text-white/50 text-sm">{card.company}</p>}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${card.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {card.landline_phone && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Phone className="w-3 h-3" />
                      {card.landline_phone} (Landline)
                    </div>
                  )}
                  {card.mobile_phone && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Phone className="w-3 h-3" />
                      {card.mobile_phone} (Mobile)
                    </div>
                  )}
                  {card.email && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Mail className="w-3 h-3" />
                      {card.email}
                    </div>
                  )}
                  {card.website && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Globe className="w-3 h-3" />
                      Website
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-2 mb-4">
                  {card.google_review_url && <Star className="w-4 h-4 text-yellow-500" />}
                  {card.facebook_url && <Facebook className="w-4 h-4 text-blue-500" />}
                  {card.instagram_url && <Instagram className="w-4 h-4 text-pink-500" />}
                  {card.linkedin_url && <Linkedin className="w-4 h-4 text-blue-600" />}
                </div>

                {/* Public URL */}
                <div className="bg-black/30 rounded-lg p-3 mb-4">
                  <p className="text-white/50 text-xs mb-1">
                    Public URL {card.qr_generated_at && <Lock className="w-3 h-3 inline text-green-500 ml-1" />}:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-white/70 text-xs flex-1 truncate">
                      /business-card/{card.id}
                    </code>
                    <button
                      onClick={() => copyPublicUrl(card.id)}
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`/business-card/${card.id}`, '_blank')}
                      className="text-white/50 hover:text-white transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingCard(card)}
                      className="text-white/50 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadQRCode(card.id, card.name)}
                      className={`transition-colors ${
                        card.qr_generated_at 
                          ? 'text-green-400 hover:text-green-300' 
                          : 'text-white/50 hover:text-white'
                      }`}
                      title={card.qr_generated_at ? 'Download QR Code (Generated)' : 'Generate & Download QR Code'}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => toggleCardStatus(card.id, card.is_active)}
                    className={`text-xs px-2 py-1 rounded-full transition-all ${
                      card.is_active 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    {card.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <BusinessCardModal
          isOpen={showCreateModal || editingCard !== null}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCard(null);
          }}
          onSave={() => {
            loadBusinessCards();
          }}
          editingCard={editingCard}
        />
      </div>
    </div>
  );
}
