import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to convert to title case where appropriate
function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase();
  });
}

export async function POST(req: NextRequest) {
  try {
    const carData = await req.json();
    
    const systemPrompt = `You are a luxury car advertisement writer. Create a compelling car advertisement for our website.

REQUIREMENTS:
- STRICT MAXIMUM 1500 characters - this is critical, do not exceed
- Write in a persuasive, professional tone suitable for luxury car sales
- Use title case for proper nouns where appropriate
- Include the car's key features naturally in the prose
- If your response approaches 1500 characters, cut it short to stay under the limit

Generate a description based on this format: "I need a car ad for our website, its a ${carData.model_year} ${carData.vehicle_model} ${carData.model_family} in ${carData.colour} with ${carData.interior_colour} interior, please do your online research on this model, key equipment as follows: ${carData.key_equipment}"

CAR DATA:
- Year: ${carData.model_year}
- Model: ${carData.vehicle_model} ${carData.model_family}
- Exterior Color: ${carData.colour}
- Interior Color: ${carData.interior_colour}
- Engine: ${carData.engine}
- Transmission: ${carData.transmission}
- Horsepower: ${carData.horsepower_hp} HP
- Torque: ${carData.torque_nm} Nm
- Displacement: ${carData.cubic_capacity_cc} cc
- Key Equipment: ${carData.key_equipment}

Create a professional luxury car advertisement that highlights the vehicle's premium features, performance, and desirability. Return ONLY the description text, no additional formatting or quotes.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 400, // Reduced to better ensure 1500 character limit
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the car advertisement description now. Remember: maximum 1500 characters.' }
      ]
    });

    const rawDescription = completion.choices[0].message?.content || '';
    
    // Apply title case formatting where appropriate
    let formattedDescription = rawDescription
      .replace(/mercedes[- ]?benz/gi, 'Mercedes-Benz')
      .replace(/\bmercedes\b/gi, 'Mercedes')
      .replace(/\bamg\b/gi, 'AMG')
      .replace(/\bgla\b/gi, 'GLA')
      .replace(/\bglc\b/gi, 'GLC')
      .replace(/\bgle\b/gi, 'GLE')
      .replace(/\bgls\b/gi, 'GLS')
      .replace(/\be-?class\b/gi, 'E-Class')
      .replace(/\bc-?class\b/gi, 'C-Class')
      .replace(/\bs-?class\b/gi, 'S-Class')
      .replace(/\ba-?class\b/gi, 'A-Class')
      .trim();

    // Final safety check - ensure we don't exceed 1500 characters
    if (formattedDescription.length > 1500) {
      formattedDescription = formattedDescription.substring(0, 1497) + '...';
    }

    return NextResponse.json({ 
      success: true, 
      description: formattedDescription
    });
  } catch (e: any) {
    console.error('generate-car-description error', e);
    return NextResponse.json({ 
      success: false, 
      error: e.message 
    }, { status: 500 });
  }
}