// Options page script for SilberArrows Car Filler extension

let currentSettings = {};

// DOM elements
const apiUrlInput = document.getElementById('apiUrl');
const autoFillEnabledCheckbox = document.getElementById('autoFillEnabled');
const highlightFieldsCheckbox = document.getElementById('highlightFields');
const newDomainInput = document.getElementById('newDomain');
const addDomainBtn = document.getElementById('addDomainBtn');
const mappingsList = document.getElementById('mappingsList');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Field names for mapping
const fieldNames = [
  'make', 'model', 'year', 'price', 'mileage', 'color', 'interiorColor',
  'transmission', 'engine', 'horsepower', 'displacement', 'description',
  'chassis', 'keys', 'fuelLevel'
];

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  renderMappings();
});

// Setup event listeners
function setupEventListeners() {
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetToDefaults);
  addDomainBtn.addEventListener('click', addNewDomain);
  
  // Auto-save on input changes
  [apiUrlInput, autoFillEnabledCheckbox, highlightFieldsCheckbox].forEach(input => {
    input.addEventListener('change', () => {
      showStatus('Settings will be saved when you click Save', 'info');
    });
  });
}

// Load current settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    
    if (response.success) {
      currentSettings = response.settings;
      populateForm();
    } else {
      throw new Error(response.error || 'Failed to load settings');
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus(`Error loading settings: ${error.message}`, 'error');
  }
}

// Populate form with current settings
function populateForm() {
  apiUrlInput.value = currentSettings.apiUrl || '';
  autoFillEnabledCheckbox.checked = currentSettings.autoFillEnabled !== false;
  highlightFieldsCheckbox.checked = currentSettings.highlightFields !== false;
}

// Render field mappings
function renderMappings() {
  const mappings = currentSettings.fieldMappings || {};
  
  mappingsList.innerHTML = '';
  
  Object.keys(mappings).forEach(domain => {
    if (domain === 'generic') return; // Skip generic, render it first
    
    const mappingDiv = createMappingDiv(domain, mappings[domain]);
    mappingsList.appendChild(mappingDiv);
  });
  
  // Always show generic mappings first
  if (mappings.generic) {
    const genericDiv = createMappingDiv('generic', mappings.generic, true);
    mappingsList.insertBefore(genericDiv, mappingsList.firstChild);
  }
}

// Create mapping div for a domain
function createMappingDiv(domain, mapping, isGeneric = false) {
  const div = document.createElement('div');
  div.className = 'mapping-item';
  div.dataset.domain = domain;
  
  div.innerHTML = `
    <div class="mapping-header">
      <div class="mapping-domain">
        ${isGeneric ? '🌐 Generic (Default)' : `🌍 ${domain}`}
      </div>
      ${!isGeneric ? `
        <button type="button" class="btn-remove" onclick="removeDomain('${domain}')">
          Remove
        </button>
      ` : ''}
    </div>
    
    ${fieldNames.map(fieldName => `
      <div class="form-group">
        <label for="${domain}-${fieldName}">${formatFieldName(fieldName)}</label>
        <input 
          type="text" 
          id="${domain}-${fieldName}"
          data-domain="${domain}"
          data-field="${fieldName}"
          value="${Array.isArray(mapping[fieldName]) ? mapping[fieldName].join(', ') : (mapping[fieldName] || '')}"
          placeholder="CSS selector(s), comma-separated"
        >
        <div class="help-text">
          Example: <span class="code">#${fieldName}, input[name="${fieldName}"], .${fieldName}</span>
        </div>
      </div>
    `).join('')}
  `;
  
  // Add event listeners to inputs
  div.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('change', updateMapping);
  });
  
  return div;
}

// Format field name for display
function formatFieldName(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Update mapping when input changes
function updateMapping(event) {
  const input = event.target;
  const domain = input.dataset.domain;
  const field = input.dataset.field;
  const value = input.value.trim();
  
  if (!currentSettings.fieldMappings) {
    currentSettings.fieldMappings = {};
  }
  
  if (!currentSettings.fieldMappings[domain]) {
    currentSettings.fieldMappings[domain] = {};
  }
  
  if (value) {
    // Convert comma-separated string to array
    currentSettings.fieldMappings[domain][field] = value.split(',').map(s => s.trim()).filter(s => s);
  } else {
    delete currentSettings.fieldMappings[domain][field];
  }
  
  showStatus('Settings updated. Click Save to persist changes.', 'info');
}

// Add new domain
function addNewDomain() {
  const domain = newDomainInput.value.trim().toLowerCase();
  
  if (!domain) {
    showStatus('Please enter a domain name', 'error');
    return;
  }
  
  if (currentSettings.fieldMappings && currentSettings.fieldMappings[domain]) {
    showStatus('Domain already exists', 'error');
    return;
  }
  
  // Add empty mapping for new domain
  if (!currentSettings.fieldMappings) {
    currentSettings.fieldMappings = {};
  }
  
  currentSettings.fieldMappings[domain] = {};
  
  // Re-render mappings
  renderMappings();
  
  // Clear input
  newDomainInput.value = '';
  
  showStatus(`Added ${domain}. Configure selectors and save.`, 'success');
}

// Remove domain
function removeDomain(domain) {
  if (confirm(`Remove all mappings for ${domain}?`)) {
    delete currentSettings.fieldMappings[domain];
    renderMappings();
    showStatus(`Removed ${domain}`, 'success');
  }
}

// Make removeDomain available globally
window.removeDomain = removeDomain;

// Save settings
async function saveSettings() {
  try {
    // Update settings from form
    currentSettings.apiUrl = apiUrlInput.value.trim();
    currentSettings.autoFillEnabled = autoFillEnabledCheckbox.checked;
    currentSettings.highlightFields = highlightFieldsCheckbox.checked;
    
    // Save to storage
    const response = await chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: currentSettings
    });
    
    if (response.success) {
      showStatus('Settings saved successfully!', 'success');
    } else {
      throw new Error(response.error || 'Failed to save settings');
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus(`Error saving settings: ${error.message}`, 'error');
  }
}

// Reset to defaults
async function resetToDefaults() {
  if (!confirm('Reset all settings to defaults? This will remove all custom field mappings.')) {
    return;
  }
  
  try {
    // Clear storage and reload defaults
    await chrome.storage.sync.clear();
    
    // Reload settings
    await loadSettings();
    renderMappings();
    
    showStatus('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showStatus(`Error resetting settings: ${error.message}`, 'error');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds for success/info messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}
