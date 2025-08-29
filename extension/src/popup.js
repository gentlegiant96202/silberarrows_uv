// Popup script for SilberArrows Car Filler extension
let allCars = [];
let selectedCar = null;

// DOM elements
const searchInput = document.getElementById('search');
const carList = document.getElementById('carList');
const fillBtn = document.getElementById('fillBtn');
const optionsBtn = document.getElementById('optionsBtn');
const statusDiv = document.getElementById('status');

// Settings panel elements
const mainPanel = document.getElementById('mainPanel');
const settingsPanel = document.getElementById('settingsPanel');
const backBtn = document.getElementById('backBtn');
const apiUrlInput = document.getElementById('apiUrl');
const autoFillCheckbox = document.getElementById('autoFillEnabled');
const highlightCheckbox = document.getElementById('highlightFields');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const settingsStatusDiv = document.getElementById('settingsStatus');

// API configuration - will be loaded from settings
let API_BASE = 'http://localhost:3001'; // Default fallback

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadCars();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  fillBtn.addEventListener('click', handleFill);
  optionsBtn.addEventListener('click', showSettings);
  backBtn.addEventListener('click', showMainPanel);
  saveSettingsBtn.addEventListener('click', saveSettings);
  resetSettingsBtn.addEventListener('click', resetSettings);
}

// Load cars from API
async function loadCars() {
  try {
    showStatus('Loading cars...', 'loading');
    
    const response = await fetch(`${API_BASE}/api/extension-car-data`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load cars');
    }
    
    allCars = data.cars || [];
    renderCarList(allCars);
    hideStatus();
    
  } catch (error) {
    console.error('Failed to load cars:', error);
    showStatus(`Error: ${error.message}`, 'error');
    carList.innerHTML = `
      <div class="status error">
        Failed to load cars. Check your connection.
      </div>
    `;
  }
}

// Render car list
function renderCarList(cars) {
  if (cars.length === 0) {
    carList.innerHTML = `
      <div class="status">
        No cars found matching your search.
      </div>
    `;
    return;
  }
  
  carList.innerHTML = cars.map(car => `
    <div class="car-option" data-car-id="${car.id}">
      <div class="name">${car.displayName}</div>
      <div class="price">AED ${formatPrice(car.price)}</div>
    </div>
  `).join('');
  
  // Add click listeners
  carList.querySelectorAll('.car-option').forEach(option => {
    option.addEventListener('click', () => selectCar(option.dataset.carId));
  });
}

// Handle search
function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    renderCarList(allCars);
    return;
  }
  
  const filtered = allCars.filter(car => 
    car.displayName.toLowerCase().includes(query) ||
    car.stockNumber.toLowerCase().includes(query)
  );
  
  renderCarList(filtered);
}

// Select a car
function selectCar(carId) {
  // Remove previous selection
  carList.querySelectorAll('.car-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // Add selection to clicked option
  const option = carList.querySelector(`[data-car-id="${carId}"]`);
  if (option) {
    option.classList.add('selected');
    selectedCar = allCars.find(car => car.id === carId);
    fillBtn.disabled = false;
  }
}

// Handle fill button click
async function handleFill() {
  if (!selectedCar) {
    showStatus('Please select a car first', 'error');
    return;
  }
  
  try {
    fillBtn.disabled = true;
    showStatus('Fetching car details...', 'loading');
    
    // Get detailed car data
    const response = await fetch(`${API_BASE}/api/extension-car-data?id=${selectedCar.id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch car details');
    }
    
    // Send data to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    console.log('Sending message to tab:', tab.id);
    console.log('Car data:', data.car);
    
    try {
      // First, ping the content script to see if it's responsive
      let contentScriptReady = false;
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        if (pingResponse && pingResponse.success) {
          contentScriptReady = true;
          console.log('Content script is already ready');
        }
      } catch (pingError) {
        console.log('Content script not responding to ping:', pingError);
      }
      
      // If content script isn't ready, try to inject it
      if (!contentScriptReady) {
        try {
          // Check if scripting API is available
          if (chrome.scripting && chrome.scripting.executeScript) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['src/content.js']
            });
            console.log('Content script injected via scripting API');
          } else {
            // Fallback: assume content script is loaded via manifest
            console.log('Scripting API not available, assuming content script is loaded via manifest');
          }
          
          // Wait for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Ping again to confirm it's ready
          const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          if (!pingResponse || !pingResponse.success) {
            throw new Error('Content script failed to initialize. Please refresh the page and try again.');
          }
          console.log('Content script is now ready after injection');
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          throw new Error('Could not load the extension on this page. Please refresh the page and try again.');
        }
      }
      
      // Send the fill message
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillCarData',
        carData: data.car
      });
      
      console.log('Fill message sent successfully:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fill car data');
      }
      
    } catch (messageError) {
      console.error('Failed to communicate with page:', messageError);
      throw messageError;
    }
    
    showStatus('Car data filled successfully!', 'success');
    
    // Auto-close popup after success
    setTimeout(() => {
      window.close();
    }, 1500);
    
  } catch (error) {
    console.error('Fill failed:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    fillBtn.disabled = false;
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['apiUrl', 'autoFillEnabled', 'highlightFields']);
    
    // Update API_BASE with saved URL
    API_BASE = result.apiUrl || 'http://localhost:3001';
    
    apiUrlInput.value = API_BASE;
    autoFillCheckbox.checked = result.autoFillEnabled !== false; // Default to true
    highlightCheckbox.checked = result.highlightFields !== false; // Default to true
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Set defaults
    API_BASE = 'http://localhost:3001';
    apiUrlInput.value = API_BASE;
    autoFillCheckbox.checked = true;
    highlightCheckbox.checked = true;
  }
}

// Show settings panel
function showSettings() {
  mainPanel.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
}

// Show main panel
function showMainPanel() {
  settingsPanel.classList.add('hidden');
  mainPanel.classList.remove('hidden');
}

// Save settings
async function saveSettings() {
  try {
    saveSettingsBtn.disabled = true;
    showSettingsStatus('Saving settings...', 'loading');
    
    // Get current settings to preserve field mappings
    const currentSettings = await chrome.storage.sync.get();
    
    const settings = {
      ...currentSettings, // Preserve existing settings including field mappings
      apiUrl: apiUrlInput.value.trim() || 'http://localhost:3001',
      autoFillEnabled: autoFillCheckbox.checked,
      highlightFields: highlightCheckbox.checked
    };
    
    await chrome.storage.sync.set(settings);
    
    // Update API_BASE with new URL
    API_BASE = settings.apiUrl;
    
    showSettingsStatus('Settings saved successfully!', 'success');
    
    // Auto-hide success message and go back to main panel
    setTimeout(() => {
      hideSettingsStatus();
      showMainPanel();
    }, 1500);
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showSettingsStatus(`Error: ${error.message}`, 'error');
  } finally {
    saveSettingsBtn.disabled = false;
  }
}

// Reset settings to default
async function resetSettings() {
  try {
    resetSettingsBtn.disabled = true;
    showSettingsStatus('Resetting settings...', 'loading');
    
    // Clear all stored settings first
    await chrome.storage.sync.clear();
    
    // Get fresh default settings from background script (includes field mappings)
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      // Save the complete default settings including field mappings
      await chrome.storage.sync.set(response.settings);
      
      // Update UI with the fresh settings
      apiUrlInput.value = response.settings.apiUrl;
      autoFillCheckbox.checked = response.settings.autoFillEnabled;
      highlightCheckbox.checked = response.settings.highlightFields;
      
      // Update API_BASE
      API_BASE = response.settings.apiUrl;
    }
    
    showSettingsStatus('Settings reset to default with complete field mappings!', 'success');
    
    setTimeout(() => {
      hideSettingsStatus();
    }, 3000);
    
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showSettingsStatus(`Error: ${error.message}`, 'error');
  } finally {
    resetSettingsBtn.disabled = false;
  }
}

// Show status message
function showStatus(message, type = 'loading') {
  statusDiv.className = `status ${type}`;
  statusDiv.innerHTML = type === 'loading' 
    ? `<span class="loading-spinner"></span>${message}`
    : message;
  statusDiv.classList.remove('hidden');
}

// Hide status message
function hideStatus() {
  statusDiv.classList.add('hidden');
}

// Show settings status message
function showSettingsStatus(message, type = 'loading') {
  settingsStatusDiv.className = `status ${type}`;
  settingsStatusDiv.innerHTML = type === 'loading' 
    ? `<span class="loading-spinner"></span>${message}`
    : message;
  settingsStatusDiv.classList.remove('hidden');
}

// Hide settings status message
function hideSettingsStatus() {
  settingsStatusDiv.classList.add('hidden');
}

// Format price with commas
function formatPrice(price) {
  if (!price) return 'N/A';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
