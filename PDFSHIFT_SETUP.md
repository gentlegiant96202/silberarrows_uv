# PDFShift Setup for Consignment PDF Generation

## Overview
This system generates professional PDF quotations for consignments using PDFShift API.

## Required Environment Variables

Add the following to your `.env.local` file:

```bash
# PDFShift API Key (required for PDF generation)
PDFSHIFT_API_KEY=your_pdfshift_api_key_here
```

## Getting PDFShift API Key

1. Go to [PDFShift.io](https://pdfshift.io/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your environment variables

## Features

- **Automatic PDF Generation**: PDFs are generated when saving negotiation details
- **Professional Styling**: Uses SilberArrows branding and styling
- **Dynamic Content**: Includes vehicle details, pricing options, and contact info
- **Conditional Layout**: Shows/hides purchase option based on data availability
- **PDF Storage**: PDF URLs are stored in the database for future access

## Database Changes

Run the following SQL to add PDF URL storage:

```sql
-- Add PDF URL field to consignments table
ALTER TABLE consignments 
ADD COLUMN IF NOT EXISTS pdf_quotation_url TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_consignments_pdf_url ON consignments(pdf_quotation_url);
```

## Usage

1. **Fill negotiation details** in the consignment modal
2. **Click Save** - PDF is automatically generated
3. **View/Download PDF** using the buttons in the negotiation section
4. **PDF is stored** in the database for future reference

## PDF Content

The generated PDF includes:
- SilberArrows branding and contact information
- Vehicle details (make, model, year, mileage, VIN)
- Direct purchase option (if price provided)
- Consignment program details
- Professional styling with gradients and modern design
- Quote validity period (7 days)

## Troubleshooting

- Ensure PDFShift API key is correctly set
- Check browser console for PDF generation errors
- Verify all required vehicle fields are filled before saving
- PDF generation only occurs for consignments in "negotiation" status
