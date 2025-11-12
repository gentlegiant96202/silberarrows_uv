import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contentType = 'image' } = body;
    // Get auth token for API call
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    // Fetch existing myth busters to avoid duplicates
    const { data: existingMythBusters, error: fetchError } = await supabase
      .from('myth_buster_monday')
      .select('title, myth, fact')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
    }

    // Create a list of existing content to avoid
    const existingContent = existingMythBusters?.map(item => 
      `${item.title} | ${item.myth} | ${item.fact}`
    ).join('\n') || '';
    // Call OpenAI API with specific constraints for Myth Buster Monday
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `OUTPUT RULES — TEXT ONLY
- Return plain text with exactly six labeled lines/blocks in this order:
  1) TITLE:
  2) MYTH:
  3) FACT:
  4) DIFFICULTY:
  5) TOOLS_NEEDED:
  6) WARNING:
- No emojis, no hashtags, no links, no extra sections. British English only.

ROLE & BRAND CONTEXT
You are a senior social media creative + technical service writer for **SilberArrows**, an independent Mercedes-Benz specialist in Dubai (sales, service, leasing).
Voice: premium, precise, reasons-first, non-salesy. Positioning: Independent ≠ corner-cutting. We follow factory procedures, use STAR/XENTRY diagnostics, torque-to-spec, and Mercedes-approved parts/fluids. Visual vibe (for writer context only): black primary, accent #d85050.

TASK
Write a "Myth-Buster Monday" post about the given topic. Make it authoritative and useful for UAE conditions (heat, dust, stop-go traffic).

EXISTING CONTENT TO AVOID DUPLICATING:
${existingContent}

CONTENT REQUIREMENTS
- TITLE: "{short topic}" (maximum 150 characters)
- MYTH: One to two sentences stating the common misconception plainly (maximum 500 characters)
- FACT: Three to five sentences that correct the myth using factory-accurate reasoning. Where relevant, include 1–3 specific, plausible Mercedes-relevant figures or specs (e.g., disc minimum thickness in mm, wheel bolt torque around ~130 Nm where appropriate, A/C centre-vent target ≤9°C at idle after 5 min in ~40–45°C ambient, MB 229.52 oil spec, XENTRY guided test names). Tie at least one point to UAE conditions. Mention at least one factory tool/standard by name (e.g., STAR/XENTRY, MB 229.x oils, DOT 4/4+). (maximum 600 characters)
- DIFFICULTY: Choose one: "Beginner", "Intermediate", or "Advanced" (maximum 50 characters)
- TOOLS_NEEDED: What's required (maximum 2 words only - e.g., "STAR scanner", "Basic tools", "OEM parts")
- WARNING: Safety considerations or warranty warnings (maximum 500 characters)

STYLE GUARDRAILS
- Reasons first, then outcome. Keep it confident and helpful. No hype.
- Avoid placeholders like "X%" or "{value}"; state plausible figures when used.
- Do not add any sections beyond the six required.
- Use specific Mercedes-Benz procedures, part numbers, or specifications where relevant.
- Tie to UAE conditions (heat, dust, traffic) when applicable.
- Mention factory tools/standards by name (STAR/XENTRY, MB specifications, etc.).`
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

${existingContent ? `
🚨 AVOID THESE ALREADY COVERED TOPICS:
${existingContent.split('\n').slice(0, 10).map((line, index) => `${index + 1}. ${line}`).join('\n')}

Choose a COMPLETELY DIFFERENT topic from the list above that hasn't been covered.
` : ''}

FORMAT TO RETURN (exactly this structure):
TITLE: {your short topic}
MYTH: {1–2 sentences}
FACT: {3–5 sentences with factory tools/standards, 1–3 concrete figures if relevant, and a UAE heat/dust note}
DIFFICULTY: {Beginner, Intermediate, or Advanced}
TOOLS_NEEDED: {2 words maximum}
WARNING: {safety/warranty warning if needed}`
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0]?.message?.content || '';
    // Parse the response
    const lines = responseText.split('\n').filter((line: string) => line.trim());
    let title = '', myth = '', fact = '', difficulty = '', tools_needed = '', warning = '';
    
    for (const line of lines) {
      if (line.startsWith('TITLE:')) {
        title = line.replace('TITLE:', '').trim();
      } else if (line.startsWith('MYTH:')) {
        myth = line.replace('MYTH:', '').trim();
      } else if (line.startsWith('FACT:')) {
        fact = line.replace('FACT:', '').trim();
      } else if (line.startsWith('DIFFICULTY:')) {
        difficulty = line.replace('DIFFICULTY:', '').trim();
      } else if (line.startsWith('TOOLS_NEEDED:')) {
        tools_needed = line.replace('TOOLS_NEEDED:', '').trim();
      } else if (line.startsWith('WARNING:')) {
        warning = line.replace('WARNING:', '').trim();
      }
    }

    // Validate and truncate if necessary
    title = title.substring(0, 150);
    myth = myth.substring(0, 500);
    fact = fact.substring(0, 600);
    difficulty = difficulty.substring(0, 50);
    // Enforce 2-word limit for tools_needed
    tools_needed = tools_needed.split(' ').slice(0, 2).join(' ');
    warning = warning.substring(0, 500);

    // Create the final content structure matching original format
    const finalContent = {
      title: title || 'Mercedes Service Myths',
      description: `${myth} ${fact}`.trim(),
      content_type: 'image',
      badge_text: 'MYTH BUSTER MONDAY',
      myth: myth || 'Common myth about Mercedes service',
      fact: fact || 'The actual fact that busts the myth',
      difficulty: difficulty || 'Intermediate',
      tools_needed: tools_needed || 'Basic tools',
      warning: warning || 'Always consult a professional for complex repairs',
      ai_response: { title, myth, fact, difficulty, tools_needed, warning, raw_response: responseText }
    };
    return NextResponse.json({
      success: true,
      data: finalContent
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
