// Background script for SilberArrows Consignment Creator extension
// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for response
      
    case 'saveSettings':
      handleSaveSettings(message.settings, sendResponse);
      return true;
      
    case 'createConsignment':
      handleCreateConsignment(message.consignmentData, sendResponse);
      return true;
      
    default:
  }
});

// Get extension settings
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'apiUrl',
      'autoCreate',
      'defaultStatus'
    ]);
    
    // Set defaults if not found
    const defaultSettings = {
      apiUrl: 'https://portal.silberarrows.com',
      autoCreate: false,
      defaultStatus: 'new_lead'
    };
    
    const finalSettings = { ...defaultSettings, ...settings };
    sendResponse({ success: true, settings: finalSettings });
    
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

// Handle consignment creation
async function handleCreateConsignment(consignmentData, sendResponse) {
  try {
    // Get API URL from settings
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || 'https://portal.silberarrows.com';
    const response = await fetch(`${apiUrl}/api/consignments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consignmentData)
    });
    // Get response text first to debug
    const responseText = await response.text();
    if (!response.ok) {
      // Try to parse as JSON, fallback to text
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      
      // Special handling for 405 Method Not Allowed
      if (response.status === 405) {
        errorMessage = 'API endpoint not available yet. Please try again in a few minutes or contact support.';
      }
      
      throw new Error(errorMessage);
    }
    
    // Try to parse JSON response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Invalid JSON response from server');
    }
    sendResponse({ success: true, result });
    
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
