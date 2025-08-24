import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Admin client for reading examples without RLS constraints
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Track last selected theme per day to avoid repetition
const lastSelectedThemeByDay: Record<string, string> = {};

// Helper functions for variety
const getRandomVisual = (contentType: string): string => {
  const visuals = {
    image: [
      'Close-up of Mercedes diagnostic screen showing technical readings',
      'Mercedes engine bay with precision tools and measurement equipment',
      'STAR diagnostic system connected to Mercedes dashboard',
      'Mercedes brake system components with quality inspection tools',
      'AMG engine components during precision maintenance',
      'Mercedes transmission fluid analysis with laboratory equipment',
      'EQS electric system diagnostics with advanced testing tools',
      'Mercedes suspension components under detailed inspection'
    ],
    video: [
      'Time-lapse of Mercedes service procedure with technical overlay',
      'Real-time diagnostic process on Mercedes STAR system',
      'Step-by-step Mercedes maintenance procedure demonstration',
      'Mercedes quality inspection process from start to finish',
      'Behind-the-scenes Mercedes technical training session',
      'Mercedes component replacement with precision tools',
      'Live Mercedes performance testing and calibration'
    ],
    carousel: [
      'Multi-frame breakdown of Mercedes component inspection',
      'Step-by-step Mercedes diagnostic process visualization',
      'Before/after comparison of Mercedes service results',
      'Mercedes technical specifications and measurement data',
      'Comparison of genuine vs aftermarket Mercedes parts',
      'Mercedes service timeline and quality checkpoints'
    ],
    text: [
      'Mercedes technical diagram with measurement callouts',
      'Mercedes service documentation and certification process',
      'Mercedes technical bulletin and service advisory',
      'Mercedes performance data and analysis charts'
    ]
  };
  
  const options = visuals[contentType as keyof typeof visuals] || visuals.image;
  return options[Math.floor(Math.random() * options.length)];
};

const getRandomCaption = (theme?: string | null): string => {
  const captions = [
    'Independent Mercedes service with factory-level precision and transparent pricing',
    'Expert Mercedes diagnostics using genuine procedures and advanced technology',
    'Professional Mercedes maintenance with certified technicians and quality assurance',
    'Precision Mercedes service combining technical expertise with customer transparency',
    'Advanced Mercedes diagnostics delivering accurate results and honest recommendations',
    'Mercedes service excellence through proven procedures and cutting-edge equipment',
    'Technical Mercedes expertise with transparent communication and fair pricing'
  ];
  
  const selected = captions[Math.floor(Math.random() * captions.length)];
  return theme ? `${theme}: ${selected}` : selected;
};

export async function POST(req: NextRequest) {
  try {
    const { dayOfWeek, contentType, businessContext, existingPillars } = await req.json();
    
    // Debug logging
    console.log(`Generating content for ${dayOfWeek}, type: ${contentType}`);
    console.log(`Existing pillars count: ${existingPillars?.length || 0}`);
    try {
      console.log('Existing pillar titles:', (existingPillars || []).map((p: any) => p.title));
    } catch {}
    
    // Define content types and their characteristics
    const contentTypePrompts = {
      image: "Create an engaging image post concept",
      video: "Create a compelling video content idea", 
      carousel: "Create a multi-slide carousel post concept",
      text: "Create an engaging text-only post"
    };

    // Define day-specific content themes
    const dayThemes = {
      monday: "motivation, new week energy, fresh starts, goal setting",
      tuesday: "tips, tutorials, educational content, how-to guides", 
      wednesday: "behind-the-scenes, team highlights, company culture",
      thursday: "testimonials, success stories, customer spotlights",
      friday: "celebration, achievements, weekend prep, fun content",
      saturday: "lifestyle, relaxation, personal interests, community",
      sunday: "reflection, inspiration, planning ahead, gratitude"
    };

    // Fetch content examples for the day to strengthen prompt context
    let contentExamples: any[] = [];
    try {
      const { data: examplesData, error: examplesError } = await supabaseAdmin
        .from('content_examples')
        .select('title, description, content_type, day_of_week')
        .eq('day_of_week', dayOfWeek)
        .order('created_at', { ascending: false });
      if (!examplesError && examplesData) {
        contentExamples = examplesData;
      }
      console.log(`Content examples for ${dayOfWeek}:`, contentExamples.length);
    } catch (e) {
      console.log('Skipping examples fetch due to error:', e instanceof Error ? e.message : e);
    }

    // Analyze existing pillars to determine business focus
    let businessFocus = "luxury automotive dealership";
    let businessDescription = "SilberArrows specializes in high-end luxury vehicles, providing exceptional customer service and premium automotive experiences.";
    
    if (existingPillars && existingPillars.length > 0) {
      // Analyze existing content to determine if it's service-focused or sales-focused
      const contentAnalysis = existingPillars.map((p: any) => `${p.title} ${p.description}`).join(' ').toLowerCase();
      
      if (contentAnalysis.includes('independent') || contentAnalysis.includes('service') || contentAnalysis.includes('repair') || contentAnalysis.includes('maintenance') || contentAnalysis.includes('diagnostic')) {
        businessFocus = "independent Mercedes service specialist";
        businessDescription = "SilberArrows is an independent Mercedes-Benz service specialist, providing expert maintenance, repairs, and diagnostics with genuine/OEM-quality parts and factory procedures at competitive prices.";
      }
    }

    // Build existing pillars context
    const existingPillarsContext = existingPillars && existingPillars.length > 0 
      ? `\nEXISTING CONTENT PILLARS FOR ${dayOfWeek.toUpperCase()}:\n${existingPillars.map((pillar: any, index: number) => 
          `${index + 1}. TITLE: "${pillar.title}"\n   DESCRIPTION: ${pillar.description}\n   TYPE: ${pillar.content_type}`
        ).join('\n\n')}\n\nCRITICAL ANALYSIS: Look at the themes, style, tone, and business focus of these existing pillars. Generate NEW content that EXACTLY matches this established style and business focus. Do NOT deviate from the pattern shown above.`
      : `\nNo existing content pillars found for ${dayOfWeek}. Create original automotive content based on business context.`;

    // Build examples context
    const contentExamplesContext = contentExamples && contentExamples.length > 0
      ? `\nCONTENT EXAMPLES FOR ${dayOfWeek.toUpperCase()}:\n${contentExamples.map((ex, index) =>
          `${index + 1}. TITLE: "${ex.title}"\n   DESCRIPTION: ${ex.description}\n   TYPE: ${ex.content_type}`
        ).join('\n\n')}\n\nUse these as strict reference points for style, theme, and structure.`
      : '';

    // Choose a theme fairly from unique examples for this day; avoid repeating last used
    const selectTheme = (): string | null => {
      const normalize = (s: string) => (s || '').trim().toLowerCase();
      
      // Build unique examples by title
      const exampleMap = new Map<string, any>();
      for (const ex of (contentExamples || [])) {
        const key = normalize(ex.title);
        if (key && !exampleMap.has(key)) exampleMap.set(key, ex);
      }
      const uniqueExamples = Array.from(exampleMap.values());
      
      // If we have examples, use them but add variation
      if (uniqueExamples.length > 0) {
        let pool = uniqueExamples;
        const last = lastSelectedThemeByDay[dayOfWeek];
        if (last && pool.length > 1) {
          pool = pool.filter(ex => normalize(ex.title) !== normalize(last));
        }
        if (pool.length > 0) {
          const idx = Math.floor(Math.random() * pool.length);
          return pool[idx].title || null;
        }
      }
      
      // If only one example or no examples, create variation themes
      const variationThemes = [
        'Technical Deep Dive',
        'Behind the Scenes',
        'Customer Success Story',
        'Maintenance Tip',
        'Diagnostic Insight',
        'Service Excellence',
        'Quality Assurance'
      ];
      
      const idx = Math.floor(Math.random() * variationThemes.length);
      return variationThemes[idx];
    };

    const selectedThemeTitle = selectTheme();
    if (selectedThemeTitle) {
      console.log('Selected theme:', selectedThemeTitle);
      // Remember last selected to avoid immediate repetition
      lastSelectedThemeByDay[dayOfWeek] = selectedThemeTitle;
    }

    // Use the content example prompt as the system prompt
    const systemPrompt = contentExamplesContext;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Based on the theme "${selectedThemeTitle || 'Mercedes service'}" and content type "${contentType}", provide the structured input for the content example prompt:

VISUAL: ${getRandomVisual(contentType)}

STARTER_CAPTION: ${getRandomCaption(selectedThemeTitle)}

CTA: DM QUOTE for your next service.

CRITICAL VARIETY REQUIREMENTS:
- Generate DIFFERENT topics each time (rotate between: diagnostics, maintenance, parts, customer service, technology, etc.)
- Use DIFFERENT Mercedes models/systems (S-Class, E-Class, AMG, EQS, C-Class, etc.)
- Vary the technical focus (engine, transmission, brakes, electronics, suspension, etc.)
- Create UNIQUE titles and descriptions that don't repeat existing ones
- Avoid repeating the same service aspects or technical details
- Each generation should cover a completely different aspect of Mercedes expertise` }
      ]
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let generatedContent;
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = responseText;
      if (responseText.includes('```json')) {
        cleanedResponse = responseText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (responseText.includes('```')) {
        cleanedResponse = responseText.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      generatedContent = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // If JSON parsing fails, try to extract content manually
      console.error('Failed to parse OpenAI response as JSON:', responseText);
      
      // Fallback: create a basic structure
      generatedContent = {
        title: `${dayOfWeek} ${contentType} Content`,
        description: responseText.substring(0, 300) + '...',
        content_type: contentType
      };
    }

    // Extract title and description from the complex JSON structure
    let title, description;
    
    if (generatedContent.hook && generatedContent.caption_final) {
      // New format from content example prompt
      title = generatedContent.hook;
      description = generatedContent.caption_final;
    } else if (generatedContent.title && generatedContent.description) {
      // Old format
      title = generatedContent.title;
      description = generatedContent.description;
    } else {
      throw new Error('Invalid response structure from OpenAI');
    }

    // Create the final content structure
    const finalContent = {
      title: title,
      description: description,
      content_type: contentType,
      // Include the full AI response for debugging/future use
      ai_response: generatedContent
    };

    console.log('✅ Successfully generated content pillar:', finalContent.title);

    return NextResponse.json({
      success: true,
      data: finalContent
    });

  } catch (error) {
    console.error('Error generating content pillar:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate content pillar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
