# SilberArrows Consignment Creator Extension

A Chrome/Edge extension that automatically extracts car details from listing websites and creates consignments in your SilberArrows CRM system.

## Features

- 🚗 **Smart Data Extraction**: Automatically extracts car details from various listing sites
- 🎯 **Multi-Site Support**: Works with Dubizzle, AutoTrader, Cars24, YallaMotor, OLX, and more
- ⚡ **One-Click Creation**: Extract data and create consignments with a single click
- 🔍 **Intelligent Parsing**: Automatically detects vehicle model, price, phone number, and more
- 🎨 **Clean Interface**: Simple, intuitive popup interface
- 🔒 **Secure**: Uses your existing SilberArrows API with proper authentication

## Supported Websites

- **Dubizzle.com** (UAE) - Full support
- **AutoTrader.ae** (UAE) - Full support  
- **Cars24.com** (UAE) - Full support
- **YallaMotor.com** (UAE) - Full support
- **OLX.com** (UAE) - Full support
- **Dubicars.com** (UAE) - Full support
- **Generic sites** - Basic extraction for unknown car listing sites

## Installation

### For Chrome/Edge

1. **Download the extension**:
   - Download or clone this repository
   - Navigate to the `extension-consignment` folder

2. **Enable Developer Mode**:
   - Open Chrome/Edge
   - Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `extension-consignment` folder
   - The extension should now appear in your toolbar

4. **Configure API URL** (if needed):
   - Click the extension icon
   - The extension will use `https://portal.silberarrows.com` by default
   - If your API is hosted elsewhere, you can modify the settings

## Usage

1. **Navigate to a car listing page**:
   - Go to any supported car listing website
   - Find a car listing you want to create a consignment for

2. **Open the extension**:
   - Click the SilberArrows Consignment Creator icon in your browser toolbar

3. **Extract car data**:
   - Click "Extract Car Data" button
   - The extension will automatically extract:
     - Vehicle model/title
     - Asking price
     - Phone number (if available)
     - Additional details for notes

4. **Create consignment**:
   - Review the extracted data
   - Click "Create Consignment" button
   - The consignment will be created in your SilberArrows CRM

5. **Success!**:
   - You'll see a success notification
   - The consignment will appear in your CRM's "New Lead" column

## Extracted Data Fields

The extension extracts the following information:

- **Vehicle Model**: Car title/name from the listing
- **Asking Price**: Price in AED (automatically parsed)
- **Phone Number**: Seller's contact number (if available)
- **Listing URL**: Original URL of the listing
- **Notes**: Additional details like year, mileage, color, specifications
- **Status**: Automatically set to "New Lead"
- **Source**: Tracks which website the data came from

## API Integration

The extension connects to your SilberArrows API at:

- `POST /api/consignments/create` - Creates new consignments

Make sure your SilberArrows server is running and accessible from your browser.

## Troubleshooting

### Extension not working
- Check that your SilberArrows server is running
- Verify the API URL in extension settings
- Check browser console for error messages
- Ensure you're on a supported car listing website

### Data not being extracted
- Make sure you're on a car listing page (not search results)
- Try refreshing the page and extracting again
- Some sites may have different layouts - the extension will try generic extraction

### Consignment not being created
- Check that your API endpoint is working
- Verify the consignment data is valid
- Check browser console for API error messages

## Development

### Project Structure
```
extension-consignment/
├── manifest.json              # Extension manifest (Manifest V3)
├── src/
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic and user interface
│   ├── background.js         # Service worker for API calls
│   ├── content.js            # Content script for page interaction
│   └── carDataExtractor.js   # Car data extraction logic
├── icons/                    # Extension icons (16, 32, 48, 128px)
└── README.md                # This file
```

### Adding New Sites

To add support for new car listing sites:

1. Open `src/carDataExtractor.js`
2. Add a new method for the site (e.g., `extractNewSiteData()`)
3. Add the domain to the `siteDetectors` object
4. Implement the extraction logic for that site's specific selectors

### Testing

1. Load the extension in developer mode
2. Navigate to a car listing page
3. Open the extension popup
4. Test the extraction and creation flow
5. Check the browser console for any errors

## Security Notes

- The extension only requests permissions for active tabs and storage
- API communication should use HTTPS in production
- The extension stores minimal settings locally using Chrome's storage API
- No sensitive data is stored in the extension

## License

This extension is part of the SilberArrows CRM system.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your SilberArrows API is accessible
3. Ensure you're on a supported car listing website
4. Contact your SilberArrows administrator
