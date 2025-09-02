// Simple background service worker for SilberArrows Car Filler extension

console.log('SilberArrows background service worker loaded');

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SilberArrows Car Filler installed/updated:', details.reason);
  
  // Set default options
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      apiUrl: 'https://portal.silberarrows.com',
      autoFillEnabled: true,
      highlightFields: true
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
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Get extension settings
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'apiUrl',
      'autoFillEnabled',
      'highlightFields'
    ]);
    
    // Ensure defaults are set
    const defaultSettings = {
      apiUrl: 'https://portal.silberarrows.com',
      autoFillEnabled: true,
      highlightFields: true,
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
