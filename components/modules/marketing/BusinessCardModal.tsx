'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, User, Building, Phone, Mail, Globe, Star, Facebook, Instagram, Linkedin, QrCode, Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import QRCode from 'qrcode';

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
  qr_generated_at?: string | null;
}

interface BusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingCard?: BusinessCard | null;
}

export default function BusinessCardModal({ isOpen, onClose, onSave, editingCard }: BusinessCardModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    landline_phone: '',
    mobile_phone: '',
    email: '',
    website: '',
    google_review_url: '',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    is_active: true
  });
  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (editingCard) {
      setFormData({
        name: editingCard.name || '',
        title: editingCard.title || '',
        company: editingCard.company || '',
        landline_phone: editingCard.landline_phone || '',
        mobile_phone: editingCard.mobile_phone || '',
        email: editingCard.email || '',
        website: editingCard.website || '',
        google_review_url: editingCard.google_review_url || '',
        facebook_url: editingCard.facebook_url || '',
        instagram_url: editingCard.instagram_url || '',
        linkedin_url: editingCard.linkedin_url || '',
        is_active: editingCard.is_active
      });
    } else {
      // Reset form for new card
      setFormData({
        name: '',
        title: '',
        company: '',
        landline_phone: '',
        mobile_phone: '',
        email: '',
        website: '',
        google_review_url: '',
        facebook_url: '',
        instagram_url: '',
        linkedin_url: '',
        is_active: true
      });
    }
    setErrors({});
  }, [editingCard, isOpen]);

  // Load QR code preview automatically
  useEffect(() => {
    const loadQRPreview = async () => {
      if (!editingCard) return;
      
      setGeneratingQR(true);
      try {
        const url = `${window.location.origin}/business-card/${editingCard.id}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H'
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR preview:', error);
      } finally {
        setGeneratingQR(false);
      }
    };

    if (editingCard && isOpen) {
      loadQRPreview();
    } else {
      setQrCodeDataUrl(null);
    }
  }, [editingCard, isOpen]);

  // Download QR code
  const downloadQRCode = async () => {
    if (!editingCard) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/business-cards/${editingCard.id}/qr-code`, {
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
      link.download = `${editingCard.name.replace(/\s+/g, '_')}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('QR code downloaded successfully!');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code');
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.website && !formData.website.startsWith('http')) {
      newErrors.website = 'Website URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to continue');
        return;
      }

      const url = editingCard 
        ? `/api/business-cards/${editingCard.id}`
        : '/api/business-cards';
      
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save business card');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving business card:', error);
      alert(error instanceof Error ? error.message : 'Failed to save business card');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/90 border border-white/20 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {editingCard ? 'Edit Business Card' : 'Create Business Card'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-3">Basic Information</h3>
            
            {/* Name */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="John Smith"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Title */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Job Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="Service Manager"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="Mercedes Service Center"
              />
            </div>

            {/* Public URL Preview */}
            {editingCard && (
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Public URL
                </label>
                <div className="bg-black/30 rounded-lg p-3">
                  <code className="text-white/70 text-sm">
                    /business-card/{editingCard.id}
                  </code>
                  {editingCard.qr_generated_at && (
                    <span className="ml-2 text-green-400 text-xs">🔒 QR Generated</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-3">Contact Information</h3>
            
            {/* Landline Phone */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Landline Phone
              </label>
              <input
                type="tel"
                value={formData.landline_phone}
                onChange={(e) => handleInputChange('landline_phone', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Mobile Phone */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Mobile Phone
              </label>
              <input
                type="tel"
                value={formData.mobile_phone}
                onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="+1 (555) 987-6543"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="john@example.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Website */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="https://www.example.com"
              />
              {errors.website && <p className="text-red-400 text-sm mt-1">{errors.website}</p>}
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-3">Social Links</h3>
            
            {/* Google Review */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Star className="w-4 h-4 inline mr-1" />
                Google Review URL
              </label>
              <input
                type="url"
                value={formData.google_review_url}
                onChange={(e) => handleInputChange('google_review_url', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="https://g.page/r/example/review"
              />
            </div>

            {/* Facebook */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Facebook className="w-4 h-4 inline mr-1" />
                Facebook URL
              </label>
              <input
                type="url"
                value={formData.facebook_url}
                onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="https://facebook.com/example"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Instagram className="w-4 h-4 inline mr-1" />
                Instagram URL
              </label>
              <input
                type="url"
                value={formData.instagram_url}
                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="https://instagram.com/example"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Linkedin className="w-4 h-4 inline mr-1" />
                LinkedIn URL
              </label>
              <input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                placeholder="https://linkedin.com/in/example"
              />
            </div>
          </div>

          {/* QR Code Section (Only for existing cards) */}
          {editingCard && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-3">QR Code for Printing</h3>
              
              <div className="bg-black/30 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* QR Code Preview */}
                  <div className="flex-shrink-0">
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code" 
                        className="w-24 h-24 bg-white rounded-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-black/40 border border-white/20 rounded-lg flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code Info */}
                  <div className="flex-1">
                    <p className="text-white/70 text-sm mb-2">
                      QR Code URL: <code className="text-white/90">/business-card/{editingCard.id}</code>
                    </p>
                    {editingCard.qr_generated_at && (
                      <p className="text-green-400 text-xs mb-3">
                        🔒 QR Generated: {new Date(editingCard.qr_generated_at).toLocaleDateString()}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={downloadQRCode}
                        className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium hover:from-gray-300 hover:via-gray-200 hover:to-gray-500 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download QR Code PNG
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="w-4 h-4 text-white bg-black/40 border-white/20 rounded focus:ring-white/20"
            />
            <label htmlFor="is_active" className="text-white/70 text-sm">
              Make this business card active and publicly accessible
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium hover:from-gray-300 hover:via-gray-200 hover:to-gray-500 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : (editingCard ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}
