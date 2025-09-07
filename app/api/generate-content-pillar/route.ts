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
const getRandomVisual = (contentType: string, existingPillars?: any[]): string => {
  const visuals = {
    image: [
      'Close-up of Mercedes diagnostic screen showing technical readings',
      'Mercedes engine bay with precision tools and measurement equipment',
      'STAR diagnostic system connected to Mercedes dashboard',
      'Mercedes brake system components with quality inspection tools',
      'AMG engine components during precision maintenance',
      'Mercedes transmission fluid analysis with laboratory equipment',
      'EQS electric system diagnostics with advanced testing tools',
      'Mercedes suspension components under detailed inspection',
      'Mercedes air conditioning system service with specialized tools',
      'Mercedes steering system alignment and calibration process',
      'Mercedes hybrid battery diagnostics and testing equipment',
      'Mercedes exhaust system inspection with emissions testing',
      'Mercedes wheel alignment and tire pressure monitoring setup',
      'Mercedes interior electronics diagnostic with multimeter readings',
      'Mercedes fuel injection system cleaning and testing procedure',
      'Mercedes cooling system pressure test with diagnostic equipment'
    ],
    video: [
      'Time-lapse of Mercedes service procedure with technical overlay',
      'Real-time diagnostic process on Mercedes STAR system',
      'Step-by-step Mercedes maintenance procedure demonstration',
      'Mercedes quality inspection process from start to finish',
      'Behind-the-scenes Mercedes technical training session',
      'Mercedes component replacement with precision tools',
      'Live Mercedes performance testing and calibration',
      'Mercedes road test with diagnostic equipment monitoring',
      'Mercedes service advisor explaining diagnostic results to customer',
      'Mercedes technician performing precision adjustments',
      'Mercedes software update and programming procedure',
      'Mercedes safety system calibration and testing'
    ],
    carousel: [
      'Multi-frame breakdown of Mercedes component inspection',
      'Step-by-step Mercedes diagnostic process visualization',
      'Before/after comparison of Mercedes service results',
      'Mercedes technical specifications and measurement data',
      'Comparison of genuine vs aftermarket Mercedes parts',
      'Mercedes service timeline and quality checkpoints',
      'Mercedes model-specific service requirements comparison',
      'Mercedes seasonal maintenance checklist breakdown',
      'Mercedes technology evolution across model years',
      'Mercedes service cost transparency breakdown'
    ],
    text: [
      'Mercedes technical diagram with measurement callouts',
      'Mercedes service documentation and certification process',
      'Mercedes technical bulletin and service advisory',
      'Mercedes performance data and analysis charts',
      'Mercedes service interval recommendations by model',
      'Mercedes diagnostic trouble code explanations',
      'Mercedes maintenance cost comparison analysis',
      'Mercedes technical specifications reference guide'
    ]
  };
  
  const options = visuals[contentType as keyof typeof visuals] || visuals.image;
  
  // If we have existing pillars, try to avoid similar visual concepts
  if (existingPillars && existingPillars.length > 0) {
    const usedConcepts = existingPillars.map((p: any) => p.description?.toLowerCase() || '').join(' ');
    const availableOptions = options.filter(visual => {
      const visualWords = visual.toLowerCase().split(' ');
      return !visualWords.some(word => usedConcepts.includes(word) && word.length > 4);
    });
    
    if (availableOptions.length > 0) {
      return availableOptions[Math.floor(Math.random() * availableOptions.length)];
    }
  }
  
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
    console.log(`🎯 Generating content for ${dayOfWeek}, type: ${contentType}`);
    console.log(`📊 Existing pillars count: ${existingPillars?.length || 0}`);
    
    if (existingPillars && existingPillars.length > 0) {
      console.log('🚨 ANTI-REPETITION MODE: Existing pillar titles:', existingPillars.map((p: any) => p.title));
      
      // Analyze existing content for variety tracking
      const allContent = existingPillars.map((p: any) => `${p.title} ${p.description}`).join(' ').toLowerCase();
      const models = ['s-class', 'e-class', 'c-class', 'amg', 'eqs', 'gle', 'gls', 'cla'];
      const systems = ['engine', 'transmission', 'brake', 'diagnostic', 'suspension', 'electrical'];
      const services = ['maintenance', 'repair', 'inspection', 'calibration', 'testing', 'replacement'];
      
      const usedModels = models.filter(model => allContent.includes(model));
      const usedSystems = systems.filter(system => allContent.includes(system));
      const usedServices = services.filter(service => allContent.includes(service));
      
      console.log('📈 Content analysis - Used models:', usedModels);
      console.log('🔧 Content analysis - Used systems:', usedSystems);
      console.log('⚙️ Content analysis - Used services:', usedServices);
    } else {
      console.log('✨ FRESH START: No existing pillars, generating original content');
    }
    
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
      friday: "true or false quiz questions about Mercedes automotive facts, technical knowledge, service myths",
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

    // Build existing pillars context with anti-repetition focus
    const existingPillarsContext = existingPillars && existingPillars.length > 0 
      ? `\nEXISTING CONTENT PILLARS FOR ${dayOfWeek.toUpperCase()} (${existingPillars.length} total):\n${existingPillars.map((pillar: any, index: number) => 
          `${index + 1}. TITLE: "${pillar.title}"\n   DESCRIPTION: ${pillar.description}\n   TYPE: ${pillar.content_type}`
        ).join('\n\n')}\n\n🚨 CRITICAL ANTI-REPETITION REQUIREMENTS:\n- DO NOT repeat any of the above titles or similar variations\n- DO NOT use the same Mercedes models, systems, or technical focus areas mentioned above\n- DO NOT repeat the same service aspects, themes, or messaging\n- CREATE COMPLETELY DIFFERENT and ORIGINAL content that covers NEW topics\n- AVOID similar wording, phrases, or concepts from existing pillars\n- Generate content that fills gaps NOT covered by existing pillars\n- Match the established style and business focus but with FRESH, UNIQUE topics`
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

    // Special handling for Friday "True or False" format
    if (dayOfWeek === 'friday') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.9,
        max_tokens: 1000,
        messages: [
          { role: 'system', content: `You are an expert Mercedes-Benz automotive specialist creating engaging true/false quiz questions for social media. Focus on interesting, educational, and sometimes surprising facts about Mercedes vehicles, technology, service, or automotive history.` },
          { role: 'user', content: `Create a TRUE or FALSE quiz question for Friday content. 

🎯 FORMAT REQUIRED:
QUESTION: [The true/false statement]
ANSWER: [TRUE or FALSE]
EXPLANATION: [2-3 sentences explaining why this is true/false, with interesting facts]

- Generate a statement that can be answered TRUE or FALSE
- Make it interesting and educational about Mercedes-Benz
- Keep it engaging for social media audience
- Focus on automotive facts, service knowledge, or technical details
- Provide the correct answer AND explanation with facts
- IMPORTANT: Generate both TRUE and FALSE questions for variety (don't always make them TRUE)

${existingPillars && existingPillars.length > 0 ? `
🚨 AVOID REPETITION - Existing Friday content:
${existingPillars.filter((p: any) => p.day_of_week === 'friday').map((p: any, i: number) => `${i + 1}. ${p.title || p.description}`).join('\n')}
` : ''}

Examples of good format:
QUESTION: Mercedes-AMG engines are hand-built by a single technician
ANSWER: TRUE
EXPLANATION: Each AMG engine is indeed hand-built by a single master technician at the AMG facility in Affalterbach, Germany. The technician signs a plaque that goes on the engine, making each one unique and traceable.

QUESTION: All Mercedes vehicles require premium fuel to maintain warranty
ANSWER: FALSE
EXPLANATION: Most modern Mercedes engines are designed to run on regular unleaded fuel (91 octane). Only high-performance AMG models specifically require premium fuel to maintain optimal performance and warranty coverage.

Respond with exactly the format above - QUESTION: [statement], ANSWER: [TRUE/FALSE], and EXPLANATION: [facts]` }
        ]
      });

      const responseText = completion.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      // Parse the question, answer, and explanation from the response
      const lines = responseText.trim().split('\n');
      let question = '';
      let answer = '';
      let explanation = '';
      
      for (const line of lines) {
        if (line.startsWith('QUESTION:')) {
          question = line.replace('QUESTION:', '').trim();
        } else if (line.startsWith('ANSWER:')) {
          answer = line.replace('ANSWER:', '').trim();
        } else if (line.startsWith('EXPLANATION:')) {
          explanation = line.replace('EXPLANATION:', '').trim();
        }
      }
      
      // Fallback if parsing fails
      if (!question || !answer) {
        question = responseText.trim().replace(/^["']|["']$/g, '');
        answer = 'TRUE'; // Default fallback
        explanation = 'Check with a Mercedes specialist for more details.';
      }
      
      const finalContent = {
        title: question, // Both templates use title for the question
        description: question, // Keep simple description 
        content_type: contentType,
        day_of_week: dayOfWeek,
        badge_text: 'TRUE OR FALSE',
        subtitle: `Answer: ${answer}`, // Answer for both templates
        // Additional fields for Template B
        fact: explanation, // Explanation for Template B
        problem: question,
        solution: `The answer is ${answer}. ${explanation}`
      };

      console.log('✅ Successfully generated Friday quiz:', { question, answer });
      return NextResponse.json({ 
        success: true, 
        data: finalContent 
      }, { status: 201 });
    }

    // Special handling for Monday "Myth-Buster Monday" format
    if (dayOfWeek === 'monday') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          { 
            role: 'system', 
            content: `OUTPUT RULES — TEXT ONLY
- Return plain text with exactly four labeled lines/blocks in this order:
  1) TITLE:
  2) SUBTITLE:
  3) MYTH:
  4) FACT:
- No emojis, no hashtags, no links, no extra sections. British English only.

ROLE & BRAND CONTEXT
You are a senior social media creative + technical service writer for **SilberArrows**, an independent Mercedes-Benz specialist in Dubai (sales, service, leasing).
Voice: premium, precise, reasons-first, non-salesy. Positioning: Independent ≠ corner-cutting. We follow factory procedures, use STAR/XENTRY diagnostics, torque-to-spec, and Mercedes-approved parts/fluids. Visual vibe (for writer context only): black primary, accent #d85050.

TASK
Write a "Myth-Buster Monday" post about the given topic. Make it authoritative and useful for UAE conditions (heat, dust, stop-go traffic).

${existingPillarsContext}

CONTENT REQUIREMENTS
- TITLE: "Myth-Buster Monday: {short topic}"
- SUBTITLE: One crisp line that reinforces SilberArrows' positioning (e.g., "Independent Mercedes-Benz Service • Factory Precision Without the Dealer").
- MYTH: One to two sentences stating the common misconception plainly.
- FACT: Three to five sentences that correct the myth using factory-accurate reasoning. Where relevant, include 1–3 specific, plausible Mercedes-relevant figures or specs (e.g., disc minimum thickness in mm, wheel bolt torque around ~130 Nm where appropriate, A/C centre-vent target ≤9°C at idle after 5 min in ~40–45°C ambient, MB 229.52 oil spec, XENTRY guided test names). Tie at least one point to UAE conditions. Mention at least one factory tool/standard by name (e.g., STAR/XENTRY, MB 229.x oils, DOT 4/4+).

STYLE GUARDRAILS
- Reasons first, then outcome. Keep it confident and helpful. No hype.
- Avoid placeholders like "X%" or "{value}"; state plausible figures when used.
- Do not add any sections beyond the four required.` 
          },
          { 
            role: 'user', 
            content: `Generate a unique Myth-Buster Monday post. Choose from these topics but make it completely different from existing content:

TOPIC OPTIONS (choose one that hasn't been covered):
- XENTRY vs generic scanners for Mercedes diagnostics
- A/C performance at 45°C UAE temperatures  
- Brake disc thickness & pad wear indicators
- EQS high voltage safety checks
- Coolant scale build-up in UAE heat
- Turbo care and maintenance
- Battery SOH vs SOC differences
- Independent service vs dealer service myths
- Oil change intervals in extreme heat
- Transmission service requirements
- Suspension component wear in UAE conditions
- Fuel system cleaning necessity

${existingPillars && existingPillars.length > 0 ? `
🚨 AVOID THESE ALREADY COVERED TOPICS:
${existingPillars.map((pillar: any, index: number) => `${index + 1}. "${pillar.title}" - Topic: ${pillar.description?.substring(0, 80)}...`).join('\n')}

Choose a COMPLETELY DIFFERENT topic from the list above that hasn't been covered.
` : ''}

FORMAT TO RETURN (exactly this structure):
TITLE: Myth-Buster Monday: {your short topic}
SUBTITLE: {one line reinforcing Independent + Factory Precision, Dubai context welcome}
MYTH: {1–2 sentences}
FACT: {3–5 sentences with factory tools/standards, 1–3 concrete figures if relevant, and a UAE heat/dust note}` 
          }
        ]
      });

      const responseText = completion.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      // Parse the Myth-Buster Monday format
      const lines = responseText.split('\n').filter(line => line.trim());
      let title = '', subtitle = '', myth = '', fact = '';
      
      for (const line of lines) {
        if (line.startsWith('TITLE:')) {
          title = line.replace('TITLE:', '').trim();
        } else if (line.startsWith('SUBTITLE:')) {
          subtitle = line.replace('SUBTITLE:', '').trim();
        } else if (line.startsWith('MYTH:')) {
          myth = line.replace('MYTH:', '').trim();
        } else if (line.startsWith('FACT:')) {
          fact = line.replace('FACT:', '').trim();
        }
      }

      // Create the final content structure for Monday
      const finalContent = {
        title: title || 'Myth-Buster Monday: Mercedes Service',
        description: `${myth} ${fact}`.trim(),
        content_type: contentType,
        badge_text: 'MYTH BUSTER MONDAY',
        subtitle: subtitle || 'Independent Mercedes-Benz Service • Factory Precision Without the Dealer',
        myth: myth,
        fact: fact,
        ai_response: { title, subtitle, myth, fact, raw_response: responseText }
      };

      console.log('✅ Successfully generated Myth-Buster Monday content:', finalContent.title);

      return NextResponse.json({
        success: true,
        data: finalContent
      });

    } else if (dayOfWeek === 'tuesday') {
      // Special handling for Tuesday "Tech Tips Tuesday" format
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          { 
            role: 'system', 
            content: `OUTPUT RULES — TEXT ONLY
- Return plain text with exactly six labeled lines/blocks in this order:
  1) TITLE:
  2) SUBTITLE:
  3) PROBLEM:
  4) SOLUTION:
  5) DIFFICULTY:
  6) TOOLS_NEEDED:
  7) WARNING: (optional)
- No emojis, no hashtags, no links, no extra sections. British English only.

ROLE & BRAND CONTEXT
You are a senior technical service writer for **SilberArrows**, an independent Mercedes-Benz specialist in Dubai (sales, service, leasing).
Voice: educational, precise, helpful, non-condescending. Positioning: Independent expertise with factory-level knowledge. We use STAR/XENTRY diagnostics, follow Mercedes procedures, and provide transparent customer education.

IMPORTANT: Always use "Mercedes-Benz" (with hyphen) instead of just "Mercedes" when referring to the brand.

TASK
Write a "Tech Tips Tuesday" post that educates Mercedes-Benz owners about a specific technical topic. Make it practical and relevant for UAE conditions (heat, dust, stop-go traffic).

${existingPillarsContext}

CONTENT REQUIREMENTS
- TITLE: "Tech Tips Tuesday: {clear, specific topic}"
- SUBTITLE: One crisp line that reinforces SilberArrows' expertise (e.g., "Expert Mercedes Knowledge • Independent Service Excellence").
- PROBLEM: What issue or challenge does this tip address? (1-2 sentences)
- SOLUTION: Step-by-step explanation with Mercedes-specific details (3-4 sentences, include specific procedures, tools, or specs where relevant)
- DIFFICULTY: Choose one: "DIY", "Professional Required", or "Inspection Only"
- TOOLS_NEEDED: What's required (e.g., "XENTRY diagnostic system", "Basic tools", "None - visual inspection only")
- WARNING: Safety considerations or warranty warnings (optional, 1 sentence if needed)

STYLE GUARDRAILS
- Educational first, not promotional. Focus on helping customers understand their Mercedes-Benz.
- Include specific Mercedes-Benz procedures, part numbers, or specifications where relevant.
- Tie to UAE conditions (heat, dust, traffic) when applicable.
- Mention factory tools/standards by name (STAR/XENTRY, MB specifications, etc.).
- Avoid overly technical jargon - explain in accessible terms.` 
          },
          { 
            role: 'user', 
            content: `Generate a unique Tech Tips Tuesday post. Choose from these topics but make it completely different from existing content:

TOPIC OPTIONS (choose one that hasn't been covered):
- Reading Mercedes-Benz dashboard warning lights correctly
- Understanding XENTRY diagnostic reports
- Checking brake fluid condition and color indicators
- Mercedes-Benz air filter inspection and replacement timing
- Understanding Mercedes-Benz service indicator reset procedures
- Checking tire pressure monitoring system (TPMS) alerts
- Mercedes-Benz battery health indicators and testing
- Understanding Mercedes-Benz oil life monitoring system
- Checking coolant levels and condition in UAE heat
- Mercedes-Benz transmission fluid service indicators
- Understanding Mercedes-Benz suspension warning signs
- Checking Mercedes-Benz A/C system performance
- Understanding Mercedes-Benz fuel system maintenance
- Mercedes-Benz brake pad wear indicator interpretation
- Understanding Mercedes-Benz steering system maintenance

${existingPillars && existingPillars.length > 0 ? `
🚨 AVOID THESE ALREADY COVERED TOPICS:
${existingPillars.map((pillar: any, index: number) => `${index + 1}. "${pillar.title}" - Topic: ${pillar.description?.substring(0, 80)}...`).join('\n')}

Choose a COMPLETELY DIFFERENT topic from the list above that hasn't been covered.
` : ''}

FORMAT TO RETURN (exactly this structure):
TITLE: Tech Tips Tuesday: {your specific topic}
SUBTITLE: {one line reinforcing Expert Knowledge + Independent Excellence}
PROBLEM: {1-2 sentences describing the issue/challenge}
SOLUTION: {3-4 sentences with Mercedes-specific procedures and details}
DIFFICULTY: {DIY, Professional Required, or Inspection Only}
TOOLS_NEEDED: {specific tools or "None" for visual inspection}
WARNING: {optional safety/warranty warning if needed, otherwise omit this line}` 
          }
        ]
      });

      const responseText = completion.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      // Parse the Tuesday response format
      let title = '';
      let subtitle = '';
      let problem = '';
      let solution = '';
      let difficulty = '';
      let tools_needed = '';
      let warning = '';

      const lines = responseText.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('TITLE:')) {
          title = line.replace('TITLE:', '').trim();
        } else if (line.startsWith('SUBTITLE:')) {
          subtitle = line.replace('SUBTITLE:', '').trim();
        } else if (line.startsWith('PROBLEM:')) {
          problem = line.replace('PROBLEM:', '').trim();
        } else if (line.startsWith('SOLUTION:')) {
          solution = line.replace('SOLUTION:', '').trim();
        } else if (line.startsWith('DIFFICULTY:')) {
          difficulty = line.replace('DIFFICULTY:', '').trim();
        } else if (line.startsWith('TOOLS_NEEDED:')) {
          tools_needed = line.replace('TOOLS_NEEDED:', '').trim();
        } else if (line.startsWith('WARNING:')) {
          warning = line.replace('WARNING:', '').trim();
        }
      }

      // Create the final content structure for Tuesday
      const finalContent = {
        title: title || 'Tech Tips Tuesday: Mercedes Knowledge',
        description: `${problem} ${solution}`.trim(),
        content_type: contentType,
        badge_text: 'TECH TIPS TUESDAY',
        subtitle: subtitle || 'Expert Mercedes Knowledge • Independent Service Excellence',
        problem: problem,
        solution: solution,
        difficulty: difficulty,
        tools_needed: tools_needed,
        warning: warning || null,
        ai_response: { title, subtitle, problem, solution, difficulty, tools_needed, warning, raw_response: responseText }
      };

      console.log('✅ Successfully generated Tech Tips Tuesday content:', finalContent.title);

      return NextResponse.json({
        success: true,
        data: finalContent
      });

    } else {
      // Original logic for other days
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: `${systemPrompt}\n\n${existingPillarsContext}` },
          { role: 'user', content: `Based on the theme "${selectedThemeTitle || 'Mercedes service'}" and content type "${contentType}", provide the structured input for the content example prompt:

VISUAL: ${getRandomVisual(contentType, existingPillars)}

STARTER_CAPTION: ${getRandomCaption(selectedThemeTitle)}

CTA: DM QUOTE for your next service.

🚨 CRITICAL ANTI-REPETITION REQUIREMENTS FOR ${dayOfWeek.toUpperCase()}:
${existingPillars && existingPillars.length > 0 ? `
EXISTING CONTENT ANALYSIS (${existingPillars.length} pillars):
${existingPillars.map((pillar: any, index: number) => `${index + 1}. "${pillar.title}" - ${pillar.description.substring(0, 100)}...`).join('\n')}

TOPICS/SYSTEMS ALREADY COVERED:
${(() => {
  const allContent = existingPillars.map((p: any) => `${p.title} ${p.description}`).join(' ').toLowerCase();
  const coveredTopics: string[] = [];
  
  // Check for Mercedes models
  const models = ['s-class', 'e-class', 'c-class', 'amg', 'eqs', 'gle', 'gls', 'cla', 'cls', 'slc', 'sl'];
  models.forEach(model => {
    if (allContent.includes(model)) coveredTopics.push(`${model.toUpperCase()} model`);
  });
  
  // Check for technical systems
  const systems = ['engine', 'transmission', 'brake', 'diagnostic', 'suspension', 'electrical', 'air conditioning', 'steering', 'fuel', 'cooling', 'exhaust'];
  systems.forEach(system => {
    if (allContent.includes(system)) coveredTopics.push(`${system} system`);
  });
  
  // Check for service types
  const services = ['maintenance', 'repair', 'inspection', 'calibration', 'testing', 'replacement', 'cleaning', 'alignment'];
  services.forEach(service => {
    if (allContent.includes(service)) coveredTopics.push(`${service} service`);
  });
  
  return coveredTopics.length > 0 ? coveredTopics.join(', ') : 'None identified';
})()}

🎯 GENERATE COMPLETELY NEW CONTENT THAT:
- Uses DIFFERENT Mercedes models/systems than those mentioned above
- Covers DIFFERENT technical aspects (if above covers engine, do brakes; if above covers diagnostics, do maintenance, etc.)
- Has DIFFERENT messaging and tone variations
- Focuses on DIFFERENT service benefits or customer pain points
- Uses DIFFERENT technical terminology and expertise areas
- Explores UNCOVERED topics from the analysis above
` : ''}
- Generate DIFFERENT topics each time (rotate between: diagnostics, maintenance, parts, customer service, technology, etc.)
- Use DIFFERENT Mercedes models/systems (S-Class, E-Class, AMG, EQS, C-Class, GLE, GLS, CLA, etc.)
- Vary the technical focus (engine, transmission, brakes, electronics, suspension, air conditioning, etc.)
- Create UNIQUE titles and descriptions that don't repeat existing ones
- Avoid repeating the same service aspects or technical details
- Each generation should cover a completely different aspect of Mercedes expertise
- Be creative with new angles: seasonal maintenance, technology updates, customer education, etc.` }
        ]
      });

      const responseText = completion.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response for non-Monday days
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

      // Create the final content structure for non-Monday days
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
    }

  } catch (error) {
    console.error('Error generating content pillar:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate content pillar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
