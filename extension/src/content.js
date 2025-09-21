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
      console.log('🔧 Content: Extension settings loaded:', {
        apiUrl: extensionSettings.apiUrl,
        fieldMappingsKeys: Object.keys(extensionSettings.fieldMappings || {}),
        silberarrowsMappingsCount: Object.keys(extensionSettings.fieldMappings?.['silberarrows.com'] || {}).length,
        silberarrowsFields: Object.keys(extensionSettings.fieldMappings?.['silberarrows.com'] || {})
      });
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
    
    // Create title field if not provided by API
    if (!fieldData.title && fieldData.year && fieldData.make && fieldData.model) {
      fieldData.title = `${fieldData.year} ${fieldData.make} ${fieldData.model}`;
      console.log('🔍 Created title field:', fieldData.title);
    }
    
    // Create servicePackage field if not provided by API
    if (!fieldData.servicePackage && fieldData.description) {
      if (fieldData.description.toLowerCase().includes('silberarrows service')) {
        fieldData.servicePackage = 'Available';
        console.log('🔍 Created servicePackage field: Available (found SilberArrows service)');
      } else if (fieldData.warranty && fieldData.warranty.includes('/')) {
        // Extract year/mileage from warranty field for dealer service
        fieldData.servicePackage = fieldData.warranty;
        console.log('🔍 Created servicePackage field from warranty:', fieldData.warranty);
      }
    }
    
    // Create monthlyPrice field from 20% down payment data
    if (!fieldData.monthlyPrice && carData.monthlyPayment20Down) {
      fieldData.monthlyPrice = carData.monthlyPayment20Down;
      console.log('🔍 Created monthlyPrice field from 20% down payment:', fieldData.monthlyPrice);
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
        const success = await fillElement(element, value, fieldName, carData);
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
    
    // Retry model field if it failed (it might depend on make selection)
    if (carData.model && !results.filled.find(f => f.field === 'model')) {
      console.log('🔄 Retrying model field after make selection...');
      await new Promise(r => setTimeout(r, 1500)); // Wait for make selection to complete
      
      const modelSelectors = mappings['model'] || [];
      const modelElement = findElement(modelSelectors);
      
      if (modelElement) {
        console.log('🔄 Attempting model field retry...');
        const success = await fillElement(modelElement, carData.model, 'model', carData);
        if (success) {
          results.filled.push({ field: 'model', value: carData.model, element: modelElement.tagName });
          console.log('✅ Model field retry successful!');
        } else {
          console.log('❌ Model field retry failed');
        }
      }
    }
    
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
  // Handle both www.silberarrows.com and silberarrows.com
  let domainKey = domain.replace('www.', '');
  
  // Handle dubizzle subdomains (dubai.dubizzle.com -> dubizzle.com)
  if (domainKey.includes('dubizzle.com')) {
    domainKey = 'dubizzle.com';
  }
  
  if (settings[domainKey]) {
    console.log('✅ Using site-specific mappings for:', domain, '(key:', domainKey + ')');
    return { ...settings.generic, ...settings[domainKey] };
  }
  
  // Use generic mappings from settings or fallback
  const genericMappings = settings.generic || fallbackMappings;
  const mappingType = domain.includes('silberarrows.com') ? 'SilberArrows-specific (fallback)' : 'generic';
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
        let isCKEditorTextarea = false;
        if (element.tagName === 'TEXTAREA') {
          try {
            isCKEditorTextarea = (window.CKEDITOR && window.CKEDITOR.instances[element.id]) ||
              (element.id && element.id.match(/^[a-zA-Z][\w-]*$/) && document.querySelector(`#cke_${element.id}`));
          } catch (e) {
            // Ignore invalid selector errors for CKEditor detection
            isCKEditorTextarea = false;
          }
        }
        
        console.log(`🔍 CKEditor check for ${element.id || 'no-id'}:`, {
          hasCKEDITOR: !!window.CKEDITOR,
          hasInstance: !!(window.CKEDITOR && element.id && window.CKEDITOR.instances[element.id]),
          hasCKEDiv: false, // Skip this check to avoid invalid selectors
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
async function fillElement(element, value, fieldName, carData = null) {
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
      if (element.id && element.id.match(/^[a-zA-Z][\w-]*$/)) {
        try {
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
        } catch (e) {
          console.log(`⚠️ CKEditor container check failed for ${element.id}:`, e.message);
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
      
      // Special handling for common field mappings
      if (!option) {
        let mappings = {};
        
        // Body type mappings
        if (fieldName === 'bodyStyle') {
          mappings = {
            'saloon': ['sedan'],
            'estate': ['wagon'],
            'hatchback': ['hatchback'],
            'coupe': ['coupe'],
            'convertible': ['soft top convertible', 'hard top convertible'],
            'suv': ['suv'],
            'crossover': ['crossover'],
            'pickup': ['pick up truck'],
            'van': ['van'],
            'sports car': ['sports car'],
            'utility': ['utility truck']
          };
        }
        
        // Transmission mappings
        if (fieldName === 'transmission') {
          mappings = {
            'automatic': ['automatic', 'auto'],
            'manual': ['manual'],
            '9g-tronic': ['automatic', 'auto'],
            'cvt': ['cvt', 'automatic'],
            'dsg': ['automatic', 'auto']
          };
        }
        
        // Color mappings
        if (fieldName === 'color' || fieldName === 'interiorColor') {
          mappings = {
            // White variations
            'polar white': ['white', 'polar white'],
            'arctic white': ['white', 'arctic white'],
            'diamond white': ['white', 'diamond white'],
            'white - standard finish': ['white'],
            'white': ['white'],
            
            // Black variations
            'obsidian black': ['black', 'obsidian black'],
            'jet black': ['black', 'jet black'],
            'black - standard finish': ['black'],
            'black': ['black'],
            
            // Silver/Grey variations
            'iridium silver': ['silver', 'iridium silver'],
            'selenite grey': ['grey', 'gray', 'selenite grey'],
            'graphite grey': ['grey', 'gray', 'graphite grey'],
            'silver - standard finish': ['silver'],
            'grey - standard finish': ['grey', 'gray'],
            'silver': ['silver'],
            'grey': ['grey', 'gray'],
            'gray': ['grey', 'gray'],
            
            // Blue variations
            'brilliant blue': ['blue', 'brilliant blue'],
            'cavansite blue': ['blue', 'cavansite blue'],
            'blue - standard finish': ['blue'],
            'blue': ['blue'],
            
            // Red variations
            'jupiter red': ['red', 'jupiter red'],
            'red - standard finish': ['red'],
            'red': ['red'],
            
            // Interior specific colors
            'leather - black': ['black'],
            'leather - beige': ['beige', 'tan', 'brown'],
            'leather - brown': ['brown', 'beige', 'tan'],
            'fabric / leatherette / microfiber - black / anthra': ['black'],
            'black/anthracite': ['black']
          };
        }
        
        // Regional spec mappings
        if (fieldName === 'regionalSpec') {
          mappings = {
            'gcc specification': ['gcc', 'gulf'],
            'american specification': ['american', 'usa', 'us'],
            'european specification': ['european', 'euro'],
            'japanese specification': ['japanese', 'japan']
          };
        }
        
        // Apply mappings
        const lowerValue = value.toLowerCase();
        for (const [key, alternatives] of Object.entries(mappings)) {
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
    } else if (element.role === 'combobox' && element.getAttribute('aria-autocomplete') === 'list') {
      // Handle MUI Autocomplete fields
      console.log(`🔍 Handling MUI Autocomplete for ${fieldName}`);
      
      // Focus the input first
      element.focus();
      
      // Clear and set value
      element.value = '';
      element.value = value;
      
      // Trigger multiple events to ensure dropdown opens
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      element.dispatchEvent(new Event('click', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      
      // Wait for dropdown to appear, then try to select option
      setTimeout(() => {
        // Look for dropdown options with multiple selectors
        const dropdownSelectors = [
          '.MuiAutocomplete-popper:not([style*="display: none"])',
          '.MuiPopper-root:not([style*="display: none"])',
          '.MuiAutocomplete-listbox',
          '[role="listbox"]',
          '.MuiPaper-root[role="presentation"]'
        ];
        
        let dropdown = null;
        for (const selector of dropdownSelectors) {
          dropdown = document.querySelector(selector);
          if (dropdown) break;
        }
        
        console.log(`🔍 Dropdown search for ${fieldName}:`, {
          dropdown: !!dropdown,
          allPoppers: document.querySelectorAll('.MuiAutocomplete-popper, .MuiPopper-root').length,
          allListboxes: document.querySelectorAll('[role="listbox"], .MuiAutocomplete-listbox').length
        });
        if (dropdown) {
          const options = dropdown.querySelectorAll('[role="option"], .MuiAutocomplete-option');
          console.log(`🔍 Found ${options.length} autocomplete options`);
          
          // Try to find matching option with flexible matching
          let matchedOption = null;
          let searchValue = value.toLowerCase();
          
          // Special handling for Make field on Dubizzle - it expects Brand only
          if (fieldName === 'make') {
            console.log(`🔍 DEBUG - Make field: Using brand only: "${searchValue}"`);
            // For make field, just use the brand name (Mercedes-Benz, BMW, etc.)
            // The model will be filled in the separate model field
          }
          
          // Log all available options for debugging
          console.log(`🔍 Available options for ${fieldName}:`, 
            Array.from(options).map(opt => opt.textContent).slice(0, 10)
          );
          
          // For make field, prioritize exact brand matches
          if (fieldName === 'make') {
            // First, look for exact brand match (e.g., "Mercedes-Benz" exactly)
            for (const option of options) {
              const optionText = option.textContent.toLowerCase().trim();
              if (optionText === searchValue) {
                matchedOption = option;
                console.log(`✅ Matched "${searchValue}" with option "${optionText}" (exact match)`);
                break;
              }
            }
            
            // Second, look for brand-only option (no model suffixes)
            if (!matchedOption) {
              // Try to find options that are just the brand without model codes
              const brandOnlyOptions = [];
              const modelSuffixes = ['glc', 'gle', 'gls', 'gla', 'glb', 'eqc', 'eqs', 'eqe', 'eqa', 'eqb', 'a class', 'c class', 'e class', 's class', 'g class', 'x class', 'v class', 'amg', 'maybach'];
              
              for (const option of options) {
                const optionText = option.textContent.toLowerCase();
                if (optionText.includes(searchValue)) {
                  // Check if this option contains model suffixes
                  const hasModelSuffix = modelSuffixes.some(suffix => optionText.includes(suffix));
                  if (!hasModelSuffix) {
                    brandOnlyOptions.push(option);
                  }
                }
              }
              
              if (brandOnlyOptions.length > 0) {
                // Pick the shortest brand-only option
                matchedOption = brandOnlyOptions.reduce((shortest, current) => 
                  current.textContent.length < shortest.textContent.length ? current : shortest
                );
                console.log(`✅ Matched "${searchValue}" with option "${matchedOption.textContent}" (brand-only option)`);
              }
            }
            
            // Third fallback: shortest option overall
            if (!matchedOption) {
              let shortestOption = null;
              let shortestLength = 999;
              
              for (const option of options) {
                const optionText = option.textContent.toLowerCase();
                if (optionText.includes(searchValue) && optionText.length < shortestLength) {
                  shortestOption = option;
                  shortestLength = optionText.length;
                }
              }
              
              if (shortestOption) {
                matchedOption = shortestOption;
                console.log(`✅ Matched "${searchValue}" with option "${shortestOption.textContent}" (shortest fallback)`);
              }
            }
            
            // If no exact match, fall back to any Mercedes option
            if (!matchedOption) {
              for (const option of options) {
                const optionText = option.textContent.toLowerCase();
                if (optionText.includes('mercedes')) {
                  matchedOption = option;
                  console.log(`✅ Matched "${searchValue}" with option "${optionText}" (fallback)`);
                  break;
                }
              }
            }
          } else {
            // For other fields, use the original matching logic
            for (const option of options) {
              const optionText = option.textContent.toLowerCase();
              
              // Try different matching strategies
              if (
                optionText === searchValue || // Exact match
                optionText.includes(searchValue) || // Option contains search
                // For model field, be more precise to avoid GLE/GLC confusion
                (fieldName === 'model' && searchValue.includes('gle') && optionText.includes('gle') && !optionText.includes('glc')) ||
                (fieldName === 'model' && searchValue.includes('glc') && optionText.includes('glc') && !optionText.includes('gle')) ||
                // For non-model fields, allow broader matching
                (fieldName !== 'model' && searchValue.includes(optionText)) || // Search contains option
                // Try matching key words (for non-model fields)
                (fieldName !== 'model' && searchValue.split(' ').some(word => word.length > 2 && optionText.includes(word))) ||
                (fieldName !== 'model' && optionText.split(' ').some(word => word.length > 2 && searchValue.includes(word)))
              ) {
                matchedOption = option;
                console.log(`✅ Matched "${searchValue}" with option "${optionText}" (${fieldName} field)`);
                break;
              }
            }
          }
          
          if (matchedOption) {
            console.log(`✅ Clicking autocomplete option: ${matchedOption.textContent}`);
            matchedOption.click();
          } else {
            console.warn(`❌ No matching autocomplete option found for: ${value}`);
            // Fallback: press Escape to close dropdown and keep typed value
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
        } else {
          console.warn(`❌ Autocomplete dropdown not found for ${fieldName}`);
          
          // Special case: Model field might need Make to be selected first
          if (fieldName === 'model') {
            console.log('🔄 Model field failed, will retry after Make selection completes...');
            // We'll handle this with a delayed retry in the main flow
          }
        }
      }, 800);
      
      return true;
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

// Handle image uploads with advanced techniques
async function handleImageUploads(imageUrls) {
  console.log('🖼️ Starting image upload process...');
  if (imageUploadInProgress) {
    console.log('ℹ️ Image upload already in progress, skipping.');
    return;
  }
  imageUploadInProgress = true;
  
  try {
    // Find the file input for photos - try multiple selectors
    const selectors = [
      'input[name="c-photos[]"]', // SilberArrows
      'input[type="file"]', // Generic file input
      'input[name="images"]', // Dubizzle images field
      'input[type="file"][accept*="image"]', // File input that accepts images
      'input[name="photos"]', // Alternative photos field
      'input[name="photo"]', // Single photo field
      '.file-input input[type="file"]', // Wrapped file inputs
      '[data-testid*="image"] input[type="file"]', // Test ID based selectors
      '[data-testid*="photo"] input[type="file"]'
    ];
    
    let fileInput = null;
    for (const selector of selectors) {
      fileInput = document.querySelector(selector);
      if (fileInput) {
        console.log(`✅ Found photo upload input with selector: ${selector}`);
        break;
      }
    }
    
    if (!fileInput) {
      console.warn('❌ Photo upload input not found. Tried selectors:', selectors);
      // Try to find any file input as fallback
      const allFileInputs = document.querySelectorAll('input[type="file"]');
      console.log(`🔍 Found ${allFileInputs.length} file inputs on page`);
      if (allFileInputs.length > 0) {
        fileInput = allFileInputs[0]; // Use first file input as fallback
        console.log('🔄 Using first file input as fallback');
      } else {
      return;
      }
    }

    console.log(`🖼️ Found photo input, attempting to download and upload ${imageUrls.length} images...`);
    console.log('🔍 Image URLs to process:', imageUrls);

    // Ensure input accepts multiple files
    try { 
      fileInput.setAttribute('multiple', 'multiple');
      fileInput.setAttribute('accept', 'image/*');
    } catch {}
    
    // Check if URLs are properly formatted storage proxy URLs and deduplicate
    const seen = new Set();
    const validUrls = imageUrls.filter(url => {
      const isValid = url && (url.startsWith('/api/storage-proxy') || url.startsWith('http'));
      if (!isValid) {
        console.warn('⚠️ Invalid image URL detected:', url);
        return false;
      }
      const key = url.split('?')[0];
      if (seen.has(key)) {
        console.warn('⚠️ Duplicate image URL filtered:', url);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (validUrls.length !== imageUrls.length) {
      console.warn(`⚠️ ${imageUrls.length - validUrls.length} invalid URLs filtered out`);
    }
    
    console.log(`🔍 Processing ${validUrls.length} valid image URLs`);

    // Strategy 1: Try programmatic file upload
    let uploadSuccess = false;
    try {
      uploadSuccess = await attemptProgrammaticUpload(fileInput, validUrls);
    } catch (e) {
      console.warn('⚠️ Programmatic upload failed:', e);
    }

    // Strategy 2: If programmatic failed, try drag-and-drop simulation
    if (!uploadSuccess) {
      console.log('🔄 Trying drag-and-drop simulation...');
      try {
        uploadSuccess = await attemptDragDropUpload(fileInput, validUrls);
      } catch (e) {
        console.warn('⚠️ Drag-drop simulation failed:', e);
      }
    }

    // Strategy 3: If all else fails, create a download helper
    if (!uploadSuccess) {
      console.log('🔄 Creating download helper interface...');
      createImageDownloadHelper(validUrls);
    }
    
  } catch (error) {
    console.error('❌ Image upload failed:', error);
  } finally {
    imageUploadInProgress = false;
  }
}

// Attempt programmatic file upload with preserved order
async function attemptProgrammaticUpload(fileInput, imageUrls) {
  try {
    console.log('🔍 Starting ordered image download to preserve inventory sequence...');
    
    // Download all images in parallel but preserve order
    const imagePromises = imageUrls.map(async (url, index) => {
      try {
        console.log(`🔍 [${index + 1}/${imageUrls.length}] Downloading image:`, url);
        
        // Convert relative URLs to absolute URLs pointing to SilberArrows server
        let absoluteUrl;
        if (url.startsWith('/api/storage-proxy')) {
          // Force storage proxy URLs to use SilberArrows server, not current domain
          absoluteUrl = `https://portal.silberarrows.com${url}`;
          console.log(`🔍 [${index + 1}] Using SilberArrows portal URL:`, absoluteUrl);
        } else if (url.startsWith('/')) {
          absoluteUrl = `${window.location.origin}${url}`;
          console.log(`🔍 [${index + 1}] Using current domain absolute URL:`, absoluteUrl);
        } else {
          absoluteUrl = url;
          console.log(`🔍 [${index + 1}] Using provided absolute URL:`, absoluteUrl);
        }
        
        const blob = await fetchImageWithRetry(absoluteUrl);
        if (!blob || blob.size === 0) {
          throw new Error('Empty or invalid blob received');
        }
        
        const filename = url.split('/').pop()?.split('?')[0] || `photo_${Date.now()}_${index}.jpg`;
          const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
          const file = new File([blob], filename, { type });
        
        console.log(`✅ [${index + 1}/${imageUrls.length}] Downloaded: ${filename} (${blob.size} bytes)`);
        return { file, index, success: true };
        
        } catch (e) {
        console.warn(`⚠️ [${index + 1}/${imageUrls.length}] Failed to fetch image:`, url, e.message);
        return { file: null, index, success: false, error: e.message };
      }
    });
    
    // Wait for all downloads to complete
    console.log('⏳ Waiting for all image downloads to complete...');
    const results = await Promise.all(imagePromises);
    
    // Sort results by original index to maintain inventory order
    const sortedResults = results.sort((a, b) => a.index - b.index);
    
    // Add files to DataTransfer in correct order
    const dtAll = new DataTransfer();
    let added = 0;
    
    console.log('📋 Adding images to upload queue in inventory order:');
    for (const result of sortedResults) {
      if (result.success && result.file) {
        dtAll.items.add(result.file);
        added++;
        console.log(`✅ [Position ${result.index + 1}] Added to upload queue: ${result.file.name}`);
      } else {
        console.warn(`❌ [Position ${result.index + 1}] Skipped due to error: ${result.error}`);
      }
    }
    
    if (added > 0) {
      const isDubizzle = window.location.hostname.includes('dubizzle.com');
      
      if (isDubizzle) {
        // Domain-specific batching for Dubizzle to avoid 429 and missed files
        const batchSize = 4; // small batches to respect server limits
        const batchDelayMs = 1800; // wait between batches for server to accept next set
        console.log(`🧩 Dubizzle detected. Uploading in batches of ${batchSize} with ${batchDelayMs}ms delay between batches...`);
        
        const filesArray = Array.from(dtAll.files);
        for (let start = 0; start < filesArray.length; start += batchSize) {
          const batch = filesArray.slice(start, start + batchSize);
          const dtBatch = new DataTransfer();
          batch.forEach(f => dtBatch.items.add(f));
          
          try { fileInput.value = ''; } catch {}
          fileInput.focus();
          fileInput.click();
          fileInput.files = dtBatch.files;
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          console.log(`📤 Queued batch ${(start / batchSize) + 1} containing ${dtBatch.files.length} images`);
          
          if (start + batchSize < filesArray.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelayMs));
          }
        }
        
        console.log(`✅ All ${filesArray.length} images queued in ${Math.ceil(filesArray.length / batchSize)} batches`);
        showSuccessNotification(`✅ ${filesArray.length} images queued in batches to avoid rate limits`);
        return true;
      } else {
        // Default: single bulk selection
        try { fileInput.value = ''; } catch {}
        fileInput.focus();
        fileInput.click();
        fileInput.files = dtAll.files;
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileInput.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log(`✅ Successfully queued ${dtAll.files.length} images in correct inventory order`);
        showSuccessNotification(`✅ ${added} images uploaded in inventory order!`);
        return true;
      }
    }
    
    return false;
    } catch (e) {
    console.warn('⚠️ Programmatic upload failed:', e);
    return false;
  }
}

// Attempt drag-and-drop simulation with preserved order
async function attemptDragDropUpload(fileInput, imageUrls) {
  try {
    console.log('🔍 Starting ordered drag-drop image download...');
    
    // Download all images in parallel but preserve order (same as programmatic upload)
    const imagePromises = imageUrls.map(async (url, index) => {
      try {
        // Convert relative URLs to absolute URLs pointing to SilberArrows server
        let absoluteUrl;
        if (url.startsWith('/api/storage-proxy')) {
          // Force storage proxy URLs to use SilberArrows server, not current domain
          absoluteUrl = `https://portal.silberarrows.com${url}`;
        } else if (url.startsWith('/')) {
          absoluteUrl = `${window.location.origin}${url}`;
        } else {
          absoluteUrl = url;
        }
        
        const blob = await fetchImageWithRetry(absoluteUrl);
        if (blob && blob.size > 0) {
          // Make filenames deterministic with index to avoid duplicates and preserve order in targets that sort by name
          const baseName = url.split('/').pop()?.split('?')[0] || `photo_${Date.now()}_${index}.jpg`;
          const filename = `${String(index + 1).padStart(3,'0')}_${baseName}`;
          const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
          const file = new File([blob], filename, { type });
          return { file, index, success: true };
        }
        return { file: null, index, success: false, error: 'Empty blob' };
      } catch (e) {
        console.warn(`⚠️ Failed to fetch image ${index + 1} for drag-drop:`, url, e.message);
        return { file: null, index, success: false, error: e.message };
      }
    });
    
    // Wait for all downloads and sort by original order
    const results = await Promise.all(imagePromises);
    const sortedResults = results.sort((a, b) => a.index - b.index);
    
    // Extract files in correct order
    const files = sortedResults
      .filter(result => result.success && result.file)
      .map(result => result.file);
    
    console.log(`📋 Prepared ${files.length} images for drag-drop in inventory order`);
    
    if (files.length > 0) {
      // Simulate drag and drop
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      
      const dragEnterEvent = new DragEvent('dragenter', { bubbles: true, dataTransfer: dt });
      const dragOverEvent = new DragEvent('dragover', { bubbles: true, dataTransfer: dt });
      const dropEvent = new DragEvent('drop', { bubbles: true, dataTransfer: dt });
      
      fileInput.dispatchEvent(dragEnterEvent);
      fileInput.dispatchEvent(dragOverEvent);
      fileInput.dispatchEvent(dropEvent);
      
      console.log(`✅ Simulated drag-drop with ${files.length} images`);
      showSuccessNotification(`✅ ${files.length} images uploaded via drag-drop!`);
      return true;
    }
    
    return false;
  } catch (e) {
    console.warn('⚠️ Drag-drop simulation failed:', e);
    return false;
  }
}

// Fetch image with retry logic
async function fetchImageWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Fetch attempt ${attempt}/${maxRetries} for:`, url);
      
      // Try CORS first
      let response = await fetch(url, { 
        mode: 'cors', 
        credentials: 'omit',
        headers: { 'Accept': 'image/*' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log(`✅ Fetched blob: ${blob.size} bytes, type: ${blob.type}`);
      return blob;
      
    } catch (corsError) {
      console.log(`⚠️ CORS attempt ${attempt} failed:`, corsError.message);
      
      // Skip no-cors fallback as it can't read response bodies
      console.log(`⚠️ Skipping no-CORS fallback (can't read response body)`);
      
      // Try with different credentials mode
      try {
        const response = await fetch(url, { 
          mode: 'cors', 
          credentials: 'include',
          headers: { 'Accept': 'image/*' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log(`✅ CORS with credentials succeeded: ${blob.size} bytes, type: ${blob.type}`);
        return blob;
      } catch (credentialsError) {
        console.log(`⚠️ CORS with credentials attempt ${attempt} failed:`, credentialsError.message);
      }
      
      if (attempt === maxRetries) {
        throw corsError;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Create download helper interface
function createImageDownloadHelper(imageUrls) {
  console.log('📋 Creating image download helper interface...');
  
  // Remove existing helper
  const existingHelper = document.getElementById('silberarrows-download-helper');
  if (existingHelper) {
    existingHelper.remove();
  }
  
  // Create enhanced download helper
  const helper = document.createElement('div');
  helper.id = 'silberarrows-download-helper';
  helper.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #ff6b35;">🖼️ Image Download Helper</h3>
        <button onclick="this.closest('#silberarrows-download-helper').remove()" style="
          background: #ff4444;
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
        ">×</button>
      </div>
      
      <p style="margin: 0 0 16px 0; color: #ccc; font-size: 14px;">
        Automatic upload was blocked by browser security. Download images manually:
      </p>
      
      <div style="margin-bottom: 16px;">
        <button id="download-all-btn" style="
          background: #4CAF50;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 8px;
        ">📥 Download All</button>
        
        <button id="copy-urls-btn" style="
          background: #2196F3;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">📋 Copy URLs</button>
      </div>
      
      <div style="max-height: 300px; overflow-y: auto; background: #333; padding: 12px; border-radius: 6px;">
        ${imageUrls.map((url, i) => `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px; background: #444; border-radius: 4px;">
            <span style="font-size: 12px; color: #aaa; flex: 1; margin-right: 8px;">Image ${i + 1}</span>
            <a href="${url}" download="car-image-${i + 1}.jpg" style="
              background: #ff6b35;
              color: white;
              text-decoration: none;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
            ">Download</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(helper);
  
  // Add event listeners
  helper.querySelector('#download-all-btn').addEventListener('click', () => {
    imageUrls.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `car-image-${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  });
  
  helper.querySelector('#copy-urls-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(imageUrls.join('\n')).then(() => {
      const btn = helper.querySelector('#copy-urls-btn');
      const originalText = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  });
}

// Show success notification
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}
