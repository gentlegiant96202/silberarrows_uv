// Content script for SilberArrows Consignment Creator extension
let extensionSettings = null;

// Initialize content script
(async function init() {
  try {
    // Get extension settings
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      extensionSettings = response.settings;
    }
  } catch (error) {
  }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'ping':
      sendResponse({ success: true, message: 'Content script is ready' });
      return true; // Keep message channel open for response
      
    case 'extractCarData':
      handleExtractCarData()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'createConsignment':
      handleCreateConsignment(message.consignmentData)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return true; // Keep message channel open for response
  }
});

// Extract car data from current page
async function handleExtractCarData() {
  try {
    // Use direct extraction method (simpler and more reliable)
    const carData = await extractCarDataDirectly();
    return carData;
    
  } catch (error) {
    throw error;
  }
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
        } else {
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
          } else {
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
          } else {
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
    if (showNumberButtons.length > 0) {
      // Try to click all "Show Number" buttons
      for (let i = 0; i < showNumberButtons.length; i++) {
        try {
          // Scroll button into view first
          showNumberButtons[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Wait a moment for scroll
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Click the button
          showNumberButtons[i].click();
          
          // Wait longer for the modal to appear
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Look for phone number in modal that appeared
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
            for (const modal of modals) {
              if (modal && modal.textContent) {
                // Look for phone number with more comprehensive regex
                const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
                const modalText = modal.textContent;
                const phoneMatches = modalText.match(phoneRegex);
                if (phoneMatches && phoneMatches.length > 0) {
                  const validPhone = phoneMatches.find(match => {
                    const cleanPhone = match.replace(/[^\d]/g, '');
                    return cleanPhone.length >= 9 && cleanPhone.length <= 12;
                  });
                  if (validPhone) {
                    data.phone_number = validPhone.replace(/[^\d]/g, '');
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
            // Look for any element that might contain the phone number
            const allElements = document.querySelectorAll('*');
            for (const element of allElements) {
              if (element.textContent && element.textContent.length < 1000) { // Only check elements with reasonable text length
                const text = element.textContent;
                const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
                const phoneMatches = text.match(phoneRegex);
                
                if (phoneMatches && phoneMatches.length > 0) {
                  const validPhone = phoneMatches.find(match => {
                    const cleanPhone = match.replace(/[^\d]/g, '');
                    return cleanPhone.length >= 9 && cleanPhone.length <= 12;
                  });
                  if (validPhone) {
                    data.phone_number = validPhone.replace(/[^\d]/g, '');
                    foundModal = true;
                    break;
                  }
                }
              }
            }
            
            // Final fallback: scan entire page text
            if (!foundModal) {
              const allText = document.body.textContent;
              const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
              const allPhoneMatches = allText.match(phoneRegex);
              
              if (allPhoneMatches && allPhoneMatches.length > 0) {
                const validPhone = allPhoneMatches.find(match => {
                  const cleanPhone = match.replace(/[^\d]/g, '');
                  return cleanPhone.length >= 9 && cleanPhone.length <= 12;
                });
                if (validPhone) {
                  data.phone_number = validPhone.replace(/[^\d]/g, '');
                }
              }
            }
          }
        } catch (error) {
        }
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
    return data;

  } catch (error) {
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


// Create consignment from extracted data
async function handleCreateConsignment(consignmentData) {
  try {
    const apiUrl = extensionSettings?.apiUrl || 'https://portal.silberarrows.com';
    const response = await fetch(`${apiUrl}/api/consignments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consignmentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    // Show success notification
    showSuccessNotification(`✅ Consignment created: ${consignmentData.vehicle_model}`);
    
    return result;
    
  } catch (error) {
    // Show error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    notification.textContent = `❌ Error: ${error.message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
    
    throw error;
  }
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
