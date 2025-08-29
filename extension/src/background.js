// Background service worker for SilberArrows Car Filler extension

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SilberArrows Car Filler installed/updated:', details.reason);
  
  // Set default options
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      apiUrl: 'http://localhost:3001',
      autoFillEnabled: true,
      highlightFields: true,
      fieldMappings: getDefaultFieldMappings()
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      handleSaveSettings(message.settings, sendResponse);
      return true;
      
    case 'logFillResult':
      handleLogFillResult(message.result);
      break;
      
    default:
      console.warn('Unknown message action:', message.action);
  }
});

// Get extension settings
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'apiUrl',
      'autoFillEnabled',
      'highlightFields',
      'fieldMappings'
    ]);
    
    // Ensure defaults are set
    const defaultFieldMappings = getDefaultFieldMappings();
    const defaultSettings = {
      apiUrl: settings.apiUrl || 'http://localhost:3001',
      autoFillEnabled: settings.autoFillEnabled !== false, // Default to true
      highlightFields: settings.highlightFields !== false, // Default to true
      fieldMappings: settings.fieldMappings ? 
        // Merge stored mappings with defaults to ensure completeness
        {
          ...defaultFieldMappings,
          ...settings.fieldMappings,
          // Ensure silberarrows.com mappings are complete
          'silberarrows.com': {
            ...defaultFieldMappings['silberarrows.com'],
            ...(settings.fieldMappings['silberarrows.com'] || {})
          }
        } : defaultFieldMappings
    };
    
    console.log('🔧 Background: Sending settings with field mappings:', {
      apiUrl: defaultSettings.apiUrl,
      fieldMappingsKeys: Object.keys(defaultSettings.fieldMappings),
      silberarrowsMappingsCount: Object.keys(defaultSettings.fieldMappings['silberarrows.com'] || {}).length
    });
    
    sendResponse({ success: true, settings: defaultSettings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Save extension settings
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set(settings);
    console.log('Settings saved:', settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Log fill result for analytics
function handleLogFillResult(result) {
  console.log('Fill result:', result);
  
  // Store recent fill results (last 10)
  chrome.storage.local.get(['fillHistory'], (data) => {
    const history = data.fillHistory || [];
    history.unshift({
      ...result,
      timestamp: Date.now()
    });
    
    // Keep only last 10 results
    if (history.length > 10) {
      history.splice(10);
    }
    
    chrome.storage.local.set({ fillHistory: history });
  });
}

// Default field mappings for common car listing sites
function getDefaultFieldMappings() {
  return {
    // Generic selectors that work on most sites
    generic: {
      make: ['input[name*="make"]', 'select[name*="make"]', '#make', '.make'],
      model: ['input[name*="model"]', 'select[name*="model"]', '#model', '.model'],
      year: ['input[name*="year"]', 'select[name*="year"]', '#year', '.year'],
      price: ['input[name*="price"]', '#price', '.price'],
      mileage: ['input[name*="mileage"]', 'input[name*="odometer"]', '#mileage', '.mileage'],
      color: ['input[name*="color"]', 'select[name*="color"]', '#color', '.color'],
      transmission: ['select[name*="transmission"]', '#transmission', '.transmission'],
      engine: ['input[name*="engine"]', '#engine', '.engine'],
      description: ['textarea[name*="description"]', '#description', '.description'],
      bodyStyle: ['select[name*="body"]', 'select[name*="style"]', '#body-style', '.body-style', '#bodyStyle', '.bodyStyle'],
      serviceCare2Year: ['input[name*="servicecare"]', 'input[name*="service-care"]', 'input[name*="2year"]', 'input[name*="2-year"]'],
      serviceCare4Year: ['input[name*="servicecare"]', 'input[name*="service-care"]', 'input[name*="4year"]', 'input[name*="4-year"]']
    },
    
    // Site-specific mappings can be added here
    'silberarrows.com': {
      make: ['select[name="c-manufacturer"]'],
      model: ['input[name="c-title"]', '#c-title'],
      year: ['input[name="c-year"]', '#c-year'],
      price: ['input[name="c-price"]', '#c-price'],
      monthlyPrice: ['input[name="c-monthly-price"]', '#c-monthly-price'],
      mileage: ['input[name="c-mileage"]', '#c-mileage'],
      color: ['input[name="c-color"]', '#c-color'],
      interiorColor: ['input[name="c-trim"]', '#c-trim'],
      transmission: ['select[name="c-transmission"]', '#c-transmission'],
      fuelType: ['select[name="c-fuel-type"]', '#c-fuel-type'],
      regionalSpec: ['select[name="c-regional-spec"]', '#c-regional-spec'],
      condition: ['select[name="c-condition"]', '#c-condition'],
      description: ['textarea[name="c-description"]', '#c-description'],
      technicalData: ['textarea[name="c-technical-data"]', '#c-technical-data'],
      keyEquipment: ['textarea[name="c-key-equipment"]', '#c-key-equipment'],
      servicePackage: ['textarea[name="c-service-package"]', '#c-service-package'],
      stockNumber: ['input[name="c-stock-number"]', '#c-stock-number'],
      warranty: ['input[name="c-warranty"]', '#c-warranty'],
      youtubeId: ['input[name="c-yt-id"]', '#c-yt-id'],
      customerName: ['input[name="c-customer-name"]', '#c-customer-name'],
      bodyStyle: ['select[name="c-body-style"]', '#c-body-style', 'input[name="body-style"]', '#body-style'],
      categoryId: ['select[name="c-category-id"]', '#select-car-cat'],
      warrantyType: ['input[name="c-warranty-type"]'],
      serviceCare2Year: ['input[name="c-servicecare-price"]', '#c-servicecare-price'],
      serviceCare4Year: ['input[name="c-servicecare-price-4-years"]', '#c-servicecare-price-4-years']
    },
    
    'dubizzle.com': {
      // Updated field mappings based on comprehensive analysis
      title: ['#\\:r0\\:', 'textarea[name="title"]'], // Title textarea
      make: ['#category'], // MUI Autocomplete for make/category
      model: ['#motors_trim'], // MUI Autocomplete for model/trim
      year: ['input[name="year"]'], // Regular input field
      price: ['#\\:r3\\:', 'input[name="price"]'], // Price field with dynamic ID
      mileage: ['#\\:r5\\:', 'input[name="kilometers"]'], // Kilometers field with dynamic ID
      color: ['input[name="exterior_color"]'], // Regular input field
      interiorColor: ['input[name="interior_color"]'], // Regular input field
      transmission: ['input[name="transmission_type"]'], // Regular input field
      fuelType: ['input[name="fuel_type"]'], // Regular input field
      bodyStyle: ['input[name="body_type"]'], // Regular input field
      regionalSpec: ['input[name="regional_specs"]'], // Regular input field
      description: ['#\\:r4\\:', 'textarea[name="description"]'], // Description textarea with dynamic ID
      // Additional Dubizzle fields
      warranty: ['input[name="warranty"]'], // Regular input field
      doors: ['input[name="doors"]'], // Regular input field
      seatingCapacity: ['input[name="seating_capacity"]'], // Regular input field
      horsepower: ['input[name="horsepower"]'], // Regular input field
      steeringSide: ['input[name="steering_side"]'], // Regular input field
      targetMarket: ['input[name="target_market"]'], // Regular input field
      phoneNumber: ['input[name="phone_number"]'], // Regular input field
      whatsappNumber: ['input[name="whatsapp_number"]'], // Regular input field
      view360: ['#\\:r1\\:', 'input[name="view360"]'], // 360 Tour URL field
      images: ['input[type="file"]'] // File upload field
    },
    
    'autotrader.ae': {
      make: ['#make'],
      model: ['#model'],
      year: ['#year'],
      price: ['#price'],
      mileage: ['#mileage']
    }
  };
}

// Context menu setup (optional) - only if contextMenus permission is available
try {
  if (chrome.contextMenus) {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'fillCarData',
        title: 'Fill with SilberArrows car data',
        contexts: ['page', 'selection']
      });
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'fillCarData') {
        // Open popup or trigger fill directly
        chrome.action.openPopup();
      }
    });
  }
} catch (error) {
  console.log('Context menus not available:', error);
}
