import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { rawEquipment } = await req.json();
    
    const systemPrompt = `You are a vehicle equipment processor. Your task is to filter and format raw vehicle equipment data for customers.

CRITICAL REQUIREMENTS:
- MAXIMIZE output to use close to 1800 characters (aim for 1500-1800 characters)
- Convert ALL equipment names to UPPERCASE
- Sort alphabetically 
- Be LESS AGGRESSIVE in filtering - include more items to reach character limit
- Remove only obvious technical codes and internal part numbers
- Simplify technical names but KEEP most equipment items
- Format as a clean list with each item on a new line

FILTERING STRATEGY:
- INCLUDE: All safety features, comfort items, luxury amenities, performance features, technology, audio, navigation, lighting, seating, climate control, convenience features, exterior features, wheels/tires
- EXCLUDE ONLY: Obviously meaningless codes like "XYZ123", pure internal identifiers, basic standard equipment everyone expects
- SIMPLIFY: Make technical names customer-friendly but don't remove the equipment entirely
- AIM FOR QUANTITY: Include as many relevant items as possible to reach near 1800 characters

Raw equipment data: ${JSON.stringify(rawEquipment)}

Process this equipment list and return a comprehensive formatted list. Aim to use most of the 1800 character limit by including all equipment that adds value or interest for luxury car buyers. Each item should be in UPPERCASE and on a new line.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Process the equipment list now. Remember to include as many relevant items as possible to use close to the 1800 character limit.' }
      ]
    });

    const rawResult = completion.choices[0].message?.content || '';
    
    // Split into lines, filter empty lines, sort alphabetically, and join
    const processedEquipment = rawResult
      .split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(line => line.length > 0 && !line.match(/^[-•*]?\s*$/))
      .sort()
      .join('\n');

    // Ensure we don't exceed 1800 characters but keep as much as possible
    let finalEquipment = processedEquipment;
    if (finalEquipment.length > 1800) {
      // Find the last complete line that fits within 1800 characters
      const lines = finalEquipment.split('\n');
      let currentLength = 0;
      let includedLines = [];
      
      for (const line of lines) {
        if (currentLength + line.length + 1 <= 1800) { // +1 for newline
          includedLines.push(line);
          currentLength += line.length + 1;
        } else {
          break;
        }
      }
      
      finalEquipment = includedLines.join('\n');
    }

    console.log(`Key equipment processing: Raw input ${JSON.stringify(rawEquipment).length} chars, Output ${finalEquipment.length} chars`);
    
    return NextResponse.json({ 
      success: true, 
      equipment: finalEquipment 
    });
  } catch (e: any) {
    console.error('process-key-equipment error', e);
    return NextResponse.json({ 
      success: false, 
      error: e.message 
    }, { status: 500 });
  }
} 