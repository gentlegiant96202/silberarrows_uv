'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, User, Building, Phone, Mail, Globe, Star, Facebook, Instagram, Linkedin, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface BusinessCard {
  id: string;
  slug: string;
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
    slug: '',
    google_review_url: '',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    is_active: true
  });
  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        slug: editingCard.slug || '',
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
        slug: '',
        google_review_url: '',
        facebook_url: '',
        instagram_url: '',
        linkedin_url: '',
        is_active: true
      });
    }
    setErrors({});
  }, [editingCard, isOpen]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !editingCard) {
      const autoSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug: autoSlug }));
    }
  }, [formData.name, editingCard]);

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

    if (!formData.slug.trim()) {
      newErrors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'URL slug can only contain lowercase letters, numbers, and hyphens';
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

            {/* URL Slug */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                URL Slug *
              </label>
              <div className="flex items-center">
                <span className="text-white/50 text-sm mr-2">/business-card/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
                  className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                  placeholder="john-smith"
                />
              </div>
              {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug}</p>}
            </div>
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
