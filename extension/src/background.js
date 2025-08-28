// Background service worker for SilberArrows Car Filler extension

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SilberArrows Car Filler installed/updated:', details.reason);
  
  // Set default options
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      apiUrl: 'http://localhost:3000',
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
    const defaultSettings = {
      apiUrl: 'http://localhost:3000',
      autoFillEnabled: true,
      highlightFields: true,
      fieldMappings: getDefaultFieldMappings(),
      ...settings
    };
    
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
      description: ['textarea[name*="description"]', '#description', '.description']
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
      customerName: ['input[name="c-customer-name"]', '#c-customer-name']
    },
    
    'dubizzle.com': {
      make: ['select[data-testid="make-select"]'],
      model: ['select[data-testid="model-select"]'],
      year: ['select[data-testid="year-select"]'],
      price: ['input[data-testid="price-input"]'],
      mileage: ['input[data-testid="mileage-input"]']
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

// Context menu setup (optional)
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
