'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Image as ImageIcon, Video, Clock, Sparkles, ArrowRight, BookOpen, Trash2, Plus } from 'lucide-react';
import ContentPillarModal from './ContentPillarModalRefactored';
import ContentExamplesModal from './ContentExamplesModal';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

// Define the content pillar item type
interface ContentPillarItem {
  id: string;
  title: string;
  description?: string;
  content_type: 'image' | 'video' | 'text' | 'carousel';
  day_of_week: string;
  created_at: string;
  updated_at: string;
  media_files?: any[];
  media_files_a?: any[]; // Template A specific media files
  media_files_b?: any[]; // Template B specific media files
  badge_text?: string;
  subtitle?: string;
  myth?: string;
  fact?: string;
  problem?: string;
  solution?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
}

// Define content example type
interface ContentExample {
  id: string;
  title: string;
  description: string;
  content_type: 'image' | 'video' | 'text' | 'carousel';
  day_of_week: string;
}

// Define the day columns
const dayColumns = [
  { 
    key: "monday", 
    title: "MYTH BUSTER MONDAY", 
    icon: <Calendar className="w-4 h-4" />,
    color: "blue"
  },
  { 
    key: "tuesday", 
    title: "TECH TIPS TUESDAY", 
    icon: <Calendar className="w-4 h-4" />,
    color: "green"
  },
  { 
    key: "wednesday", 
    title: "SPOTLIGHT OF THE WEEK", 
    icon: <Plus className="w-4 h-4" />, 
    color: "purple"
  },
  { 
    key: "thursday", 
    title: "TRANSFORMATION THURSDAY", 
    icon: <Calendar className="w-4 h-4" />,
    color: "yellow"
  },
  { 
    key: "friday", 
    title: "FUN FRIDAY", 
    icon: <Calendar className="w-4 h-4" />,
    color: "orange"
  },
  { 
    key: "saturday", 
    title: "SOCIAL SATURDAY", 
    icon: <Calendar className="w-4 h-4" />,
    color: "pink"
  }
];

// Helper function to get content type icon
const getContentTypeIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <ImageIcon className="w-3 h-3" />;
    case 'video':
      return <Video className="w-3 h-3" />;
    case 'carousel':
      return <FileText className="w-3 h-3" />;
    default:
      return <FileText className="w-3 h-3" />;
  }
};

// Helper function to format dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Skeleton Loading Components
const SkeletonCard = () => (
  <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-2 mb-1.5 animate-pulse">
    <div className="flex gap-2">
      <div className="w-12 h-12 bg-white/10 rounded-lg flex-shrink-0"></div>
      <div className="flex-1 space-y-1">
        <div className="h-3 bg-white/10 rounded w-3/4"></div>
        <div className="h-2 bg-white/10 rounded w-1/2"></div>
        <div className="h-2 bg-white/10 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

const SkeletonColumn = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex flex-col flex-1 min-w-0">
    <div className="mb-2 px-1 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <h3 className="text-[10px] font-medium text-white whitespace-nowrap">
          {title}
        </h3>
      </div>
      <div className="bg-white/10 text-white/50 text-[9px] px-1.5 py-0.5 rounded-full font-medium">
        ...
      </div>
    </div>
    <div className="flex-1 space-y-1.5 overflow-y-auto">
      {[...Array(3)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

export default function ContentPillarsBoard() {
  const { user } = useAuth();
  const [contentItems, setContentItems] = useState<ContentPillarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDayTitle, setSelectedDayTitle] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<{
    title: string;
    description: string;
    content_type: 'image' | 'video' | 'text' | 'carousel';
    badge_text?: string;
    subtitle?: string;
    myth?: string;
    fact?: string;
    problem?: string;
    solution?: string;
    difficulty?: string;
    tools_needed?: string;
    warning?: string;
  } | null>(null);
  const [contentExamples, setContentExamples] = useState<ContentExample[]>([]);
  const [editingPillar, setEditingPillar] = useState<ContentPillarItem | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Progressive loading state for fade-in animation (like marketing kanban)
  const [columnsVisible, setColumnsVisible] = useState(false);

  // Fetch data from API
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await fetchContentPillars();
        await fetchContentExamples();
      }
    };
    
    fetchData();
    
    // Progressive fade-in animation (like marketing kanban)
    const timer = setTimeout(() => {
      setColumnsVisible(true);
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Fetch content pillars from API
  const fetchContentPillars = async () => {
    if (isLoading) {
      console.log('⏳ Already fetching content pillars, skipping...');
      return;
    }
    
    console.log('🔄 Fetching content pillars...');
    setIsLoading(true);
    
    // Clear existing data first to force refresh
    setContentItems([]);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/content-pillars?t=${Date.now()}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Fetched content pillars:', data.length, 'items');
        console.log('📋 First few titles:', data.slice(0, 5).map((p: any) => p.title));
        setContentItems(data);
        console.log('✅ Successfully fetched content pillars:', data.length);
      } else {
        console.error('Failed to fetch content pillars');
      }
    } catch (error) {
      console.error('Error fetching content pillars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch content examples from API
  const fetchContentExamples = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/content-examples', { headers });
      
      if (response.ok) {
        const data = await response.json();
        setContentExamples(data);
        console.log('✅ Successfully fetched content examples:', data.length);
      } else {
        console.error('Failed to fetch content examples');
      }
    } catch (error) {
      console.error('Error fetching content examples:', error);
    } finally {
      setLoading(false);
    }
  };



  // Group content items by day
  const groupedContent = dayColumns.reduce((acc, col) => {
    acc[col.key] = contentItems.filter(item => item.day_of_week === col.key);
    return acc;
  }, {} as Record<string, ContentPillarItem[]>);

  // Debug logging for content grouping
  console.log('🔍 Content Items:', contentItems.length);
  console.log('📅 Day columns:', dayColumns.map(col => col.key));
  console.log('🗂️ Grouped content summary:', Object.entries(groupedContent).map(([day, items]) => 
    `${day}: ${items.length} items`
  ));

  // Helper function to get authorization headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return { 'Content-Type': 'application/json' };
    
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };

  // Handle AI content regeneration with specific content type
  const handleAIRegenerate = async (contentType: 'image' | 'video' | 'text' | 'carousel') => {
    if (!selectedDay) return;
    
    // Clear existing generated image when regenerating content
    const pillarKey = `new_${selectedDay}`;
    setGeneratedImages(prev => {
      const updated = { ...prev };
      delete updated[pillarKey];
      return updated;
    });
    
    setAiGenerating(true);
    
    try {
      console.log('Regenerating AI content for:', selectedDay, 'as', contentType);
      
      // Get existing pillars for this day
      const existingPillarsForDay = groupedContent[selectedDay] || [];
      
      // Call OpenAI API to generate content with specific type
      const headers = await getAuthHeaders();
      const response = await fetch('/api/generate-content-pillar', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dayOfWeek: selectedDay,
          contentType: contentType,
          businessContext: 'SilberArrows luxury automotive dealership',
          existingPillars: existingPillarsForDay
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate AI content');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to regenerate content');
      }

      console.log('✅ Successfully regenerated AI content:', result.data.title);
      setAiGeneratedContent(result.data);
    } catch (error) {
      console.error('Error regenerating AI content:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  // Handle AI content generation
  const handleAIGenerate = async (dayKey: string) => {
    if (aiGenerating) {
      console.log('⏳ AI generation already in progress, skipping...');
      return;
    }
    
    console.log('🚀 AI Generate button clicked for:', dayKey);
    
    const dayColumn = dayColumns.find(col => col.key === dayKey);
    setSelectedDay(dayKey);
    setSelectedDayTitle(dayColumn?.title || dayKey);
    setEditingPillar(null); // Reset editing state for new AI generation
    
    // Clear any existing generated image for this day when generating fresh content
    const pillarKey = `new_${dayKey}`;
    setGeneratedImages(prev => {
      const updated = { ...prev };
      delete updated[pillarKey];
      return updated;
    });
    
    setAiGenerating(true);
    
    try {
      console.log('✨ Starting AI generation process for:', dayKey);
      
      // 🔄 FRESH DATA FETCH: Ensure we have the latest content pillars before AI generation
      console.log('🔄 Fetching fresh content pillars to avoid repetition...');
      await fetchContentPillars();
      
      // Wait a moment for state to update with fresh data
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get existing pillars for this day from the most current data
      const currentGroupedContent = dayColumns.reduce((acc, col) => {
        acc[col.key] = contentItems.filter(item => item.day_of_week === col.key);
        return acc;
      }, {} as Record<string, ContentPillarItem[]>);
      
      const existingPillarsForDay = currentGroupedContent[dayKey] || [];
      
      console.log(`📊 FRESH DATA - Existing pillars for ${dayKey}:`, existingPillarsForDay.length);
      console.log('📋 Current pillar titles:', existingPillarsForDay.map(p => p.title));
      console.log('📝 Full pillar details for AI context:', existingPillarsForDay.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description?.substring(0, 200) + '...',
        content_type: p.content_type
      })));
      
      if (existingPillarsForDay.length > 0) {
        console.log('🚨 ANTI-REPETITION: Sending existing pillars to AI to avoid duplication');
      } else {
        console.log('✨ FRESH START: No existing pillars found, AI will create original content');
      }
      
      // Call OpenAI API to generate content
      const headers = await getAuthHeaders();
      const response = await fetch('/api/generate-content-pillar', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dayOfWeek: dayKey,
          contentType: 'image', // Default to image, can be made dynamic later
          businessContext: 'SilberArrows luxury automotive dealership',
          existingPillars: existingPillarsForDay
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI content');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content');
      }

      console.log('✅ Successfully generated AI content:', result.data.title);
      setAiGeneratedContent(result.data);
      setShowAIModal(true);
    } catch (error) {
      console.error('Error generating AI content:', error);
      
      // Fallback to example-based generation if API fails
      const aiContent = generateAIContentFromExamples(dayKey);
      setAiGeneratedContent(aiContent);
      setShowAIModal(true);
    } finally {
      setAiGenerating(false);
    }
  };

  // Generate AI content based on stored examples for the day
  const generateAIContentFromExamples = (dayKey: string) => {
    const dayExamples = contentExamples.filter(ex => ex.day_of_week === dayKey);
    
    if (dayExamples.length === 0) {
      // Fallback to default content if no examples exist
      return {
        title: `New ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)} Content`,
        description: `AI-generated content for ${dayKey} based on SilberArrows Mercedes-Benz themes.`,
        content_type: 'image' as const
      };
    }

    // Randomly select an example as inspiration
    const randomExample = dayExamples[Math.floor(Math.random() * dayExamples.length)];
    
    // Generate variations based on the selected example
    const variations = generateContentVariations(randomExample);
    
    return variations;
  };

  // Generate content variations based on an example
  const generateContentVariations = (example: ContentExample) => {
    const titleVariations: Record<string, string[]> = {
      'New S-Class AMG Arrival Showcase': [
        'Latest E-Class AMG Delivery',
        'Fresh C63 AMG Unveiling',
        'Premium GLE AMG Showcase'
      ],
      'Customer Delivery Joy Moment': [
        'First Mercedes Experience',
        'Dream Car Handover Ceremony',
        'New Owner Celebration'
      ],
      'MBUX Voice Command Demo': [
        'Hey Mercedes Tutorial',
        'Voice Control Masterclass',
        'MBUX System Deep Dive'
      ],
      'Winter Maintenance Guide': [
        'Summer Care Tips',
        'Seasonal Service Guide',
        'Mercedes Care Essentials'
      ]
    };

    const descriptionVariations: string[] = [
      'Showcase premium features and luxury details with professional photography',
      'Highlight advanced technology and innovative Mercedes engineering',
      'Demonstrate expert service and customer satisfaction excellence',
      'Feature interactive content that engages our Mercedes community'
    ];

    // Get variations or use the original
    const possibleTitles = titleVariations[example.title] || [example.title];
    const randomTitle = possibleTitles[Math.floor(Math.random() * possibleTitles.length)];
    const randomDescription = descriptionVariations[Math.floor(Math.random() * descriptionVariations.length)];

    return {
      title: randomTitle,
      description: randomDescription,
      content_type: example.content_type
    };
  };

  // Format content pillar data into structured description
  const formatContentPillarDescription = (item: ContentPillarItem): string => {
    const sections: string[] = [];
    
    // Basic info
    if (item.description) {
      sections.push(`**Description:**\n${item.description}`);
    }
    
    // Badge and subtitle
    if (item.badge_text) {
      sections.push(`**Badge:** ${item.badge_text}`);
    }
    if (item.subtitle) {
      sections.push(`**Subtitle:** ${item.subtitle}`);
    }
    
    // Day-specific content based on day_of_week
    if (item.day_of_week === 'monday') {
      // Myth Buster Monday fields
      if (item.myth) {
        sections.push(`**The Myth:**\n${item.myth}`);
      }
      if (item.fact) {
        sections.push(`**The Fact:**\n${item.fact}`);
      }
    } else if (item.day_of_week === 'tuesday') {
      // Tech Tips Tuesday fields
      if (item.problem) {
        sections.push(`**Problem:**\n${item.problem}`);
      }
      if (item.solution) {
        sections.push(`**Solution:**\n${item.solution}`);
      }
      if (item.difficulty) {
        sections.push(`**Difficulty Level:** ${item.difficulty}`);
      }
      if (item.tools_needed) {
        sections.push(`**Tools Needed:** ${item.tools_needed}`);
      }
      if (item.warning) {
        sections.push(`**⚠️ Warning:**\n${item.warning}`);
      }
    } else if (item.day_of_week === 'wednesday') {
      // Spotlight of the Week - might have car-specific info
      sections.push(`**Content Type:** Spotlight of the Week`);
    } else if (item.day_of_week === 'thursday') {
      // Transformation Thursday
      sections.push(`**Content Type:** Transformation Thursday`);
    } else if (item.day_of_week === 'friday') {
      // Fun Friday
      sections.push(`**Content Type:** Fun Friday`);
    } else if (item.day_of_week === 'saturday') {
      // Social Saturday
      sections.push(`**Content Type:** Social Saturday`);
    }
    
    // Add source info
    sections.push(`**Source:** Content Pillar - ${item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1)}`);
    
    // Join all sections with double line breaks for proper formatting
    return sections.filter(Boolean).join('\n\n');
  };

  // Handle pushing content pillar to Creative Hub
  const handlePushToCreativeHub = async (item: ContentPillarItem) => {
    try {
      console.log('Pushing to Creative Hub:', item);
      
      if (!user) {
        throw new Error('Authentication required');
      }

      // Get user display name
      const userName = user.user_metadata?.full_name || 
        user.email?.split('@')[0]?.replace(/\./g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 
        'Marketing Team';

      // Prepare media files - preserve full media objects, not just URLs
      const mediaFiles = item.media_files || [];
      
      // Format all content pillar fields into structured description
      const formattedDescription = formatContentPillarDescription(item);
      console.log('📝 Formatted description for Creative Hub:', formattedDescription);
      
      // Create task data for the Marketing Kanban
      const taskData = {
        title: item.title,
        description: formattedDescription,
        status: 'intake', // Always start in intake
        assignee: userName,
        task_type: item.content_type === 'video' ? 'video' : 'design',
        due_date: null, // No due date initially
        media_files: mediaFiles
      };

      // Get auth headers and call the design-tasks API
      const headers = await getAuthHeaders();
      const response = await fetch('/api/design-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task in Creative Hub');
      }

      const newTask = await response.json();
      console.log('✅ Task created in Creative Hub:', newTask);
      
      // Keep the item in Content Pillars - don't delete it
      // This allows the same content pillar to be sent to kanban multiple times if needed
      
      // Show success feedback
      alert(`"${item.title}" has been pushed to Creative Hub with ${mediaFiles.length} media file(s) and is now in the Intake column!`);
    } catch (error) {
      console.error('Error pushing to Creative Hub:', error);
      alert(`Failed to push to Creative Hub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle opening content examples modal
  const handleOpenExamples = (dayKey: string) => {
    const dayColumn = dayColumns.find(col => col.key === dayKey);
    setSelectedDay(dayKey);
    setSelectedDayTitle(dayColumn?.title || dayKey);
    setShowExamplesModal(true);
  };

  // Handle saving content examples
  const handleSaveExamples = async (examples: ContentExample[]) => {
    try {
      const headers = await getAuthHeaders();
      
      // Writes to content_examples are disabled by default.
      // If we ever need to persist examples, explicitly opt-in with header.
      const response = await fetch('/api/content-examples', {
        method: 'PUT',
        headers: { ...headers, 'x-examples-write': 'ui' },
        body: JSON.stringify({ 
          examples,
          dayOfWeek: selectedDay // Send the selected day for proper deletion logic
        })
      });

      if (response.ok) {
        const updatedExamples = await response.json();
        setContentExamples(updatedExamples);
        console.log('Content examples saved:', updatedExamples.length);
      } else {
        throw new Error('Failed to save content examples');
      }
    } catch (error) {
      console.error('Error saving content examples:', error);
      throw error;
    }
  };

  // Handle opening existing content pillar for editing
  const handleEditContentPillar = (item: ContentPillarItem) => {
    const dayColumn = dayColumns.find(col => col.key === item.day_of_week);
    setSelectedDay(item.day_of_week);
    setSelectedDayTitle(dayColumn?.title || item.day_of_week);
    setEditingPillar(item);
    
    // Set the existing content as "AI generated" content for the modal
    setAiGeneratedContent({
      title: item.title,
      description: item.description || '',
      content_type: item.content_type,
      badge_text: item.badge_text,
      subtitle: item.subtitle,
      myth: item.myth,
      fact: item.fact
    });
    
    setShowAIModal(true);
  };

  // Upload files to Supabase storage with parallel processing and error recovery
  const uploadFilesToStorage = async (pillarId: string, files: any[]): Promise<any[]> => {
    if (!files || files.length === 0) return [];
    
    console.log(`📤 Starting parallel upload of ${files.length} files for pillar ${pillarId}`);
    
    // Helper function to upload a single file with retry logic
    const uploadSingleFile = async (fileInfo: any, retries = 3): Promise<any | null> => {
      if (!fileInfo.file) {
        // This is an existing file, keep it as is
        return fileInfo;
      }
      
        const file = fileInfo.file;
        
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Check file size limit (50MB)
          const maxFileSize = 50 * 1024 * 1024; // 50MB
          if (file.size > maxFileSize) {
            console.warn(`⚠️ File ${file.name} exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB) - skipping`);
            return null;
          }
          
          console.log(`📤 [Attempt ${attempt}/${retries}] Uploading ${file.name}...`);
          
          const ext = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${ext}`;
          const storagePath = `content-pillars/${pillarId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('media-files')
            .upload(storagePath, file, { 
              contentType: file.type, 
              cacheControl: '31536000', // 1 year cache to prevent deletion
              upsert: true // Allow overwrite to prevent conflicts
            });
          
          if (uploadError) {
            throw new Error(uploadError.message);
          }
          
          const { data: { publicUrl: rawUrl } } = supabase.storage
            .from('media-files')
            .getPublicUrl(storagePath);
          
          // Convert to custom domain to avoid ISP blocking
          const publicUrl = rawUrl.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');
          
          const mediaItem = {
            id: crypto.randomUUID(),
            url: publicUrl,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            template_type: fileInfo.template_type || 'general'
          };
          
          console.log(`✅ File uploaded successfully: ${file.name}`);
          return mediaItem;
          
        } catch (error) {
          console.warn(`⚠️ [Attempt ${attempt}/${retries}] Upload failed for ${file.name}:`, error);
          
          if (attempt === retries) {
            console.error(`❌ Final attempt failed for ${file.name}:`, error);
            return null; // Don't throw - allow other files to continue
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      
      return null;
    };
    
    // Upload all files in parallel
    const uploadPromises = files.map(fileInfo => uploadSingleFile(fileInfo));
    const results = await Promise.allSettled(uploadPromises);
    
    // Process results and filter out failed uploads
    const uploadedMedia: any[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        uploadedMedia.push(result.value);
        successCount++;
      } else {
        failureCount++;
        console.warn(`⚠️ File ${index + 1} failed to upload`);
      }
    });
    
    console.log(`📊 Upload summary: ${successCount} successful, ${failureCount} failed`);
    
    // Global dedupe by URL
        const seen = new Set<string>();
    const deduplicatedMedia = uploadedMedia.filter((m: any) => {
          const url = typeof m === 'string' ? m : m?.url;
          if (!url) return true;
          if (seen.has(url)) return false;
          seen.add(url);
          return true;
        });
    
    console.log(`📋 Final media count after deduplication: ${deduplicatedMedia.length}`);
    return deduplicatedMedia;
  };

  // Handle saving content pillar from AI modal (create or update) - FIXED VERSION
  const handleSaveContentPillar = async (pillarData: Partial<ContentPillarItem>) => {
    try {
      const headers = await getAuthHeaders();
      
      if (editingPillar) {
        // UPDATE EXISTING PILLAR
        console.log('📝 Updating existing content pillar:', editingPillar.id);
        
        // Handle media files - they're already uploaded, just pass them through
        let finalMediaFiles: any[] = [];
        if (pillarData.media_files && pillarData.media_files.length > 0) {
          console.log('📁 Processing media files for existing pillar:', pillarData.media_files.length);
          console.log('📁 Media files received:', pillarData.media_files);
          
          // Check if these are already uploaded files (have URLs) or new files to upload
          const alreadyUploadedFiles = pillarData.media_files.filter(file => 
            file && typeof file === 'object' && file.url && !file.file
          );
          const filesToUpload = pillarData.media_files.filter(file => 
            file && typeof file === 'object' && file.file
          );
          
          console.log('📁 Already uploaded files:', alreadyUploadedFiles.length);
          console.log('📁 Files to upload:', filesToUpload.length);
          
          // Upload new files if any
          let uploadedFiles: any[] = [];
          if (filesToUpload.length > 0) {
            uploadedFiles = await uploadFilesToStorage(editingPillar.id, filesToUpload);
          }
          
          // Combine already uploaded files with newly uploaded files
          finalMediaFiles = [...alreadyUploadedFiles, ...uploadedFiles];
          console.log('📁 Final media files count:', finalMediaFiles.length);
        }
        
        const updateData = {
          id: editingPillar.id,
          title: pillarData.title || editingPillar.title,
          description: pillarData.description || editingPillar.description,
          content_type: pillarData.content_type || editingPillar.content_type,
          day_of_week: editingPillar.day_of_week,
          media_files: finalMediaFiles,
          media_files_a: pillarData.media_files_a || [],
          media_files_b: pillarData.media_files_b || [],
          badge_text: pillarData.badge_text,
          subtitle: pillarData.subtitle,
          myth: pillarData.myth,
          fact: pillarData.fact,
          problem: pillarData.problem,
          solution: pillarData.solution,
          difficulty: pillarData.difficulty,
          tools_needed: pillarData.tools_needed,
          warning: pillarData.warning,
        };

        const response = await fetch('/api/content-pillars', {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const updatedPillar = await response.json();
          setContentItems(prev => 
            prev.map(item => item.id === editingPillar.id ? updatedPillar : item)
          );
          console.log('✅ Content pillar updated successfully:', updatedPillar.id);
        } else {
          const errorData = await response.json();
          throw new Error(`Failed to update content pillar: ${errorData.error || 'Unknown error'}`);
        }
      } else {
        // CREATE NEW PILLAR - FIXED APPROACH
        console.log('🆕 Creating new content pillar');
        
        // Step 1: Create pillar WITHOUT media files first
        const createData = {
          title: pillarData.title || '',
          description: pillarData.description || '',
          content_type: pillarData.content_type || 'image',
          day_of_week: pillarData.day_of_week || selectedDay,
          media_files: [], // Empty initially
          badge_text: pillarData.badge_text,
          subtitle: pillarData.subtitle,
          myth: pillarData.myth,
          fact: pillarData.fact,
          problem: pillarData.problem,
          solution: pillarData.solution,
          difficulty: pillarData.difficulty,
          tools_needed: pillarData.tools_needed,
          warning: pillarData.warning,
        };

        console.log('📝 Step 1: Creating pillar record...');
        const createResponse = await fetch('/api/content-pillars', {
          method: 'POST',
          headers,
          body: JSON.stringify(createData)
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(`Failed to create content pillar: ${errorData.error || 'Unknown error'}`);
        }

        const newPillar = await createResponse.json();
        console.log('✅ Step 1 complete: Pillar created with ID:', newPillar.id);
        
        // Step 2: Handle media files (already uploaded or new files)
        let finalMediaFiles: any[] = [];
        if (pillarData.media_files && pillarData.media_files.length > 0) {
          console.log('📁 Step 2: Processing media files with real pillar ID:', newPillar.id);
          console.log('📁 Media files received for new pillar:', pillarData.media_files);
          
          try {
            // Check if these are already uploaded files (have URLs) or new files to upload
            const alreadyUploadedFiles = pillarData.media_files.filter(file => 
              file && typeof file === 'object' && file.url && !file.file
            );
            const filesToUpload = pillarData.media_files.filter(file => 
              file && typeof file === 'object' && file.file
            );
            
            console.log('📁 Already uploaded files for new pillar:', alreadyUploadedFiles.length);
            console.log('📁 Files to upload for new pillar:', filesToUpload.length);
            
            // Upload new files if any
            let uploadedFiles: any[] = [];
            if (filesToUpload.length > 0) {
              uploadedFiles = await uploadFilesToStorage(newPillar.id, filesToUpload);
            }
            
            // Combine already uploaded files with newly uploaded files
            finalMediaFiles = [...alreadyUploadedFiles, ...uploadedFiles];
            console.log('✅ Step 2 complete: Final media files count:', finalMediaFiles.length);
          } catch (uploadError) {
            console.warn('⚠️ File upload failed, but pillar was created:', uploadError);
            // Don't fail the entire process - pillar exists, just without files
          }
        }
        
        // Step 3: Update pillar with media files (if any were processed)
        if (finalMediaFiles.length > 0 || pillarData.media_files_a || pillarData.media_files_b) {
          console.log('📝 Step 3: Updating pillar with media files...');
          const updateResponse = await fetch('/api/content-pillars', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              id: newPillar.id,
              media_files: finalMediaFiles,
              media_files_a: pillarData.media_files_a || [],
              media_files_b: pillarData.media_files_b || []
            })
          });
          
          if (updateResponse.ok) {
            const updatedPillar = await updateResponse.json();
            setContentItems(prev => [...prev, updatedPillar]);
            console.log('✅ Step 3 complete: Pillar updated with media files');
          } else {
            console.warn('⚠️ Failed to update pillar with media files, but pillar exists');
          setContentItems(prev => [...prev, newPillar]);
          }
        } else {
          // No media files to add
          setContentItems(prev => [...prev, newPillar]);
          console.log('✅ New content pillar created successfully (no media files)');
        }
      }
    } catch (error) {
      console.error('❌ Error saving content pillar:', error);
      throw error;
    }
  };

  // Handle deleting content pillar from modal
  const handleDeleteContentPillar = async () => {
    if (!editingPillar) return;
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/content-pillars?id=${editingPillar.id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setContentItems(prev => prev.filter(pillar => pillar.id !== editingPillar.id));
        console.log('Content pillar deleted:', editingPillar.id);
      } else {
        throw new Error('Failed to delete content pillar');
      }
    } catch (error) {
      console.error('Error deleting content pillar:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 top-[72px] px-4 overflow-hidden">
        <div className="flex gap-3 pb-4 w-full h-full">
          {dayColumns.map(col => (
            <SkeletonColumn 
              key={col.key} 
              title={col.title} 
              icon={col.icon}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-[72px] px-4 overflow-hidden">
      <div className={`flex gap-3 pb-4 w-full h-full transition-all duration-700 ease-out transform ${
        columnsVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      }`}>
        {dayColumns.map(col => (
          <div
            key={col.key}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex flex-col flex-1 min-w-0"
          >
            {/* Column Header */}
            <div className="mb-2 px-1 flex items-center justify-between bg-black/50 backdrop-blur-sm pb-1.5 pt-0.5 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                {col.icon}
                <h3 className="text-[10px] font-medium text-white whitespace-nowrap">
                  {col.title}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <div className="bg-white/10 text-white/50 text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                  {groupedContent[col.key]?.length || 0}
                </div>
                <button 
                  onClick={() => handleOpenExamples(col.key)}
                  className="p-1 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-300 hover:text-blue-200 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 border border-blue-500/30"
                  title={`View content examples for ${col.title}`}
                >
                  <BookOpen className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => {
                    if (col.key === 'wednesday') {
                      setSelectedDay(col.key);
                      setSelectedDayTitle(col.title);
                      setAiGeneratedContent(null);
                      setEditingPillar(null);
                      setShowAIModal(true);
                    } else {
                      handleAIGenerate(col.key);
                    }
                  }}
                  disabled={col.key !== 'wednesday' && aiGenerating}
                  className="p-1 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300 hover:text-purple-200 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={col.key === 'wednesday' ? `Add new ${col.title}` : `AI Generate content for ${col.title}`}
                >
                  {aiGenerating && selectedDay === col.key && col.key !== 'wednesday' ? (
                    <div className="w-3 h-3 border border-purple-300 border-t-transparent rounded-full animate-spin" />
                  ) : col.key === 'wednesday' ? (
                    <Plus className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
              {groupedContent[col.key]?.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleEditContentPillar(item)}
                  className="group bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-2 hover:bg-black/40 hover:border-white/20 transition-all duration-200 cursor-pointer relative"
                >
                  <div className="flex gap-2">
                    {/* Content Type Icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center border border-white/10">
                      <div className="text-white/70">
                        {getContentTypeIcon(item.content_type)}
                      </div>
                    </div>
                    
                    {/* Content Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                      {/* Title */}
                      <div className="flex-shrink-0">
                        <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-1 group-hover:text-gray-100 transition-colors duration-200 uppercase">
                          {item.title}
                        </h4>
                      </div>
                      
                      {/* Description */}
                      {item.description && (
                        <div className="flex-shrink-0 mt-0.5">
                          <p className="text-[9px] text-white/60 line-clamp-2 leading-tight">
                            {item.description}
                          </p>
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="flex-shrink-0 space-y-0.5 text-xs mt-1">
                        {/* Content Type */}
                        <div className="flex items-center gap-1 text-white/70">
                          {getContentTypeIcon(item.content_type)}
                          <span className="truncate text-[9px] font-medium uppercase">{item.content_type}</span>
                        </div>
                        
                        {/* Created Date */}
                        <div className="flex items-center gap-1 text-white/60">
                          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="text-[8px]">Created {formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Push to Creative Hub Button */}
                  <div className="absolute bottom-1 right-1 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePushToCreativeHub(item);
                      }}
                      className="
                        p-1 rounded-full transition-all duration-200 
                        bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-300 opacity-0 group-hover:opacity-100 
                        hover:text-green-200 hover:from-green-500/30 hover:to-emerald-500/30
                        hover:shadow-lg hover:scale-110 border border-green-500/30
                        focus:outline-none focus:ring-2 focus:ring-green-400/50
                      "
                      title="Push to Creative Hub"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Bottom gradient line for visual separation */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
              ))}
              
              {/* Empty state */}
              {(!groupedContent[col.key] || groupedContent[col.key].length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-white/40 text-[10px] font-medium mb-2">No content planned</p>
                  <button className="text-white/60 hover:text-white text-[9px] underline transition-colors duration-200">
                    Add content pillar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Content Generation Modal */}
      <ContentPillarModal
        isOpen={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAiGeneratedContent(null);
          setEditingPillar(null);
          // Don't clear generated images on close - let them persist for reuse
          // Images will only be cleared when user explicitly requests it or creates new content
        }}
        onSave={handleSaveContentPillar}
        onDelete={editingPillar ? handleDeleteContentPillar : undefined}
        dayKey={selectedDay}
        dayTitle={selectedDayTitle}
        isEditing={!!editingPillar}
        editingItem={editingPillar}
        onRegenerate={aiGeneratedContent && !editingPillar ? handleAIRegenerate : undefined}
        aiGeneratedContent={aiGeneratedContent || undefined}
        generatedImageBase64={generatedImages[editingPillar ? editingPillar.id : `new_${selectedDay}`] || null}
        onGeneratedImageChange={(imageBase64) => {
          const pillarKey = editingPillar ? editingPillar.id : `new_${selectedDay}`;
          setGeneratedImages(prev => ({
            ...prev,
            [pillarKey]: imageBase64 || ''
          }));
        }}
      />

      {/* Content Examples Modal */}
      <ContentExamplesModal
        isOpen={showExamplesModal}
        onClose={() => setShowExamplesModal(false)}
        dayKey={selectedDay}
        dayTitle={selectedDayTitle}
        examples={contentExamples}
        onSaveExamples={handleSaveExamples}
      />
    </div>
  );
}
