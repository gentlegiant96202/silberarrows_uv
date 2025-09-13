# SilberArrows Car Filler Extension

A Safari/Chrome extension that automatically fills car listing forms with data from your SilberArrows inventory system.

## Features

- 🚗 **Smart Car Selection**: Search and select cars from your inventory
- 🎯 **Intelligent Field Mapping**: Automatically detects and fills form fields on car listing websites
- ⚙️ **Configurable Mappings**: Customize CSS selectors for different websites
- 🎨 **Visual Feedback**: Highlights filled fields and shows success notifications
- 🔒 **Secure**: Uses your existing SilberArrows API with proper authentication

## Installation

### For Safari (macOS)

1. **Install Safari Web Extension Converter** (if not already installed):
   ```bash
   # Install Xcode command line tools if needed
   xcode-select --install
   
   # The converter is included with Xcode
   ```

2. **Convert the extension**:
   ```bash
   # From the extension directory
   xcrun safari-web-extension-converter --macos-only --project-location ./safari-project ./
   ```

3. **Build and install**:
   - Open the generated Xcode project
   - Build the project (⌘+B)
   - Run the project (⌘+R) to install the extension
   - Enable the extension in Safari Preferences > Extensions

### For Chrome/Edge

1. **Enable Developer Mode**:
   - Open Chrome/Edge
   - Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"

2. **Load the extension**:
   - Click "Load unpacked"
   - Select the `extension` folder
   - The extension should now appear in your toolbar

## Setup

1. **Configure API URL**:
   - Click the extension icon in your browser toolbar
   - Click "Settings" to open the options page
   - Set the API URL to your SilberArrows server (e.g., `http://localhost:3000`)

2. **Test the connection**:
   - Click the extension icon
   - You should see a list of available cars from your inventory

## Usage

1. **Navigate to a car listing website** (e.g., Dubizzle, AutoTrader, etc.)

2. **Open the extension popup**:
   - Click the SilberArrows icon in your browser toolbar
   - Or use the keyboard shortcut (if configured)

3. **Select a car**:
   - Search for the car you want to list
   - Click on the car to select it

4. **Fill the form**:
   - Click "Fill This Page"
   - The extension will automatically detect and fill form fields
   - Filled fields will be highlighted briefly

## Supported Fields

The extension can fill the following car data fields:

- **Basic Info**: Make, Model, Year, Price, Mileage
- **Details**: Color, Interior Color, Transmission, Engine, Horsepower
- **Specifications**: Regional Spec, Condition, Chassis Number, Body Style
- **Content**: Description, Technical Data, Key Equipment
- **Business**: Stock Number, Warranty, Service Package
- **ServiceCare**: 2-Year Price, 4-Year Price (parsed from inventory service text)
- **Media**: YouTube Video ID, Customer Name

### New Fields Added

- **Body Style**: Vehicle body type (Coupe, Convertible, Estate, etc.)
- **ServiceCare 2 Year**: Automatically parsed from inventory service text
- **ServiceCare 4 Year**: Automatically parsed from inventory service text

The ServiceCare fields are automatically extracted from text like:
`"SILBERARROWS SERVICECARE AVAILABLE - 2YR: AED 33333, 4YR: AED 44444"`

## Supported Websites

The extension includes built-in support for:
- **Generic forms** (works on most car listing sites)
- **Dubizzle.com** (UAE)
- **AutoTrader.ae** (UAE)

### Adding Custom Sites

1. Open the extension settings (click Settings in the popup)
2. Add a new site by entering the domain name
3. Configure CSS selectors for each field type
4. Save your settings

### Field Mapping Examples

```css
/* Input fields */
input[name="make"]
#vehicle-make
.car-make-input

/* Select dropdowns */
select[data-field="model"]
#model-select

/* Textareas */
textarea[name="description"]
#car-description
```

## API Integration

The extension connects to your SilberArrows API at these endpoints:

- `GET /api/extension-car-data?id={carId}` - Get detailed car data
- `POST /api/extension-car-data` - List available cars

Make sure your SilberArrows server is running and accessible from your browser.

## Troubleshooting

### Extension not loading cars
- Check that your SilberArrows server is running
- Verify the API URL in extension settings
- Check browser console for error messages

### Fields not being filled
- Open extension settings and verify field mappings for the current site
- Use browser developer tools to inspect form field selectors
- Add custom selectors for the specific website

### Permission issues
- Ensure the extension has permission to access the current website
- Check that the website URL matches the patterns in the manifest

## Development

### Project Structure
```
extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── src/
│   ├── popup.html        # Extension popup UI
│   ├── popup.js          # Popup logic and car selection
│   ├── background.js     # Service worker for settings and messaging
│   └── content.js        # Content script for form filling
├── options/
│   ├── options.html      # Settings page UI
│   └── options.js        # Settings page logic
├── icons/               # Extension icons (16, 32, 48, 128px)
└── README.md           # This file
```

### Building for Production

1. **Update version** in `manifest.json`
2. **Test thoroughly** on target websites
3. **Package for distribution**:
   ```bash
   # Create zip for Chrome Web Store
   zip -r silberarrows-car-filler.zip extension/ -x "*.DS_Store" "*/.*"
   ```

### API Endpoint

The extension requires a compatible API endpoint in your SilberArrows application:

```typescript
// app/api/extension-car-data/route.ts
export async function GET(request: NextRequest) {
  // Return car details by ID or stock number
}

export async function POST(request: NextRequest) {
  // Return list of available cars
}
```

## Security Notes

- The extension only requests permissions for active tabs and storage
- API communication should use HTTPS in production
- Consider implementing API authentication for production use
- The extension stores settings locally using Chrome's storage API

## License

This extension is part of the SilberArrows CRM system.
