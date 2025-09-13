# Railway Renderer: Damage Report Endpoint

## Overview
This document describes the new `/render-damage-report` endpoint that needs to be added to your Railway renderer service to generate static damage report images.

## Endpoint Details

### URL
```
POST /render-damage-report
```

### Request Payload
```typescript
{
  carDetails: {
    stockNumber: string;
    modelYear: number;
    vehicleModel: string;
    colour: string;
    customerName?: string;
  },
  damageAnnotations: Array<{
    id: string;
    x: number;        // Pixel coordinate (0-2029)
    y: number;        // Pixel coordinate (0-765)
    damageType: string; // 'B', 'BR', 'C', 'CR', 'D', 'F', etc.
    severity: 'minor' | 'moderate' | 'major';
    description: string;
  }>,
  inspectionNotes: string;
  diagramImageUrl: string; // URL to Pre uvc-2.jpg
  timestamp: string; // ISO timestamp
}
```

### Response
```typescript
{
  success: boolean;
  damageReportImage?: string; // Base64 encoded PNG
  error?: string;
}
```

## Implementation Requirements

### 1. Template Processing
- Use the provided `damage-report-template.html`
- Replace template variables with actual data
- Calculate percentage positions for damage markers

### 2. Image Generation
- Render HTML template to high-resolution PNG (1200px width minimum)
- Ensure damage markers are positioned accurately on the car diagram
- Include all styling and formatting from template

### 3. Template Variables
```handlebars
{{TIMESTAMP}} - Full formatted timestamp
{{TIMESTAMP_SHORT}} - Short timestamp for report ID
{{STOCK_NUMBER}} - Car stock number
{{MODEL_YEAR}} - Vehicle model year
{{VEHICLE_MODEL}} - Vehicle model name
{{COLOUR}} - Vehicle colour
{{CUSTOMER_NAME}} - Consignment customer name (optional)
{{DIAGRAM_IMAGE_URL}} - URL to car diagram image
{{INSPECTION_NOTES}} - Free-form inspection notes
{{#each DAMAGE_MARKERS}} - Array of damage markers with:
  - {{damageType}} - Damage type code (B, BR, C, etc.)
  - {{severity}} - Severity level (minor/moderate/major)
  - {{x_percent}} - X position as percentage (0-100%)
  - {{y_percent}} - Y position as percentage (0-100%)
{{/each}}
```

### 4. Coordinate Conversion
Convert pixel coordinates to percentages:
```javascript
const x_percent = (marker.x / 2029) * 100;
const y_percent = (marker.y / 765) * 100;
```

## Sample Implementation (Node.js/Express)

```javascript
app.post('/render-damage-report', async (req, res) => {
  try {
    const { carDetails, damageAnnotations, inspectionNotes, diagramImageUrl, timestamp } = req.body;
    
    // Convert damage markers to template format
    const damageMarkers = damageAnnotations.map(marker => ({
      damageType: marker.damageType,
      severity: marker.severity,
      x_percent: (marker.x / 2029) * 100,
      y_percent: (marker.y / 765) * 100
    }));
    
    // Template data
    const templateData = {
      TIMESTAMP: new Date(timestamp).toLocaleString(),
      TIMESTAMP_SHORT: Date.now().toString().slice(-8),
      STOCK_NUMBER: carDetails.stockNumber,
      MODEL_YEAR: carDetails.modelYear,
      VEHICLE_MODEL: carDetails.vehicleModel,
      COLOUR: carDetails.colour,
      CUSTOMER_NAME: carDetails.customerName,
      DIAGRAM_IMAGE_URL: diagramImageUrl,
      INSPECTION_NOTES: inspectionNotes,
      DAMAGE_MARKERS: damageMarkers
    };
    
    // Render template
    const html = renderTemplate('damage-report-template.html', templateData);
    
    // Generate PNG image
    const imageBuffer = await generateImageFromHTML(html, {
      width: 1200,
      height: 1600,
      format: 'png'
    });
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    
    res.json({
      success: true,
      damageReportImage: base64Image
    });
    
  } catch (error) {
    console.error('Damage report generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## Testing

### Test Payload Example
```json
{
  "carDetails": {
    "stockNumber": "TEST123",
    "modelYear": 2020,
    "vehicleModel": "C-CLASS",
    "colour": "BLACK",
    "customerName": "John Smith"
  },
  "damageAnnotations": [
    {
      "id": "dmg_1",
      "x": 500,
      "y": 200,
      "damageType": "S",
      "severity": "minor",
      "description": "Small scratch on front bumper"
    }
  ],
  "inspectionNotes": "VEHICLE DAMAGE ASSESSMENT:\n\nS - SCRATCHED (MINOR): 1 location\n  1. Small scratch on front bumper",
  "diagramImageUrl": "https://silberarrows.vercel.app/Pre uvc-2.jpg",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Deployment Notes

1. Deploy the updated renderer service to Railway
2. Ensure the `/render-damage-report` endpoint is accessible
3. Test with the provided test payload
4. Verify image generation quality and positioning accuracy

## Files Provided

- `damage-report-template.html` - HTML template for rendering
- This documentation file
- API endpoint in Next.js app: `/api/generate-damage-report-image`

The Next.js application will call your Railway renderer service at:
`{RENDERER_URL}/render-damage-report`
