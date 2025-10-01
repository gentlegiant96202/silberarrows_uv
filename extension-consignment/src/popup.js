// Popup script for SilberArrows Consignment Creator extension
let extractedData = null;
let extensionSettings = null;

// DOM elements
const extractBtn = document.getElementById('extractBtn');
const createBtn = document.getElementById('createBtn');
const statusDiv = document.getElementById('status');
const extractedDataDiv = document.getElementById('extractedData');
const extractedVehicle = document.getElementById('extractedVehicle');
const extractedPrice = document.getElementById('extractedPrice');
const extractedPhone = document.getElementById('extractedPhone');
const extractedSite = document.getElementById('extractedSite');
const logoImage = document.getElementById('logoImage');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Consignment Creator popup loaded');
  
  // Set the logo image URL using Chrome extension API
  if (logoImage) {
    logoImage.src = chrome.runtime.getURL('icons/main-logo.png');
  }
  
  try {
    await loadSettings();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showStatus('Failed to initialize extension', 'error');
  }
});

// Setup event listeners
function setupEventListeners() {
  extractBtn.addEventListener('click', handleExtractData);
  createBtn.addEventListener('click', handleCreateConsignment);
}

// Load extension settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      extensionSettings = response.settings;
      console.log('Settings loaded:', extensionSettings);
    } else {
      throw new Error(response.error || 'Failed to load settings');
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
}

// Handle data extraction
async function handleExtractData() {
  try {
    showStatus('Extracting car data...', 'loading');
    extractBtn.disabled = true;
    createBtn.style.display = 'none';
    extractedDataDiv.classList.add('hidden');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we can access the tab
    if (!tab || !tab.id) {
      throw new Error('Could not access the current tab');
    }
    
    // First, try to inject the content script if it's not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content.js']
      });
      console.log('Content script injected successfully');
    } catch (injectError) {
      console.warn('Could not inject content script:', injectError);
      // Continue anyway, the script might already be there
    }
    
    // Wait a moment for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Extract car data from the page
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'extractCarData' });
    } catch (messageError) {
      console.warn('Message sending failed, trying direct extraction:', messageError);
      
      // Fallback: Try to extract data directly via scripting
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractCarDataDirectly
        });
        
        if (results && results[0] && results[0].result) {
          response = { success: true, result: results[0].result };
        } else {
          throw new Error('Direct extraction failed');
        }
      } catch (directError) {
        console.error('Direct extraction also failed:', directError);
        throw new Error('Could not extract car data. Please refresh the page and try again.');
      }
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract car data');
    }
    
    extractedData = response.result;
    
    // Validate extracted data
    if (!extractedData.vehicle_model) {
      throw new Error('Could not extract vehicle model from this page. Please make sure you are on a car listing page.');
    }
    
    // Display extracted data
    displayExtractedData(extractedData);
    
    showStatus('✅ Car data extracted successfully!', 'success');
    createBtn.style.display = 'block';
    
  } catch (error) {
    console.error('Error extracting car data:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.message.includes('Could not establish connection')) {
      errorMessage = 'Extension not active on this page. Please refresh the page and try again.';
    } else if (error.message.includes('Receiving end does not exist')) {
      errorMessage = 'Content script not loaded. Please refresh the page and try again.';
    }
    
    showStatus(`❌ Error: ${errorMessage}`, 'error');
  } finally {
    extractBtn.disabled = false;
  }
}

// Display extracted data
function displayExtractedData(data) {
  extractedVehicle.textContent = data.vehicle_model || 'Not found';
  extractedPrice.textContent = data.asking_price ? `AED ${data.asking_price.toLocaleString()}` : 'Not found';
  extractedPhone.textContent = data.phone_number || 'Not found';
  extractedSite.textContent = data.listing_url || 'Unknown';
  
  extractedDataDiv.classList.remove('hidden');
}

// Handle consignment creation
async function handleCreateConsignment() {
  if (!extractedData) {
    showStatus('Please extract car data first', 'error');
    return;
  }
  
  try {
    showStatus('Creating consignment...', 'loading');
    createBtn.disabled = true;
    
    // Create consignment via background script
    const response = await chrome.runtime.sendMessage({ 
      action: 'createConsignment',
      consignmentData: extractedData
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create consignment');
    }
    
    showStatus(`✅ Consignment created: ${extractedData.vehicle_model}`, 'success');
    
    // Reset UI
    setTimeout(() => {
      extractedData = null;
      extractedDataDiv.classList.add('hidden');
      createBtn.style.display = 'none';
      showStatus('', 'hidden');
    }, 3000);
    
  } catch (error) {
    console.error('Error creating consignment:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    createBtn.disabled = false;
  }
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  if (type === 'loading') {
    statusDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <div class="spinner"></div>
        ${message}
      </div>
    `;
  }
}

// Format price for display
function formatPrice(price) {
  if (!price) return 'N/A';
  return `AED ${price.toLocaleString()}`;
}

// Format phone number for display
function formatPhone(phone) {
  if (!phone) return 'N/A';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
}

// Direct extraction function (runs in page context)
async function extractCarDataDirectly() {
  try {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href, // Full URL including path
      notes: '',
      status: 'new_lead',
      extracted_from: window.location.href, // Full URL including path
      extracted_at: new Date().toISOString(),
      site_domain: window.location.hostname.replace('www.', '')
    };
    
    console.log('🌐 Full listing URL:', data.listing_url);
    console.log('🌐 Site domain:', data.site_domain);

    // Extract title/model - Updated for Dubizzle structure
    const titleSelectors = [
      'h1', // Main title element
      'h2', // Secondary title
      'h3', // Tertiary title
      'h4', // Quaternary title
      'h5', // Quinary title
      'h6', // Senary title
      '[data-testid="ad-title"]',
      '.ad-title',
      '.car-title',
      '.vehicle-title',
      '.listing-title',
      '.title',
      'h1[data-testid="ad-title"]',
      'h1.ad-title'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const title = element.textContent.trim();
        // Skip if it's just a price (contains AED)
        if (!title.includes('AED')) {
          data.vehicle_model = title;
          break;
        }
      }
    }
    
    // Fallback: If no title found, look for any text that might be a car title
    if (!data.vehicle_model) {
      const allText = document.body.textContent || '';
      const carBrands = ['Mercedes', 'BMW', 'Audi', 'Toyota', 'Honda', 'Nissan', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Lexus', 'Infiniti', 'Acura', 'Mazda', 'Subaru', 'Volkswagen', 'Volvo', 'Jaguar', 'Land Rover', 'Porsche', 'Ferrari', 'Lamborghini', 'McLaren', 'Bentley', 'Rolls Royce', 'Maserati', 'Alfa Romeo', 'Fiat', 'Peugeot', 'Renault', 'Citroen', 'Seat', 'Skoda', 'Dacia', 'Opel', 'Saab', 'Volvo'];
      
      for (const brand of carBrands) {
        const brandRegex = new RegExp(`(${brand}[^\\n\\r]{0,50})`, 'i');
        const match = allText.match(brandRegex);
        if (match) {
          data.vehicle_model = match[1].trim();
          break;
        }
      }
    }

    // Extract price - Updated for Dubizzle structure
    const priceSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // All heading elements
      '[data-testid="ad-price"]',
      '.ad-price',
      '.price',
      '[class*="price"]',
      '[data-testid="price"]',
      '.vehicle-price',
      '.car-price',
      '.listing-price',
      '[class*="cost"]',
      '[class*="amount"]'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText || '';
        // Look for AED price pattern
        const priceMatch = priceText.match(/AED\s*([\d,]+)/i);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          // Only accept reasonable car prices (between 5,000 and 2,000,000 AED)
          if (price >= 5000 && price <= 2000000) {
            data.asking_price = price;
            break;
          }
        }
        // Fallback to any number pattern
        const numberMatch = priceText.match(/([\d,]+)/);
        if (numberMatch) {
          const price = parseInt(numberMatch[1].replace(/,/g, ''));
          // Only accept reasonable car prices
          if (price >= 5000 && price <= 2000000) {
            data.asking_price = price;
            break;
          }
        }
      }
    }

    // Extract phone number - Updated for Dubizzle structure
    // First try to find "Show Number" buttons and click them
    const allButtons = document.querySelectorAll('button');
    const showNumberButtons = Array.from(allButtons).filter(button => 
      button.textContent && (
        button.textContent.includes('Show Number') ||
        button.textContent.includes('Show') ||
        button.textContent.includes('Number') ||
        button.textContent.includes('Contact') ||
        button.textContent.includes('Call') ||
        button.textContent.includes('Phone')
      )
    );
    
    console.log('📞 Found buttons:', showNumberButtons.length);
    console.log('📞 Button texts:', showNumberButtons.map(b => b.textContent.trim()));
    
    if (showNumberButtons.length > 0) {
      // Try to click the first "Show Number" button
      try {
        console.log('🖱️ Clicking button:', showNumberButtons[0].textContent);
        
        // Scroll button into view first
        showNumberButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait a moment for scroll
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Click the button
        showNumberButtons[0].click();
        
        // Wait longer for the modal to appear
        console.log('⏳ Waiting for modal to appear...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Look for phone number in modal that appeared
        console.log('🔍 Looking for modal after button click...');
        
        // Wait a bit more for modal to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const modalSelectors = [
          '[role="dialog"]',
          '.modal',
          '.popup',
          '[class*="modal"]',
          '[class*="popup"]',
          '[class*="dialog"]',
          '[class*="overlay"]',
          '[class*="backdrop"]',
          'div[style*="position: fixed"]',
          'div[style*="z-index"]',
          '[class*="phone"]',
          '[class*="contact"]',
          '[class*="number"]'
        ];
        
        let foundModal = false;
        
        // Check all modal selectors
        for (const modalSelector of modalSelectors) {
          const modals = document.querySelectorAll(modalSelector);
          console.log(`🔍 Checking selector "${modalSelector}": found ${modals.length} elements`);
          
          for (const modal of modals) {
            if (modal && modal.textContent) {
              console.log('🔍 Found modal with selector:', modalSelector);
              console.log('📄 Modal content preview:', modal.textContent.substring(0, 300) + '...');
              
              // Look for phone number with more comprehensive regex
              const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
              const modalText = modal.textContent;
              const phoneMatches = modalText.match(phoneRegex);
              
              console.log('📞 Phone matches in modal:', phoneMatches);
              
              if (phoneMatches && phoneMatches.length > 0) {
                const validPhone = phoneMatches.find(match => {
                  const cleanPhone = match.replace(/[^\d]/g, '');
                  return cleanPhone.length >= 9 && cleanPhone.length <= 12;
                });
                if (validPhone) {
                  data.phone_number = validPhone.replace(/[^\d]/g, '');
                  console.log('✅ Phone found in modal:', data.phone_number);
                  foundModal = true;
                  break;
                }
              }
            }
          }
          if (foundModal) break;
        }
        
        // If no modal found, look for any new content that appeared
        if (!foundModal) {
          console.log('🔍 No modal found, looking for any new content...');
          
          // Look for any element that might contain the phone number
          const allElements = document.querySelectorAll('*');
          console.log(`🔍 Checking ${allElements.length} elements for phone numbers...`);
          
          for (const element of allElements) {
            if (element.textContent && element.textContent.length < 1000) { // Only check elements with reasonable text length
              const text = element.textContent;
              const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
              const phoneMatches = text.match(phoneRegex);
              
              if (phoneMatches && phoneMatches.length > 0) {
                console.log('📞 Found phone in element:', element.tagName, element.className, text.substring(0, 100));
                const validPhone = phoneMatches.find(match => {
                  const cleanPhone = match.replace(/[^\d]/g, '');
                  return cleanPhone.length >= 9 && cleanPhone.length <= 12;
                });
                if (validPhone) {
                  data.phone_number = validPhone.replace(/[^\d]/g, '');
                  console.log('✅ Phone found in element:', data.phone_number);
                  foundModal = true;
                  break;
                }
              }
            }
          }
        }
        
      } catch (error) {
        console.log('Could not click show number button:', error);
      }
    }

    // Look for phone numbers in various formats (only if not found in modal)
    if (!data.phone_number) {
      const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
      const bodyText = document.body.textContent || '';
      const phoneMatches = bodyText.match(phoneRegex);
      
      if (phoneMatches && phoneMatches.length > 0) {
        // Filter out common false positives
        const validPhones = phoneMatches.filter(match => {
          const cleanPhone = match.replace(/[^\d]/g, '');
          return cleanPhone.length >= 9 && 
                 cleanPhone.length <= 12 &&
                 !match.includes('km') && 
                 !match.includes('year') &&
                 !match.includes('202') && // Exclude years
                 !match.includes('201') &&
                 !match.includes('200') &&
                 !match.includes('199');
        });
        
        if (validPhones.length > 0) {
          data.phone_number = validPhones[0].replace(/[^\d]/g, '');
        }
      }
    }
    
    // Final fallback: Look for any text that looks like a UAE phone number
    if (!data.phone_number) {
      const allText = document.body.textContent || '';
      
      // Look for +971 pattern specifically
      const uaePhoneRegex = /\+971[5-9][0-9]{7,8}/g;
      const uaeMatches = allText.match(uaePhoneRegex);
      
      if (uaeMatches && uaeMatches.length > 0) {
        data.phone_number = uaeMatches[0].replace(/[^\d]/g, '');
      } else {
        // Look for any 10-12 digit number that starts with 5-9
        const generalPhoneRegex = /[5-9][0-9]{9,11}/g;
        const generalMatches = allText.match(generalPhoneRegex);
        
        if (generalMatches && generalMatches.length > 0) {
          data.phone_number = generalMatches[0];
        }
      }
    }

    // Look for phone links
    if (!data.phone_number) {
      const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
      for (const link of phoneLinks) {
        const phone = link.href.replace('tel:', '').replace(/[^\d]/g, '');
        if (phone.length >= 9) {
          data.phone_number = phone;
          break;
        }
      }
    }

    // Extract additional details for notes
    const details = [];
    const specSelectors = ['.specifications', '.details', '.features', '.car-details', '.vehicle-details', '[class*="spec"]', '[class*="detail"]'];
    
    for (const selector of specSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text.length > 10 && text.length < 500) {
          details.push(`Specifications: ${text}`);
          break;
        }
      }
    }

    if (details.length > 0) {
      data.notes = details.join('\n');
    }

    // Extract year from title if possible
    const yearMatch = data.vehicle_model.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      data.year = yearMatch[0];
    }

    console.log('Direct extraction result:', data);
    return data;

  } catch (error) {
    console.error('Error in direct extraction:', error);
    return {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead',
      error: error.message
    };
  }
}
