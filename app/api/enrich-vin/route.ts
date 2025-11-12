import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const vinData = await req.json();
    const systemPrompt = `You are a vehicle-spec enrichment assistant.\nFrom the raw VIN-decode JSON, extract or infer and return ONLY this compact JSON object:\n{\n  \"engine\":        \"<cylinder layout + induction, UPPERCASE>\",\n  \"transmission\":  \"<marketing name, UPPERCASE>\",\n  \"horsepower_hp\": "<integer or integer (approx.)>",\n  \"torque_nm\":     "<integer or integer (approx.)>"\n}\nGuidelines:\n• Engine and transmission must be FULL CAPS, no internal codes. Examples: I6 TURBO, V8 BITURBO, 9G-TRONIC.\n• Always include horsepower_hp and torque_nm. If not present in data, estimate them; append " (approx.)" after each estimated number.\n• Never wrap the JSON in markdown, return the JSON object only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(vinData) }
      ]
    });

    const content = completion.choices[0].message?.content || '{}';
    let result: any = {};
    try {
      result = JSON.parse(content);
    } catch (_) {}

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
} 