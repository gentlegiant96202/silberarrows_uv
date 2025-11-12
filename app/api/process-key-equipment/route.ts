import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { rawEquipment } = await req.json();
    
    // Extract equipment descriptions from the raw VIN data
    const equipmentList: string[] = [];
    
    // Process the raw equipment object to extract descriptions
    if (rawEquipment && typeof rawEquipment === 'object') {
      Object.values(rawEquipment).forEach((item: any) => {
        if (item && typeof item === 'object' && item.description) {
          const description = String(item.description).trim();
          if (description) {
            equipmentList.push(description);
          }
        }
      });
    }
    
    // Convert to uppercase, remove duplicates, sort alphabetically, and add hyphens
    const processedEquipment = Array.from(new Set(equipmentList))
      .map(item => `- ${item.toUpperCase()}`)
      .sort()
      .join('\n');
    return NextResponse.json({ 
      success: true, 
      equipment: processedEquipment 
    });
  } catch (e: any) {
    return NextResponse.json({ 
      success: false, 
      error: e.message 
    }, { status: 500 });
  }
}