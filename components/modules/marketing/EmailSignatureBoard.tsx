'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Copy, 
  Download, 
  Eye, 
  Code, 
  Palette,
  User,
  Building,
  Save,
  RefreshCw,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Upload,
  X,
  Plus,
  Trash2
} from 'lucide-react';
// Note: We don't need Supabase client here as we're using API routes

interface SignatureTemplate {
  id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  youtube_url: string;
  banner_image_1_url: string;
  banner_image_2_url: string;
  banner_image_1_alt?: string;
  banner_image_2_alt?: string;
  template_html: string;
  banner_link_1_url?: string;
  banner_link_2_url?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
  // New persisted assets
  logo_image_url?: string;
  icon_email_url?: string;
  icon_phone_url?: string;
  icon_mobile_url?: string;
  icon_address_url?: string;
  icon_facebook_url?: string;
  icon_instagram_url?: string;
  icon_linkedin_url?: string;
  icon_youtube_url?: string;
}

interface SignatureData {
  // Social Media Links (only editable fields)
  socialLinks: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  
  // Banner Images
  bannerImage1: string;
  bannerImage2: string;
  // Banner Links
  bannerLink1: string;
  bannerLink2: string;
  // Logo & Icons
  logoImage?: string;
  iconEmail?: string;
  iconPhone?: string;
  iconMobile?: string;
  iconAddress?: string;
  iconFacebook?: string;
  iconInstagram?: string;
  iconLinkedin?: string;
  iconYoutube?: string;
}

// Professional email signature template with table-based layout
const getSilberArrowsSignatureTemplate = (): string => {
  // Using a function to avoid template literal issues in React
  const template = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Email Signature</title>',
    '</head>',
    '<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">',
    '  <!-- Main signature table -->',
    '  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; margin: 0; padding: 0; border-collapse: collapse; font-family: Arial, sans-serif;">',
    '    <tr>',
    '      <td style="padding: 0; margin: 0;">',
    '        <!-- Content table -->',
    '        <table cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="width: 100%; border-collapse: collapse; background-color: #000000; border-radius: 10px 10px 0 0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">',
    '          <tr>',
    '            <td style="padding: 25px;">',
    '              <!-- Inner content table -->',
    '              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">',
    '                <tr>',
    '                  <!-- Left column: Contact info -->',
    '                  <td style="vertical-align: top; padding-right: 20px; width: 65%;">',
    '                    <!-- Name and title -->',
    '                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">',
    '                      <tr>',
    '                        <td style="padding: 0;">',
    '                          <div style="font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 5px; background: linear-gradient(135deg, #f3f4f6 0%, #d1d5db 15%, #ffffff 30%, #9ca3af 50%, #ffffff 70%, #d1d5db 85%, #f3f4f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-shadow: 0 1px 2px rgba(255,255,255,0.1);">{First name} {Last name}</div>',
    '                          <div style="font-size: 14px; font-weight: 600; color: #e5e5e5; margin-bottom: 4px;">{Title}</div>',
    '                          <div style="font-size: 11px; color: #b3b3b3; font-weight: 500;">{Department}</div>',
    '                        </td>',
    '                      </tr>',
    '                    </table>',
    '                    ',
    '                    <!-- Contact details -->',
    '                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">',
    '                      <tr>',
    '                        <td style="padding: 0;">',
    '                          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">',
    '                            {RT}<tr>',
    '                              <td style="padding: 3px 0; display: flex; align-items: center;">',
    '                                <!-- EMBED:ICON_EMAIL_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                                <img src="' + '{{iconEmail}}' + '" width="24" height="24" alt="EMBED EMAIL ICON HERE (delete me)" style="display:block;border:0;" /><span style="display:inline-block;width:10px;height:1px;line-height:1px;font-size:0;">&nbsp;</span><a href="mailto:{E-mail}" style="color: #cccccc; text-decoration: none; font-size: 11px;">{E-mail}</a>',
    '                              </td>',
    '                            </tr>{/RT}',
    '                            <tr>',
    '                              <td style="font-size: 11px; color: #cccccc; padding: 3px 0; display: flex; align-items: center;">',
    '                                <!-- EMBED:ICON_PHONE_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                                <img src="' + '{{iconPhone}}' + '" width="24" height="24" alt="EMBED PHONE ICON HERE (delete me)" style="display:block;border:0;" /><span style="display:inline-block;width:10px;height:1px;line-height:1px;font-size:0;">&nbsp;</span><a href="tel:{Phone}" style="color:#cccccc;text-decoration:none;">{Phone}</a>',
    '                              </td>',
    '                            </tr>',
    '                            <tr>',
    '                              <td style="font-size: 11px; color: #cccccc; padding: 3px 0; display: flex; align-items: center;">',
    '                                <!-- EMBED:ICON_MOBILE_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                                <img src="' + '{{iconMobile}}' + '" width="24" height="24" alt="EMBED MOBILE ICON HERE (delete me)" style="display:block;border:0;" /><span style="display:inline-block;width:10px;height:1px;line-height:1px;font-size:0;">&nbsp;</span><a href="tel:{Mobile}" style="color:#cccccc;text-decoration:none;">{Mobile}</a>',
    '                              </td>',
    '                            </tr>',
    // Address row moved to a dedicated alignment row below alongside social icons
    '                          </table>',
    '                        </td>',
    '                      </tr>',
    '                    </table>',
    '                  </td>',
    '                  ',
    '                  <!-- Right column: Logo and Social -->',
    '                  <td style="width: 35%; vertical-align: top; text-align: right; padding-left: 20px;">',
    '                    <!-- Logo (embed in CodeTwo) -->',
    '                    <div style="margin-bottom: 15px;">',
    '                      <!-- EMBED:LOGO_80 - Delete the next <img> and Insert → Picture → Embedded (PNG, width 80px) here -->',
    '                      <a href="https://www.silberarrows.com/" style="text-decoration:none;">',
    '                        <img src="' + '{{logoImage}}' + '" width="80" height="80" alt="EMBED LOGO HERE (delete me)" style="display:block;border:0;width:80px;height:80px;margin-left:auto;margin-right:0;filter: drop-shadow(0 2px 4px rgba(255,255,255,0.1));" />',
    '                      </a>',
    '                    </div>',
    '                    <!-- Social icons moved to aligned row below -->',
    '                  </td>',
    '                </tr>',
    '                <!-- Alignment row: address (left) + social icons (right) -->',
    '                <tr>',
    '                  <td style="vertical-align: middle; padding-right: 20px; width: 65%;">',
    '                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">',
    '                      <tr>',
    '                        <td style="font-size: 11px; color: #cccccc; padding: 3px 0; display: flex; align-items: center;">',
    '                          <!-- EMBED:ICON_ADDRESS_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                          <img src="' + '{{iconAddress}}' + '" width="24" height="24" alt="EMBED ADDRESS ICON HERE (delete me)" style="display:block;border:0;" /><span style="display:inline-block;width:10px;height:1px;line-height:1px;font-size:0;">&nbsp;</span>{Street}',
    '                        </td>',
    '                      </tr>',
    '                    </table>',
    '                  </td>',
    '                  <td style="width: 35%; vertical-align: middle; text-align: right; padding-left: 20px;">',
    '                    <div style="text-align: right;">',
    '                      ',
    '                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-left: auto; margin-right: 0; line-height:0; font-size:0;">',
    '                        <tr>',
    '                          <td style="padding: 0 2px; vertical-align: middle;">',
    '                            <a href="' + '{{socialLinks.facebook}}' + '" style="text-decoration: none;">',
    '                              <!-- EMBED:ICON_FACEBOOK_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                              <img src="' + '{{iconFacebook}}' + '" width="24" height="24" alt="EMBED FACEBOOK ICON HERE (delete me)" style="display:block;border:0;" />',
    '                            </a>',
    '                          </td>',
    '                          <td style="padding: 0 2px; vertical-align: middle;">',
    '                            <a href="' + '{{socialLinks.instagram}}' + '" style="text-decoration: none;">',
    '                              <!-- EMBED:ICON_INSTAGRAM_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                              <img src="' + '{{iconInstagram}}' + '" width="24" height="24" alt="EMBED INSTAGRAM ICON HERE (delete me)" style="display:block;border:0;" />',
    '                            </a>',
    '                          </td>',
    '                          <td style="padding: 0 2px; vertical-align: middle;">',
    '                            <a href="' + '{{socialLinks.linkedin}}' + '" style="text-decoration: none;">',
    '                              <!-- EMBED:ICON_LINKEDIN_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                              <img src="' + '{{iconLinkedin}}' + '" width="24" height="24" alt="EMBED LINKEDIN ICON HERE (delete me)" style="display:block;border:0;" />',
    '                            </a>',
    '                          </td>',
    '                          <td style="padding: 0 2px; vertical-align: middle;">',
    '                            <a href="' + '{{socialLinks.youtube}}' + '" style="text-decoration: none;">',
    '                              <!-- EMBED:ICON_YOUTUBE_24 - Delete the next <img> and Insert → Picture → Embedded (24x24 PNG) here -->',
    '                              <img src="' + '{{iconYoutube}}' + '" width="24" height="24" alt="EMBED YOUTUBE ICON HERE (delete me)" style="display:block;border:0;" />',
    '                            </a>',
    '                          </td>',
    '                        </tr>',
    '                      </table>',
    '                    </div>',
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '        </table>',
    '        ',
    '        <!-- Spacer before separator -->',
    '        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">',
    '          <tr>',
    '            <td height="10" style="height:10px; line-height:0; font-size:0;">&nbsp;</td>',
    '          </tr>',
    '        </table>',
    '        ',
    '        <!-- Silver separator line (no margins) -->',
    '        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width: 100%; border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">',
    '          <tr>',
    '            <td style="height: 2px; line-height:0; font-size:0; background: linear-gradient(90deg, transparent 0%, #c0c0c0 20%, #ffffff 50%, #c0c0c0 80%, transparent 100%);">&nbsp;</td>',
    '          </tr>',
    '        </table>',
    '        ',
    '        <!-- Spacer after separator -->',
    '        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">',
    '          <tr>',
    '            <td height="10" style="height:10px; line-height:0; font-size:0;">&nbsp;</td>',
    '          </tr>',
    '        </table>',
    '        ',
    '        <!-- Full-width banner images stacked -->',
    '        <!-- First banner as bare image -->',
    '        <img src="' + '{{bannerImage1}}' + '" alt="EMBED BANNER 1 HERE (delete me)" width="600" height="100" style="width: 600px; height: 100px; display: block;" />',
    '        ',
    '        <!-- Spacer between banners -->',
    '        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">',
    '          <tr>',
    '            <td height="10" style="height:10px; line-height:0; font-size:0;">&nbsp;</td>',
    '          </tr>',
    '        </table>',
    '        ',
    '        <!-- Second banner inside link; no rounded corners (we keep straight like your snippet) -->',
    '        <a href="' + '{{bannerLink2}}' + '" style="text-decoration: none;">',
    '          <img src="' + '{{bannerImage2}}' + '" alt="EMBED BANNER 2 HERE (delete me)" width="600" height="100" style="width: 600px; height: 100px; display: block;" />',
    '        </a>',
    '        ',
    '        <!-- Spacer before disclaimer -->',
    '        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">',
    '          <tr>',
    '            <td height="8" style="height:8px; line-height:0; font-size:0;">&nbsp;</td>',
    '          </tr>',
    '        </table>',
    '        ',
    '        <!-- Footer panel: black with rounded bottom and shadow -->',
    '        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background-color: #000000; border-radius: 0 0 10px 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">',
    '          <tr>',
    '            <td style="font-size: 10px; color: #cccccc; text-align: center; line-height: 1.3; padding: 10px;">',
    '              This email and any attachments are confidential and may be legally privileged. If you are not the intended recipient, please notify the sender immediately and delete this message.',
    '            </td>',
    '          </tr>',
    '        </table>',
    '      </td>',
    '    </tr>',
    '  </table>',
    '</body>',
    '</html>'
  ];
  
  return template.join('\n');
};

export default function EmailSignatureBoard() {
  const silverButtonClass = 'bg-gradient-to-br from-gray-200 via-gray-100 to-white text-black border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:from-gray-100 hover:via-white hover:to-white/90 transition-all';
  const [signatureData, setSignatureData] = useState<SignatureData>({
    // Social Media Links
    socialLinks: {
      facebook: 'https://facebook.com/silberarrows',
      instagram: 'https://instagram.com/silberarrows',
      linkedin: 'https://linkedin.com/company/silberarrows',
      youtube: 'https://youtube.com/silberarrows'
    },
    
    // Banner Images
    bannerImage1: 'https://via.placeholder.com/600x100/000000/FFFFFF?text=Banner+1',
    bannerImage2: 'https://via.placeholder.com/600x100/000000/FFFFFF?text=Banner+2',
    
    // Banner Links (optional)
    bannerLink1: '',
    bannerLink2: ''
  });
  
  // Template management state
  const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<SignatureTemplate | null>(null);
  const [templateName, setTemplateName] = useState('SilberArrows Standard');
  const [loading, setLoading] = useState(false);
  
  // UI state
  const [previewMode, setPreviewMode] = useState<'preview' | 'html'>('preview');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<{banner1: boolean, banner2: boolean}>({
    banner1: false,
    banner2: false
  });
  const [assetUploading, setAssetUploading] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Database functions
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/email-signatures');
      const result = await response.json();
      if (result.signatures) {
        setTemplates(result.signatures);
        
        // Load default template if available
        const defaultTemplate = result.signatures.find((t: SignatureTemplate) => t.is_default);
        if (defaultTemplate) {
          loadTemplate(defaultTemplate);
        } else if (result.signatures.length > 0) {
          loadTemplate(result.signatures[0]);
        }
      } else {
        setTemplates([]);
      }
    } catch (error) {
      setTemplates([]);
    }
  };

  const loadTemplate = (template: SignatureTemplate) => {
    setCurrentTemplate(template);
    setTemplateName(template.name);
    setSignatureData({
      socialLinks: {
        facebook: template.facebook_url || '',
        instagram: template.instagram_url || '',
        linkedin: template.linkedin_url || '',
        youtube: template.youtube_url || ''
      },
      bannerImage1: template.banner_image_1_url || '',
      bannerImage2: template.banner_image_2_url || '',
      bannerLink1: template.banner_link_1_url || '',
      bannerLink2: template.banner_link_2_url || '',
      logoImage: template.logo_image_url || '',
      iconEmail: template.icon_email_url || '',
      iconPhone: template.icon_phone_url || '',
      iconMobile: template.icon_mobile_url || '',
      iconAddress: template.icon_address_url || '',
      iconFacebook: template.icon_facebook_url || '',
      iconInstagram: template.icon_instagram_url || '',
      iconLinkedin: template.icon_linkedin_url || '',
      iconYoutube: template.icon_youtube_url || ''
    });
    
    // Force refresh to ensure UI updates
    setRefreshKey(prev => prev + 1);
  };

  const saveTemplate = async (forceNew: boolean = false) => {
    setLoading(true);
    try {
      const templateData = {
        name: templateName,
        description: `Email signature template for ${templateName}`,
        facebook_url: signatureData.socialLinks.facebook,
        instagram_url: signatureData.socialLinks.instagram,
        linkedin_url: signatureData.socialLinks.linkedin,
        youtube_url: signatureData.socialLinks.youtube,
        banner_image_1_url: signatureData.bannerImage1,
        banner_image_2_url: signatureData.bannerImage2,
        banner_link_1_url: signatureData.bannerLink1 || null,
        banner_link_2_url: signatureData.bannerLink2 || null,
        logo_image_url: signatureData.logoImage || null,
        icon_email_url: signatureData.iconEmail || null,
        icon_phone_url: signatureData.iconPhone || null,
        icon_mobile_url: signatureData.iconMobile || null,
        icon_address_url: signatureData.iconAddress || null,
        icon_facebook_url: signatureData.iconFacebook || null,
        icon_instagram_url: signatureData.iconInstagram || null,
        icon_linkedin_url: signatureData.iconLinkedin || null,
        icon_youtube_url: signatureData.iconYoutube || null,
        template_html: getSilberArrowsSignatureTemplate(),
        department: 'All Departments',
        is_active: true,
        // Always save as non-default unless explicitly set elsewhere
        is_default: false
      };

      // Check if template name already exists (for new templates)
      const nameExists = templates.some(t => t.name === templateName && t.id !== currentTemplate?.id);
      if (nameExists && (forceNew || !currentTemplate?.id)) {
        alert('A template with this name already exists. Please choose a different name.');
        setLoading(false);
        return;
      }

      const method = (currentTemplate?.id && !forceNew) ? 'PUT' : 'POST';
      const body = (currentTemplate?.id && !forceNew)
        ? { ...templateData, id: currentTemplate.id }
        : templateData;

      const response = await fetch('/api/email-signatures', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`Save failed: ${result?.error || 'Unknown error'}`);
        return;
      }

      if (result.signature) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        
        // If creating new template, clear current template selection
        if (forceNew || !currentTemplate?.id) {
          setCurrentTemplate(null);
        }
        
        await loadTemplates(); // Refresh templates list
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const createNewTemplate = () => {
    setCurrentTemplate(null);
    setTemplateName('');
    setSignatureData({
      socialLinks: {
        facebook: 'https://facebook.com/silberarrows',
        instagram: 'https://instagram.com/silberarrows',
        linkedin: 'https://linkedin.com/company/silberarrows',
        youtube: 'https://youtube.com/silberarrows'
      },
      bannerImage1: 'https://via.placeholder.com/600x100/000000/FFFFFF?text=Banner+1',
      bannerImage2: 'https://via.placeholder.com/600x100/000000/FFFFFF?text=Banner+2',
      bannerLink1: '',
      bannerLink2: ''
    });
  };

  const uploadBannerImage = async (file: File, bannerType: 'banner_1' | 'banner_2') => {
    const uploadingKey: 'banner1' | 'banner2' = bannerType === 'banner_1' ? 'banner1' : 'banner2';
    const dataKey: 'bannerImage1' | 'bannerImage2' = bannerType === 'banner_1' ? 'bannerImage1' : 'bannerImage2';
    setUploading(prev => ({ ...prev, [uploadingKey]: true }));
    
    try {
      // Use the existing working upload-file API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', `email-signature-${bannerType}`); // Use separate folders for each banner
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success && result.fileUrl) {
        setSignatureData(prev => {
          const updated = {
            ...prev,
            [dataKey]: result.fileUrl
          };
          return updated;
        });
        
        // Force re-render to ensure UI updates
        setRefreshKey(prev => prev + 1);
      } else {
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Upload error: ${error}`);
    } finally {
      setUploading(prev => ({ ...prev, [uploadingKey]: false }));
    }
  };

  // Validate image dimensions before upload
  const validateImageDimensions = (file: File, requiredWidth: number, requiredHeight: number | 'auto') => {
    return new Promise<{ ok: boolean; width?: number; height?: number; error?: string }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const acceptedMultipliers = [1, 2, 3];
        const isAccepted = acceptedMultipliers.some((m) => {
          if (requiredHeight === 'auto') {
            return width === requiredWidth * m; // height can be any; aspect preserved by client export
          }
          return width === requiredWidth * m && height === requiredHeight * m;
        });

        if (!isAccepted) {
          const sizesList = requiredHeight === 'auto'
            ? acceptedMultipliers.map((m) => `${requiredWidth * m}px width`).join(', ')
            : acceptedMultipliers.map((m) => `${requiredWidth * m}x${requiredHeight * m}px`).join(', ');
          resolve({ ok: false, width, height, error: `Accepted sizes: ${sizesList}. Provided ${width}x${height}.` });
          return;
        }

        resolve({ ok: true, width, height });
      };
      img.onerror = () => resolve({ ok: false, error: 'Failed to read image.' });
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadAsset = async (
    file: File,
    taskKey: string,
    setStateKey: keyof SignatureData,
    requiredWidth: number,
    requiredHeight: number | 'auto'
  ) => {
    setAssetUploading(prev => ({ ...prev, [taskKey]: true }));
    try {
      const v = await validateImageDimensions(file, requiredWidth, requiredHeight);
      if (!v.ok) {
        alert(`Invalid image size: ${v.error}`);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', `email-signature-${taskKey}`);

      const response = await fetch('/api/upload-file', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success && result.fileUrl) {
        setSignatureData(prev => ({ ...prev, [setStateKey]: result.fileUrl as unknown as string }));
        setRefreshKey(prev => prev + 1);
      } else {
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setAssetUploading(prev => ({ ...prev, [taskKey]: false }));
    }
  };

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const generateSignature = (forPreview: boolean = false): string => {
    let signature = getSilberArrowsSignatureTemplate();
    
    // Helper function to get proper image URL for preview or final HTML
    const getImageUrl = (url: string) => {
      if (!url) return '';

      if (forPreview) {
        // For preview, proxy ANY absolute URL to avoid CORS/domain issues and add cache-buster
        if (/^https?:\/\//i.test(url)) {
          const bust = Date.now();
          return `/api/storage-proxy?url=${encodeURIComponent(url)}&t=${bust}`;
        }
        return url;
      }

      return url; // Return original URL for final HTML
    };
    
    // Replace only the editable fields (social links and banner images)
    // Leave dynamic variables as-is for email system to handle
    const transparent1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const replacements: Record<string, string> = {
      '{{socialLinks.facebook}}': signatureData.socialLinks.facebook,
      '{{socialLinks.instagram}}': signatureData.socialLinks.instagram,
      '{{socialLinks.linkedin}}': signatureData.socialLinks.linkedin,
      '{{socialLinks.youtube}}': signatureData.socialLinks.youtube,
      '{{bannerImage1}}': getImageUrl(signatureData.bannerImage1),
      '{{bannerImage2}}': getImageUrl(signatureData.bannerImage2),
      '{{bannerLink1}}': signatureData.bannerLink1 || '#',
      '{{bannerLink2}}': signatureData.bannerLink2 || '#',
      // Use real URLs (proxied in preview) or fallback to 1x1 to avoid broken icons
      '{{logoImage}}': signatureData.logoImage ? getImageUrl(signatureData.logoImage) : transparent1x1,
      '{{iconEmail}}': signatureData.iconEmail ? getImageUrl(signatureData.iconEmail) : transparent1x1,
      '{{iconPhone}}': signatureData.iconPhone ? getImageUrl(signatureData.iconPhone) : transparent1x1,
      '{{iconMobile}}': signatureData.iconMobile ? getImageUrl(signatureData.iconMobile) : transparent1x1,
      '{{iconAddress}}': signatureData.iconAddress ? getImageUrl(signatureData.iconAddress) : transparent1x1,
      '{{iconFacebook}}': signatureData.iconFacebook ? getImageUrl(signatureData.iconFacebook) : transparent1x1,
      '{{iconInstagram}}': signatureData.iconInstagram ? getImageUrl(signatureData.iconInstagram) : transparent1x1,
      '{{iconLinkedin}}': signatureData.iconLinkedin ? getImageUrl(signatureData.iconLinkedin) : transparent1x1,
      '{{iconYoutube}}': signatureData.iconYoutube ? getImageUrl(signatureData.iconYoutube) : transparent1x1
    };
    
    // Replace only our editable placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      signature = signature.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
    });

    // Hide CodeTwo conditional tags in local preview so {RT}{/RT} doesn't render as text
    if (forPreview) {
      signature = signature.replace(/\{RT\}/g, '').replace(/\{\/RT\}/g, '');
    }
    
    return signature;
  };

  const copyToClipboard = async () => {
    const signature = generateSignature(false); // Use direct URLs for final HTML
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
    }
  };

  const saveSignature = () => {
    saveTemplate(false); // Normal save (update if editing, create if new)
  };

  const downloadAsHTML = () => {
    const signature = generateSignature(false); // Use direct URLs for final HTML
    const blob = new Blob([signature], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silberarrows-signature-template.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteTemplate = async (template: SignatureTemplate) => {
    if (!template?.id) return;
    const confirm = window.confirm(`Delete template "${template.name}"? This cannot be undone.`);
    if (!confirm) return;

    try {
      const response = await fetch('/api/email-signatures', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to delete template');
      }

      // Remove from UI
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      if (currentTemplate?.id === template.id) {
        setCurrentTemplate(null);
      }
    } catch (err) {
      alert(`Delete failed: ${err}`);
    }
  };

  return (
    <div className="fixed inset-0 top-[72px] px-4 overflow-hidden">
      <div className="flex gap-4 h-full">
        
        {/* Left Panel - Form */}
        <div className="w-1/3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Signature Builder
            </h2>
            <p className="text-white/70 text-sm">
              Configure social media links and banner images. All other fields are managed by dynamic variables.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Social Media Links
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={signatureData.socialLinks.facebook}
                    onChange={(e) => setSignatureData(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, facebook: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="https://facebook.com/silberarrows"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={signatureData.socialLinks.instagram}
                    onChange={(e) => setSignatureData(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="https://instagram.com/silberarrows"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={signatureData.socialLinks.linkedin}
                    onChange={(e) => setSignatureData(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="https://linkedin.com/company/silberarrows"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={signatureData.socialLinks.youtube}
                    onChange={(e) => setSignatureData(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="https://youtube.com/silberarrows"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Template Name */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Template Name
            </h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="Template name (e.g., Sales Team, Marketing)"
            />
          </div>

          {/* Banner Images */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Banner Images
            </h3>
            <div className="space-y-4">
              {/* Banner 1 */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Banner Image 1
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    key={`banner1-${signatureData.bannerImage1}-${refreshKey}`}
                    value={signatureData.bannerImage1}
                    onChange={(e) => {
                      setSignatureData(prev => ({ ...prev, bannerImage1: e.target.value }));
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="https://example.com/banner1.jpg"
                  />
                  <input
                    type="url"
                    value={signatureData.bannerLink1}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, bannerLink1: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Optional link for Banner 1 (https://...)"
                  />
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all cursor-pointer ${uploading.banner1 ? 'opacity-50' : ''}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadBannerImage(file, 'banner_1');
                          }
                          // Reset the input to allow re-upload of same file
                          e.target.value = '';
                        }}
                        disabled={uploading.banner1}
                      />
                      {uploading.banner1 ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Banner 2 */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Banner Image 2
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    key={`banner2-${signatureData.bannerImage2}-${refreshKey}`}
                    value={signatureData.bannerImage2}
                    onChange={(e) => {
                      setSignatureData(prev => ({ ...prev, bannerImage2: e.target.value }));
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="https://example.com/banner2.jpg"
                  />
                  <input
                    type="url"
                    value={signatureData.bannerLink2}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, bannerLink2: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Optional link for Banner 2 (https://...)"
                  />
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all cursor-pointer ${uploading.banner2 ? 'opacity-50' : ''}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadBannerImage(file, 'banner_2');
                          }
                          // Reset the input to allow re-upload of same file
                          e.target.value = '';
                        }}
                        disabled={uploading.banner2}
                      />
                      {uploading.banner2 ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo & Icons (PNG uploads with fixed sizes) */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Logo & Icons</h3>
            <div className="space-y-4">
              {/* Logo 80x auto */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="col-span-1 text-white/80">Logo (80px width PNG)</div>
                <input
                  type="url"
                  value={signatureData.logoImage || ''}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, logoImage: e.target.value }))}
                  className="col-span-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="https://.../logo.png"
                />
                <div className="col-span-3">
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all cursor-pointer ${assetUploading['logo'] ? 'opacity-50' : ''}`}>
                    <input type="file" accept="image/png" className="hidden" disabled={!!assetUploading['logo']} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logo', 'logoImage', 80, 'auto'); e.target.value=''; }} />
                    {assetUploading['logo'] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload
                  </label>
                </div>
              </div>

              {/* Contact icons 24x24 */}
              {([
                ['Email icon', 'iconEmail' as const, 'icon_email'],
                ['Phone icon', 'iconPhone' as const, 'icon_phone'],
                ['Mobile icon', 'iconMobile' as const, 'icon_mobile'],
                ['Address icon', 'iconAddress' as const, 'icon_address']
              ]).map(([label, key, task]) => (
                <div key={key} className="grid grid-cols-3 gap-3 items-center">
                  <div className="col-span-1 text-white/80">{label} (24×24 PNG)</div>
                  <input
                    type="url"
                    value={(signatureData as any)[key] || ''}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, [key]: e.target.value } as any))}
                    className="col-span-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder={`https://.../${task}.png`}
                  />
                  <div className="col-span-3">
                    <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all cursor-pointer ${assetUploading[task] ? 'opacity-50' : ''}`}>
                      <input type="file" accept="image/png" className="hidden" disabled={!!assetUploading[task]} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, task, key as keyof SignatureData, 24, 24); e.target.value=''; }} />
                      {assetUploading[task] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload
                    </label>
                  </div>
                </div>
              ))}

              {/* Social icons 24x24 */}
              {([
                ['Facebook icon', 'iconFacebook' as const, 'icon_facebook'],
                ['Instagram icon', 'iconInstagram' as const, 'icon_instagram'],
                ['LinkedIn icon', 'iconLinkedin' as const, 'icon_linkedin'],
                ['YouTube icon', 'iconYoutube' as const, 'icon_youtube']
              ]).map(([label, key, task]) => (
                <div key={key} className="grid grid-cols-3 gap-3 items-center">
                  <div className="col-span-1 text-white/80">{label} (24×24 PNG)</div>
                  <input
                    type="url"
                    value={(signatureData as any)[key] || ''}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, [key]: e.target.value } as any))}
                    className="col-span-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder={`https://.../${task}.png`}
                  />
                  <div className="col-span-3">
                    <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all cursor-pointer ${assetUploading[task] ? 'opacity-50' : ''}`}>
                      <input type="file" accept="image/png" className="hidden" disabled={!!assetUploading[task]} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, task, key as keyof SignatureData, 24, 24); e.target.value=''; }} />
                      {assetUploading[task] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Saved Templates */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Code className="w-4 h-4" />
                Templates ({templates.length})
              </h3>
              {/* Removed Refresh and New buttons per request */}
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3 bg-white/5">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                    currentTemplate?.id === template.id
                      ? 'border-white/40 bg-gradient-to-br from-gray-200/20 via-white/10 to-gray-100/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="min-w-0 cursor-pointer" onClick={() => loadTemplate(template)}>
                    <div className="font-medium text-white text-sm truncate">{template.name}</div>
                    <div className="text-xs text-white/60 mt-1">
                      Created: {template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Unknown'}
                    </div>
                    {template.is_default && (
                      <div className="text-xs text-blue-400 mt-1">Default Template</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadTemplate(template)}
                      className={`px-2 py-1 text-xs rounded-md ${silverButtonClass}`}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${silverButtonClass}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {templates.length === 0 && (
                <div className="text-white/60 text-sm text-center py-8">
                  No templates saved yet. Create your first template!
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={saveSignature}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  saved
                    ? 'bg-green-500 text-white'
                    : loading
                    ? 'bg-gray-500 text-white opacity-50'
                    : silverButtonClass
                }`}
              >
                {saved ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Saved!
                  </>
                ) : loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {currentTemplate?.id ? 'Update' : 'Save'}
                  </>
                )}
              </button>
              
              {currentTemplate?.id && (
                <button
                  onClick={() => saveTemplate(true)}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${silverButtonClass}`}
                >
                  <Plus className="w-4 h-4" />
                  Save as New
                </button>
              )}
            </div>

            <button
              onClick={copyToClipboard}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${silverButtonClass}`}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy HTML Code'}
            </button>

            <button
              onClick={downloadAsHTML}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${silverButtonClass}`}
            >
              <Download className="w-4 h-4" />
              Download HTML
            </button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Email Signature Preview
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${silverButtonClass}`}
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  Preview
                </button>
                <button
                  onClick={() => setPreviewMode('html')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${silverButtonClass}`}
                >
                  <Code className="w-4 h-4 inline mr-1" />
                  HTML Code
                </button>
              </div>
            </div>

            {previewMode === 'preview' ? (
              <div className="bg-white p-6 rounded-lg shadow-lg min-h-[300px]">
                <div
                  key={`preview-${signatureData.bannerImage1}-${signatureData.bannerImage2}-${refreshKey}`}
                  dangerouslySetInnerHTML={{ __html: generateSignature(true) }}
                />
              </div>
            ) : (
              <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
                <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                  {generateSignature(false)}
                </pre>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
