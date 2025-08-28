// Content script for SilberArrows Car Filler extension
console.log('SilberArrows Car Filler content script loaded');

let extensionSettings = null;
let lastFilledFields = [];
let imageUploadInProgress = false;

// Initialize content script
(async function init() {
  try {
    // Get extension settings
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      extensionSettings = response.settings;
      console.log('Extension settings loaded:', extensionSettings);
    }
  } catch (error) {
    console.error('Failed to load extension settings:', error);
  }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.action) {
    case 'ping':
      console.log('Content script responding to ping');
      sendResponse({ success: true, message: 'Content script is ready' });
      return true; // Keep message channel open for response
      
    case 'fillCarData':
      handleFillCarData(message.carData)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'clearHighlights':
      clearFieldHighlights();
      sendResponse({ success: true });
      return true; // Keep message channel open for response
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
      return true; // Keep message channel open for response
  }
});

// Main function to fill car data
async function handleFillCarData(carData) {
  console.log('Filling car data:', carData);
  
  try {
    // Check for CKEditor
    console.log('🔍 CKEditor available:', !!window.CKEDITOR);
    if (window.CKEDITOR) {
      console.log('🔍 CKEditor instances:', Object.keys(window.CKEDITOR.instances));
    }
    
    // Clear previous highlights
    clearFieldHighlights();
    
    // Get field mappings for current site
    const mappings = getFieldMappings();
    
    // Fill each field
    const results = {
      filled: [],
      failed: [],
      carData: {
        stockNumber: carData.stockNumber,
        model: carData.model,
        year: carData.year
      }
    };
    
    // Map car data to form fields - MUST match the mapping keys exactly
    const fieldData = {};
    
    // Only add fields that have mappings and values
    if (carData.make) fieldData.make = carData.make;
    if (carData.model) fieldData.model = carData.model; // Don't include year - it has separate field
    if (carData.year) fieldData.year = carData.year.toString();
    if (carData.price) fieldData.price = carData.price.toString();
    if (carData.monthlyPayment0Down) fieldData.monthlyPrice = carData.monthlyPayment0Down.toString();
    if (carData.mileage) fieldData.mileage = carData.mileage.toString();
    if (carData.color) fieldData.color = carData.color;
    if (carData.interiorColor) fieldData.interiorColor = carData.interiorColor;
    if (carData.transmission) fieldData.transmission = carData.transmission;
    if (carData.fuelType) fieldData.fuelType = carData.fuelType;
    if (carData.specification) fieldData.regionalSpec = carData.specification;
    fieldData.condition = 'Used'; // Default
    if (carData.description) fieldData.description = carData.description;
    if (carData.engine || carData.horsepower) fieldData.technicalData = formatTechnicalData(carData);
    if (carData.keyEquipment) fieldData.keyEquipment = carData.keyEquipment;
    if (carData.monthlyPayment0Down) fieldData.servicePackage = formatServicePackage(carData);
    if (carData.stockNumber) fieldData.stockNumber = carData.stockNumber;
    if (carData.warrantyType || carData.warrantyDate) fieldData.warranty = formatWarranty(carData);
    if (carData.bodyStyle) fieldData.bodyStyle = carData.bodyStyle;
    if (carData.modelFamily) fieldData.categoryId = carData.modelFamily; // Connect model family to category
    if (carData.warrantyType) fieldData.warrantyType = carData.warrantyType;
    // Don't set raw warrantyDate - use formatted warranty instead
    if (carData.serviceCare2Year) fieldData.serviceCare2Year = carData.serviceCare2Year.toString();
    if (carData.serviceCare4Year) fieldData.serviceCare4Year = carData.serviceCare4Year.toString();
    
    console.log('🔍 Debug - Field data keys:', Object.keys(fieldData));
    console.log('🔍 Debug - Mapping keys:', Object.keys(mappings));
    
    // Handle image uploads if available
    if (carData.images && carData.images.length > 0) {
      console.log(`🖼️ Found ${carData.images.length} images to upload`);
      // We'll handle images after text fields are filled
      setTimeout(() => handleImageUploads(carData.images), 2000);
    }
    
    // Fill each field
    console.log('🔍 Debug - Starting to fill fields with data:', fieldData);
    console.log('🔍 Debug - Available mappings:', mappings);
    
    for (const [fieldName, value] of Object.entries(fieldData)) {
      if (!value) {
        console.log(`⏭️ Skipping ${fieldName} - no value`);
        continue;
      }
      
      // Handle special fields that require radio button selection
      if (fieldName === 'warranty') {
        await revealWarrantyField(value);
      }
      
      // Handle warranty type radio buttons
      if (fieldName === 'warrantyType') {
        await handleWarrantyTypeSelection(value);
        continue; // Skip normal field filling for radio buttons
      }
      
      // Handle warranty date - needs delay after warranty type selection
      if (fieldName === 'warrantyDate') {
        // Wait a bit for the warranty field to become visible
        await new Promise(r => setTimeout(r, 300));
      }

      console.log(`🔍 Processing field: ${fieldName} = ${value}`);
      const selectors = mappings[fieldName] || [];
      console.log(`🔍 Selectors for ${fieldName}:`, selectors);
      
      const element = findElement(selectors);
      
      if (element) {
        const success = await fillElement(element, value, fieldName);
        if (success) {
          results.filled.push({ field: fieldName, value, element: element.tagName });
          if (extensionSettings?.highlightFields) {
            highlightElement(element);
          }
        } else {
          results.failed.push({ field: fieldName, reason: 'Fill failed' });
        }
      } else {
        results.failed.push({ field: fieldName, reason: 'Element not found' });
      }
    }
    
    // Log results
    chrome.runtime.sendMessage({
      action: 'logFillResult',
      result: {
        url: window.location.href,
        domain: window.location.hostname,
        ...results
      }
    });
    
    // Show summary notification
    showFillSummary(results);
    
    return results;
    
  } catch (error) {
    console.error('Fill operation failed:', error);
    throw error;
  }
}

// Get field mappings for current site
function getFieldMappings() {
  const domain = window.location.hostname;
  const settings = extensionSettings?.fieldMappings || {};
  
  console.log('🔍 Debug - Current domain:', domain);
  console.log('🔍 Debug - Extension settings:', extensionSettings);
  console.log('🔍 Debug - Field mappings:', settings);
  
  // Fallback to hardcoded mappings if settings not loaded
  const fallbackMappings = domain === 'www.silberarrows.com' ? {
    // SilberArrows WordPress form mappings
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
    categoryId: ['select[name="c-category-id"]', '#select-car-cat'],
    warrantyType: ['input[name="c-warranty-type"]'],
    bodyStyle: ['select[name="c-body-style"]', '#c-body-style', 'input[name="c-body-style"]'],
    serviceCare2Year: ['input[name="c-servicecare-price"]', '#c-servicecare-price'],
    serviceCare4Year: ['input[name="c-servicecare-price-4-years"]', '#c-servicecare-price-4-years']
  } : {
    // Generic fallback mappings
    make: ['#make', 'input[name="make"]', 'select[name="make"]'],
    model: ['#model', 'input[name="model"]', 'select[name="model"]'],
    year: ['#year', 'input[name="year"]', 'select[name="year"]'],
    price: ['#price', 'input[name="price"]'],
    mileage: ['#mileage', 'input[name="mileage"]'],
    color: ['#color', 'input[name="color"]'],
    transmission: ['#transmission', 'select[name="transmission"]'],
    engine: ['#engine', 'input[name="engine"]'],
    horsepower: ['#horsepower', 'input[name="horsepower"]'],
    chassis: ['#chassis', 'input[name="chassis"]'],
    description: ['#description', 'textarea[name="description"]'],
    bodyStyle: ['#body-style', 'select[name="body-style"]', '#bodyStyle', 'select[name="bodyStyle"]'],
    categoryId: ['#select-car-cat', 'select[name="category"]'],
    warrantyType: ['input[name="warranty-type"]'],
    serviceCare2Year: ['#servicecare-2year', 'input[name="servicecare-2year"]', '#servicecare-2-year-price'],
    serviceCare4Year: ['#servicecare-4year', 'input[name="servicecare-4year"]', '#servicecare-4-year-price']
  };
  
  // Try site-specific mappings first
  if (settings[domain]) {
    console.log('✅ Using site-specific mappings for:', domain);
    return { ...settings.generic, ...settings[domain] };
  }
  
  // Use generic mappings from settings or fallback
  const genericMappings = settings.generic || fallbackMappings;
  const mappingType = domain === 'www.silberarrows.com' ? 'SilberArrows-specific' : 'generic';
  console.log(`✅ Using ${mappingType} mappings for:`, domain, genericMappings);
  return genericMappings;
}

// Find element using multiple selectors
function findElement(selectors) {
  if (!Array.isArray(selectors)) {
    console.warn('🔍 Debug - Selectors not an array:', selectors);
    return null;
  }
  
  console.log('🔍 Debug - Trying selectors:', selectors);
  
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      console.log(`🔍 Debug - Selector "${selector}":`, element ? 'FOUND' : 'NOT FOUND');
      if (element) {
        // Special case: Allow hidden textareas if CKEditor is present
        const isCKEditorTextarea = element.tagName === 'TEXTAREA' && (
          (window.CKEDITOR && window.CKEDITOR.instances[element.id]) ||
          (element.id && document.querySelector(`#cke_${element.id}`))
        ); // Alternative CKEditor detection
        
        console.log(`🔍 CKEditor check for ${element.id}:`, {
          hasCKEDITOR: !!window.CKEDITOR,
          hasInstance: !!(window.CKEDITOR && window.CKEDITOR.instances[element.id]),
          hasCKEDiv: !!document.querySelector(`#cke_${element.id}`),
          isCKEditorTextarea
        });
        
        if (isVisible(element) || isCKEditorTextarea) {
          const visibilityStatus = isCKEditorTextarea ? 'CKEditor textarea (hidden but valid)' : 'visible';
          console.log(`✅ Found ${visibilityStatus} element with selector: ${selector}`);
          return element;
        } else {
          console.log(`⚠️ Found element but not visible: ${selector}`);
        }
      }
    } catch (error) {
      console.warn('❌ Invalid selector:', selector, error);
    }
  }
  
  console.log('❌ No matching element found for selectors:', selectors);
  return null;
}

// Check if element is visible
function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         element.offsetParent !== null;
}

// Fill an element with value
async function fillElement(element, value, fieldName) {
  try {
    // Check if this is a CKEditor field
    if (element.tagName === 'TEXTAREA') {
      // Try CKEditor API first
      if (window.CKEDITOR && window.CKEDITOR.instances[element.id]) {
        const editorInstance = window.CKEDITOR.instances[element.id];
        console.log(`🔍 Found CKEditor instance for ${fieldName}: ${element.id}`);
        try {
          // Wait for editor to be ready
          if (editorInstance.status === 'ready') {
            editorInstance.setData(value);
            console.log(`✅ Filled CKEditor field ${fieldName} with CKEditor API`);
            return true;
          } else {
            // Editor not ready, wait for it
            console.log(`⏳ CKEditor not ready, waiting for ${element.id}...`);
            editorInstance.on('instanceReady', function() {
              editorInstance.setData(value);
              console.log(`✅ Filled CKEditor field ${fieldName} after ready event`);
            });
            return true;
          }
        } catch (error) {
          console.error(`❌ CKEditor setData failed for ${fieldName}:`, error);
          // Fall through to try direct textarea fill
        }
      }

      // If CKEditor UI exists but API isn't exposed, write into the editable iframe/div first
      let wroteEditor = false;
      if (element.id) {
        const ckeContainer = document.querySelector(`#cke_${element.id}`);
        if (ckeContainer) {
          // Try iframe-based editor
          const iframe = ckeContainer.querySelector('iframe.cke_wysiwyg_frame');
          if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
            try {
              const doc = iframe.contentWindow.document;
              doc.body.innerHTML = value.replace(/\n/g, '<br/>');
              wroteEditor = true;
              console.log(`✅ Filled ${fieldName} via CKEditor iframe content`);
            } catch (err) {
              console.warn(`⚠️ Failed writing to CKEditor iframe for ${fieldName}:`, err);
            }
          }
          // Try contenteditable div (inline mode)
          if (!wroteEditor) {
            const editableDiv = ckeContainer.querySelector('[contenteditable="true"]');
            if (editableDiv) {
              try {
                editableDiv.innerHTML = value.replace(/\n/g, '<br/>');
                editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
                editableDiv.dispatchEvent(new Event('change', { bubbles: true }));
                wroteEditor = true;
                console.log(`✅ Filled ${fieldName} via CKEditor contenteditable div`);
              } catch (err) {
                console.warn(`⚠️ Failed writing to CKEditor contenteditable for ${fieldName}:`, err);
              }
            }
          }
        }
      }

      // Always sync hidden textarea as well (so form submission has the value)
      try {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        if (wroteEditor) {
          console.log(`✅ Synced hidden textarea for ${fieldName}`);
          return true;
        }
      } catch (error) {
        if (!wroteEditor) console.warn(`⚠️ Direct textarea fill failed for ${fieldName}:`, error);
      }

      // If we managed to write editor UI, treat as success
      if (wroteEditor) return true;

      // Lastly, try plain direct textarea fill if nothing else worked
      console.log(`🔍 Trying direct textarea fill for ${fieldName} (final attempt)`);
      try {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Filled textarea ${fieldName} directly`);
        return true;
      } catch (error) {
        console.error(`❌ Unable to fill ${fieldName}`, error);
        return false;
      }
    }
    
    // Focus the element
    element.focus();
    
    // Clear existing value
    if (element.tagName === 'SELECT') {
      // Handle select elements
      console.log(`🔍 Select options for ${fieldName}:`, Array.from(element.options).map(opt => ({text: opt.text, value: opt.value})));
      
      // Try exact matches first, then partial matches
      let option = Array.from(element.options).find(opt => 
        opt.value.toLowerCase() === value.toLowerCase() ||
        opt.text.toLowerCase() === value.toLowerCase()
      );
      
      if (!option) {
        option = Array.from(element.options).find(opt => 
          opt.text.toLowerCase().includes(value.toLowerCase()) ||
          opt.value.toLowerCase().includes(value.toLowerCase()) ||
          value.toLowerCase().includes(opt.text.toLowerCase())
        );
      }
      
      // Special handling for Mercedes
      if (!option && fieldName === 'make' && value.toLowerCase().includes('mercedes')) {
        option = Array.from(element.options).find(opt => 
          opt.text.toLowerCase().includes('mercedes') ||
          opt.value.toLowerCase().includes('mercedes')
        );
      }
      
      // Special handling for transmission
      if (!option && fieldName === 'transmission') {
        const transmissionMappings = {
          '9g-tronic': ['automatic', '9g', 'auto', 'at'],
          '7g-tronic': ['automatic', '7g', 'auto', 'at'],
          '8g-tronic': ['automatic', '8g', 'auto', 'at'],
          'manual': ['manual', 'stick', 'mt'],
          'cvt': ['cvt', 'automatic']
        };
        
        const lowerValue = value.toLowerCase();
        for (const [key, alternatives] of Object.entries(transmissionMappings)) {
          if (lowerValue.includes(key)) {
            // Try to find option that matches any of the alternatives
            for (const alt of alternatives) {
              option = Array.from(element.options).find(opt => 
                opt.text.toLowerCase().includes(alt) || 
                opt.value.toLowerCase().includes(alt)
              );
              if (option) break;
            }
            if (option) break;
          }
        }
      }
      
      if (option) {
        console.log(`✅ Selected option: ${option.text} (${option.value})`);
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      } else {
        console.warn(`❌ No matching option found for ${fieldName}: "${value}"`);
        return false;
      }
    } else {
      // Handle input/textarea elements
      element.value = '';
      element.value = value;
      
      // Trigger events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Some sites need additional events
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      
      return true;
    }
  } catch (error) {
    console.error(`Failed to fill ${fieldName}:`, error);
    return false;
  }
}

// Format technical data from car data
function formatTechnicalData(carData) {
  const parts = [];
  
  // New order: Engine → Transmission → Power → Torque → Cubic Capacity
  if (carData.engine) {
    parts.push(`Engine: ${carData.engine}`);
  }
  
  if (carData.transmission) {
    parts.push(`Transmission: ${carData.transmission}`);
  }
  
  if (carData.horsepower) {
    parts.push(`Power: ${carData.horsepower} HP`);
  }
  
  if (carData.torque) {
    parts.push(`Torque: ${carData.torque} NM`);
  }
  
  if (carData.displacement) {
    parts.push(`Cubic Capacity: ${carData.displacement}`);
  }
  
  return parts.join('\n\n');
}

// Format service package from car data
function formatServicePackage(carData) {
  // Check warranty type to determine service package content
  if (carData.warrantyType === 'extended') {
    // SilberArrows service package
    return 'Available';
  } else if (carData.warrantyType === 'standard' && carData.warrantyDate && carData.warrantyKmLimit) {
    // Dealer service - show year and mileage (same as warranty)
    const year = new Date(carData.warrantyDate).getFullYear();
    const formattedKm = carData.warrantyKmLimit.toLocaleString();
    return `${year} / ${formattedKm} km`;
  }
  
  // Fallback to original format if no warranty info
  const parts = [];
  
  if (carData.monthlyPayment0Down) {
    parts.push(`Monthly Payment (0% down): AED ${carData.monthlyPayment0Down.toLocaleString()}`);
  }
  
  if (carData.monthlyPayment20Down) {
    parts.push(`Monthly Payment (20% down): AED ${carData.monthlyPayment20Down.toLocaleString()}`);
  }
  
  parts.push('Part exchange welcome');
  parts.push('All payment methods accepted*');
  parts.push('Prices include VAT');
  parts.push('*Terms and conditions apply');
  
  return parts.join('\n');
}

// Format warranty information
function formatWarranty(carData) {
  // Handle warranty date and mileage formatting
  if (carData.warrantyDate && carData.warrantyKmLimit) {
    // Dealer warranty with date and mileage - show only year and mileage
    const year = new Date(carData.warrantyDate).getFullYear();
    const formattedKm = carData.warrantyKmLimit.toLocaleString(); // Format with commas
    return `${year} / ${formattedKm} km`;
  } else if (carData.warrantyDate) {
    // Has date but no mileage limit - show only year
    const year = new Date(carData.warrantyDate).getFullYear();
    return `Warranty Until ${year}`;
  } else if (carData.warrantyKmLimit) {
    // Has mileage but no date
    const formattedKm = carData.warrantyKmLimit.toLocaleString();
    return `Warranty Until ${formattedKm} km`;
  }
  
  // Check warranty type for SilberArrows warranty
  if (carData.warrantyType === 'extended') {
    return 'SilberArrows Warranty Available';
  }
  
  // Fallback to description parsing
  if (carData.description && carData.description.includes('WARRANTY UNTIL')) {
    const match = carData.description.match(/WARRANTY UNTIL (\d{4})/);
    if (match) {
      return `EMC WARRANTY UNTIL ${match[1]}`;
    }
  }
  
  return 'Manufacturer Warranty Available';
}

// Format description from car data (simplified for WordPress form)
function formatDescription(carData) {
  return carData.description || '';
}

// Highlight filled element
function highlightElement(element) {
  element.style.transition = 'all 0.3s ease';
  element.style.backgroundColor = '#e6f3ff';
  element.style.border = '2px solid #4a90e2';
  element.style.boxShadow = '0 0 8px rgba(74, 144, 226, 0.3)';
  
  lastFilledFields.push(element);
  
  // Remove highlight after 3 seconds
  setTimeout(() => {
    if (element.style) {
      element.style.backgroundColor = '';
      element.style.border = '';
      element.style.boxShadow = '';
    }
  }, 3000);
}

// Clear all field highlights
function clearFieldHighlights() {
  lastFilledFields.forEach(element => {
    if (element.style) {
      element.style.backgroundColor = '';
      element.style.border = '';
      element.style.boxShadow = '';
    }
  });
  lastFilledFields = [];
}

// Show fill summary notification
function showFillSummary(results) {
  const notification = document.createElement('div');
  notification.id = 'silberarrows-fill-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #333 0%, #555 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      border: 1px solid #666;
    ">
      <div style="font-weight: bold; margin-bottom: 8px; color: #e5e5e5;">
        🚗 SilberArrows Car Filler
      </div>
      <div style="color: #4ade80; margin-bottom: 4px;">
        ✅ Filled ${results.filled.length} fields
      </div>
      ${results.failed.length > 0 ? `
        <div style="color: #f87171;">
          ❌ Failed ${results.failed.length} fields
        </div>
      ` : ''}
      <div style="font-size: 12px; color: #aaa; margin-top: 8px;">
        ${results.carData.year} ${results.carData.model} (${results.carData.stockNumber})
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
      ">×</button>
    </div>
  `;
  
  // Remove existing notification
  const existing = document.getElementById('silberarrows-fill-notification');
  if (existing) {
    existing.remove();
  }
  
  // Add new notification
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Handle warranty type radio button selection
async function handleWarrantyTypeSelection(warrantyType) {
  try {
    let targetId = 'standard-warranty';
    
    // Map warranty types to radio button IDs
    if (warrantyType === 'extended') {
      // SilberArrows warranty -> Extended warranty
      targetId = 'extended-warranty';
    } else if (warrantyType === 'standard') {
      // Dealer warranty -> Standard/Manufacturer warranty
      targetId = 'standard-warranty';
    } else if (warrantyType === 'none' || warrantyType.toLowerCase().includes('none')) {
      targetId = 'none-warranty';
    }
    
    const radio = document.getElementById(targetId);
    if (radio) {
      radio.checked = true;
      radio.click();
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Selected warranty type radio: ${targetId}`);
      // Longer delay to allow UI to reveal dependent fields
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.warn('⚠️ Warranty type radio not found:', targetId);
    }
  } catch (err) {
    console.warn('⚠️ Failed to select warranty type:', err);
  }
}

// Ensure warranty field is visible by selecting a radio option
async function revealWarrantyField(warrantyText) {
  try {
    // Pick a sensible radio based on the text
    let targetId = 'standard-warranty';
    const text = (warrantyText || '').toLowerCase();
    if (text.includes('extended')) targetId = 'extended-warranty';
    if (text.includes('no warranty')) targetId = 'none-warranty';

    const radio = document.getElementById(targetId);
    if (radio) {
      radio.click();
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Selected warranty radio: ${targetId}`);
      // Small delay to allow UI to reveal the text input
      await new Promise(r => setTimeout(r, 150));
    } else {
      console.warn('⚠️ Warranty radio not found:', targetId);
    }
  } catch (err) {
    console.warn('⚠️ Failed to reveal warranty field:', err);
  }
}

// Handle image uploads (basic implementation)
async function handleImageUploads(imageUrls) {
  console.log('🖼️ Starting image upload process...');
  if (imageUploadInProgress) {
    console.log('ℹ️ Image upload already in progress, skipping.');
    return;
  }
  imageUploadInProgress = true;
  
  try {
    // Find the file input for photos
    const fileInput = document.querySelector('input[name="c-photos[]"]');
    if (!fileInput) {
      console.warn('❌ Photo upload input not found');
      return;
    }

    console.log(`🖼️ Found photo input, attempting to download and upload ${imageUrls.length} images...`);

    // Ensure input accepts multiple files
    try { fileInput.setAttribute('multiple', 'multiple'); } catch {}

    // Attempt single-change upload with all files (best chance to persist on save)
    try {
      const dtAll = new DataTransfer();
      let added = 0;
      for (const url of imageUrls) {
        try {
          const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          const blob = await res.blob();
          const filename = url.split('/').pop() || `photo_${Date.now()}.jpg`;
          const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
          const file = new File([blob], filename, { type });
          dtAll.items.add(file);
          added++;
        } catch (e) {
          console.warn('⚠️ Failed to fetch image for upload:', url, e);
        }
      }
      if (added > 0) {
        try { fileInput.value = ''; } catch {}
        fileInput.files = dtAll.files;
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Queued all ${dtAll.files.length} images in a single change`);

        // Offer to submit the form to persist uploads
        const form = fileInput.closest('form');
        if (form) {
          const shouldSubmit = confirm('All images are queued. Submit the form now to upload and save them?');
          if (shouldSubmit) {
            // Try to click an explicit Save button if present, else submit form
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button.save, .button-primary');
            if (submitBtn) {
              submitBtn.click();
              console.log('📝 Clicked submit button to save form and upload images');
            } else {
              form.submit();
              console.log('📝 Submitted form to save and upload images');
            }
          } else {
            console.log('ℹ️ User chose not to auto-submit form. Images will save on manual submit.');
          }
        }
        return;
      }
    } catch (e) {
      console.warn('⚠️ Programmatic image upload not permitted:', e);
    }

    // Fallback: present URLs to user
    const imageList = imageUrls.map((url, i) => `${i+1}. ${url}`).join('\n');
    alert(`Copy these image URLs to download manually:\n\n${imageList}`);
    
  } catch (error) {
    console.error('❌ Image upload failed:', error);
  } finally {
    imageUploadInProgress = false;
  }
}
