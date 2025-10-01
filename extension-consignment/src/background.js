// Background script for SilberArrows Consignment Creator extension
console.log('SilberArrows Consignment Creator background script loaded');

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
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
      console.warn('Unknown message action:', message.action);
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
    
    console.log('Settings loaded:', finalSettings);
    sendResponse({ success: true, settings: finalSettings });
    
  } catch (error) {
    console.error('Error loading settings:', error);
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
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle consignment creation
async function handleCreateConsignment(consignmentData, sendResponse) {
  try {
    console.log('Creating consignment from background:', consignmentData);
    
    // Get API URL from settings
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || 'https://portal.silberarrows.com';
    
    console.log('API URL:', apiUrl);
    console.log('Request data:', JSON.stringify(consignmentData, null, 2));
    
    const response = await fetch(`${apiUrl}/api/consignments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consignmentData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response text first to debug
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
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
      console.error('Failed to parse JSON response:', e);
      console.error('Response text was:', responseText);
      throw new Error('Invalid JSON response from server');
    }
    
    console.log('Consignment created successfully:', result);
    
    sendResponse({ success: true, result });
    
  } catch (error) {
    console.error('Error creating consignment:', error);
    sendResponse({ success: false, error: error.message });
  }
}
