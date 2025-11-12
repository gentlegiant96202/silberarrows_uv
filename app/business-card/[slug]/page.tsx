'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Mail, Globe, Download, Star, Facebook, Instagram, Linkedin, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';

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

export default function BusinessCardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadBusinessCard = async () => {
      try {
        const response = await fetch(`/api/business-cards/public/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(true);
            return;
          }
          throw new Error(`Failed to fetch business card: ${response.status}`);
        }

        const result = await response.json();
        setBusinessCard(result.businessCard);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadBusinessCard();
    }
  }, [slug]);

  // Generate vCard content
  const generateVCard = () => {
    if (!businessCard) return '';
    
    // Split name for proper iPhone compatibility
    const nameParts = businessCard.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${businessCard.name}`, // Formatted name
      `N:${lastName};${firstName};;;`, // Name components (Last;First;Middle;Prefix;Suffix)
      businessCard.title ? `TITLE:${businessCard.title}` : '',
      businessCard.company ? `ORG:${businessCard.company}` : '',
      businessCard.landline_phone ? `TEL;TYPE=WORK,VOICE:${businessCard.landline_phone}` : '',
      businessCard.mobile_phone ? `TEL;TYPE=CELL,VOICE:${businessCard.mobile_phone}` : '',
      businessCard.email ? `EMAIL;TYPE=INTERNET:${businessCard.email}` : '',
      businessCard.website ? `URL:${businessCard.website}` : '',
      'END:VCARD'
    ].filter(line => line !== '').join('\r\n'); // Use CRLF for better compatibility
    
    return vcard;
  };

  // Download vCard file
  const downloadVCard = () => {
    if (!businessCard) return;
    
    const vcard = generateVCard();
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${businessCard.name.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Handle phone call
  const handlePhoneCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Handle email
  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  // Handle website visit
  const handleWebsite = (website: string) => {
    window.open(website, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading</div>
      </div>
    );
  }

  if (error || !businessCard) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-semibold text-white mb-2">Business Card Not Found</h1>
          <p className="text-white/70">
            The business card you're looking for doesn't exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <div className="container mx-auto px-3 py-4">
        <div className="max-w-sm mx-auto">
          {/* Business Card */}
          <div className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-2xl p-6 shadow-2xl border border-white/20">
            {/* Header Section - Name/Title/Company + Logo */}
            <div className="flex items-center justify-between mb-5">
              {/* Contact Info - Left Aligned */}
              <div className="text-left flex-1">
                <h1 className="text-xl font-bold text-black leading-tight">{businessCard.name}</h1>
                {businessCard.title && (
                  <p className="text-black/80 text-base leading-tight">{businessCard.title}</p>
                )}
                {businessCard.company && (
                  <p className="text-black/70 text-sm leading-tight">{businessCard.company}</p>
                )}
              </div>

              {/* Logo - Right Aligned */}
              <div className="flex-shrink-0 ml-4">
                <div className="relative inline-block">
                  <Image
                    src="/MAIN LOGO.png"
                    alt="SilberArrows Logo"
                    width={50}
                    height={50}
                    className="object-contain relative z-10 drop-shadow-lg"
                  />
                  {/* Logo shadow/glow effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-black/10 to-black/5 blur-md scale-110 opacity-40"></div>
                </div>
              </div>
            </div>

            {/* Contact Actions */}
            <div className="space-y-3 mb-5">
              {businessCard.landline_phone && (
                <button
                  onClick={() => handlePhoneCall(businessCard.landline_phone!)}
                  className="w-full flex items-center gap-3 bg-black/10 hover:bg-black/20 rounded-xl p-3 transition-all group text-left"
                >
                  <Phone className="w-5 h-5 text-black group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-black font-medium block">{businessCard.landline_phone}</span>
                    <span className="text-black/60 text-sm">Landline</span>
                  </div>
                </button>
              )}

              {businessCard.mobile_phone && (
                <button
                  onClick={() => handlePhoneCall(businessCard.mobile_phone!)}
                  className="w-full flex items-center gap-3 bg-black/10 hover:bg-black/20 rounded-xl p-3 transition-all group text-left"
                >
                  <Phone className="w-5 h-5 text-black group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-black font-medium block">{businessCard.mobile_phone}</span>
                    <span className="text-black/60 text-sm">Mobile</span>
                  </div>
                </button>
              )}

              {businessCard.email && (
                <button
                  onClick={() => handleEmail(businessCard.email!)}
                  className="w-full flex items-center gap-3 bg-black/10 hover:bg-black/20 rounded-xl p-3 transition-all group text-left"
                >
                  <Mail className="w-5 h-5 text-black group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-black font-medium">{businessCard.email}</span>
                </button>
              )}

              {businessCard.website && (
                <button
                  onClick={() => handleWebsite(businessCard.website!)}
                  className="w-full flex items-center gap-3 bg-black/10 hover:bg-black/20 rounded-xl p-3 transition-all group text-left"
                >
                  <Globe className="w-5 h-5 text-black group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-black font-medium">Visit Website</span>
                </button>
              )}
            </div>

            {/* Save to Contacts Button */}
            <button
              onClick={downloadVCard}
              className="w-full bg-black text-white rounded-xl p-4 font-semibold hover:bg-black/90 transition-all flex items-center justify-center gap-3 mb-5 group shadow-lg"
            >
              <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Save to Contacts
            </button>

            {/* Google Reviews Section */}
            {businessCard.google_review_url && (
              <div className="border-t border-black/20 pt-5 mb-5">
                <h3 className="text-center text-black font-semibold text-base mb-3">Review Us on Google</h3>
                <a
                  href={businessCard.google_review_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-black/10 hover:bg-black/20 rounded-xl p-3 transition-all group flex items-center justify-center gap-3"
                >
                  <Star className="w-5 h-5 text-yellow-600 group-hover:scale-110 transition-transform" />
                  <span className="text-black font-medium">Leave a Google Review</span>
                </a>
              </div>
            )}

            {/* Social Media Links */}
            {(businessCard.facebook_url || businessCard.instagram_url || businessCard.linkedin_url) && (
              <div className="border-t border-black/20 pt-5">
                <p className="text-center text-black/70 text-sm mb-3">Follow Us</p>
                <div className="flex justify-center gap-4">
                  {businessCard.facebook_url && (
                    <a
                      href={businessCard.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-all group"
                    >
                      <Facebook className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {businessCard.instagram_url && (
                    <a
                      href={businessCard.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-all group"
                    >
                      <Instagram className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {businessCard.linkedin_url && (
                    <a
                      href={businessCard.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-all group"
                    >
                      <Linkedin className="w-5 h-5 text-blue-700 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Powered by Footer */}
          <div className="text-center mt-8">
            <p className="text-white/30 text-sm">
              Powered by{' '}
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent font-semibold">
                SilberArrows
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
