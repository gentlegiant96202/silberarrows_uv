# Quick Installation Guide

## Chrome/Edge Installation (Recommended for Testing)

1. **Open Extension Management**:
   - Chrome: Go to `chrome://extensions/`
   - Edge: Go to `edge://extensions/`

2. **Enable Developer Mode**:
   - Toggle "Developer mode" switch in the top-right corner

3. **Load the Extension**:
   - Click "Load unpacked"
   - Navigate to and select the `extension` folder
   - The extension should appear in your toolbar

4. **Configure API URL**:
   - Click the SilberArrows extension icon
   - Click "Settings" to open options
   - Set API URL to: `http://localhost:3000`
   - Save settings

## Test the Extension

1. **Verify Connection**:
   - Click the extension icon
   - You should see a list of cars from your inventory
   - If you see "Loading cars..." or errors, check:
     - Your SilberArrows server is running (`npm run dev`)
     - API URL is correct in settings
     - No CORS issues in browser console

2. **Test Auto-Fill**:
   - Go to any car listing website (e.g., Dubizzle, AutoTrader)
   - Click the extension icon
   - Select a car from your inventory
   - Click "Fill This Page"
   - Form fields should be automatically filled

## Safari Installation (macOS)

1. **Install Xcode** (if not already installed):
   ```bash
   # Install from Mac App Store or:
   xcode-select --install
   ```

2. **Convert Extension**:
   ```bash
   cd extension
   xcrun safari-web-extension-converter --macos-only --project-location ./safari-project ./
   ```

3. **Build in Xcode**:
   - Open the generated `.xcodeproj` file
   - Build the project (⌘+B)
   - Run the project (⌘+R)

4. **Enable in Safari**:
   - Safari > Preferences > Extensions
   - Enable "SilberArrows Car Filler"

## Troubleshooting

### Extension not loading cars
- Check browser console (F12) for errors
- Verify SilberArrows server is running on port 3000
- Test API directly: `curl http://localhost:3000/api/extension-car-data -X POST`

### Fields not being filled
- Open extension settings and check field mappings
- Use browser developer tools to inspect form field selectors
- Add custom selectors for specific websites

### Permission denied
- Ensure extension has permission for the current website
- Check that website URL matches manifest permissions

## Next Steps

1. **Customize Field Mappings**: Add selectors for your target websites
2. **Test on Real Sites**: Try Dubizzle, AutoTrader, etc.
3. **Package for Distribution**: Use `npm run package` for production builds

## Support

For issues or questions, check the main README.md or contact the development team.
