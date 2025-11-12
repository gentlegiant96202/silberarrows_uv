// Simple background service worker for SilberArrows Car Filler extension
// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
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
  switch (message.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      handleSaveSettings(message.settings, sendResponse);
      return true;
      
    default:
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
    sendResponse({ success: false, error: error.message });
  }
}

// Save extension settings
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set(settings);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
