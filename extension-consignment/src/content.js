// Content script for SilberArrows Consignment Creator extension
console.log('SilberArrows Consignment Creator content script loaded');

let extensionSettings = null;

// Initialize content script
(async function init() {
  try {
    // Get extension settings
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      extensionSettings = response.settings;
      console.log('🔧 Content: Extension settings loaded:', {
        apiUrl: extensionSettings.apiUrl
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
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
      return true; // Keep message channel open for response
  }
});

// Extract car data from current page
async function handleExtractCarData() {
  try {
    console.log('🔍 Starting car data extraction...');
    console.log('📍 Current URL:', window.location.href);
    
    // Use direct extraction method (simpler and more reliable)
    const carData = await extractCarDataDirectly();
    
    console.log('✅ Car data extracted successfully:', carData);
    return carData;
    
  } catch (error) {
    console.error('❌ Error extracting car data:', error);
    throw error;
  }
}

// Direct extraction function (runs in page context)
async function extractCarDataDirectly() {
  try {
    console.log('🔧 Starting direct extraction...');
    
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
    
    console.log('📊 Initial data structure:', data);

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
        console.log(`🔍 Found title with selector "${selector}":`, title);
        // Skip if it's just a price (contains AED)
        if (!title.includes('AED')) {
          data.vehicle_model = title;
          console.log('✅ Title extracted:', data.vehicle_model);
          break;
        } else {
          console.log('⏭️ Skipping price-only element:', title);
        }
      }
    }
    
    // Fallback: If no title found, look for any text that might be a car title
    if (!data.vehicle_model) {
      console.log('🔍 No title found with selectors, trying fallback...');
      const allText = document.body.textContent || '';
      const carBrands = ['Mercedes', 'BMW', 'Audi', 'Toyota', 'Honda', 'Nissan', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Lexus', 'Infiniti', 'Acura', 'Mazda', 'Subaru', 'Volkswagen', 'Volvo', 'Jaguar', 'Land Rover', 'Porsche', 'Ferrari', 'Lamborghini', 'McLaren', 'Bentley', 'Rolls Royce', 'Maserati', 'Alfa Romeo', 'Fiat', 'Peugeot', 'Renault', 'Citroen', 'Seat', 'Skoda', 'Dacia', 'Opel', 'Saab', 'Volvo'];
      
      for (const brand of carBrands) {
        const brandRegex = new RegExp(`(${brand}[^\\n\\r]{0,50})`, 'i');
        const match = allText.match(brandRegex);
        if (match) {
          data.vehicle_model = match[1].trim();
          console.log('✅ Title found with fallback:', data.vehicle_model);
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
        console.log(`💰 Checking price with selector "${selector}":`, priceText);
        // Look for AED price pattern
        const priceMatch = priceText.match(/AED\s*([\d,]+)/i);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          // Only accept reasonable car prices (between 5,000 and 2,000,000 AED)
          if (price >= 5000 && price <= 2000000) {
            data.asking_price = price;
            console.log('✅ Price extracted (AED pattern):', data.asking_price);
            break;
          } else {
            console.log('⏭️ Skipping unreasonable price:', price);
          }
        }
        // Fallback to any number pattern
        const numberMatch = priceText.match(/([\d,]+)/);
        if (numberMatch) {
          const price = parseInt(numberMatch[1].replace(/,/g, ''));
          // Only accept reasonable car prices
          if (price >= 5000 && price <= 2000000) {
            data.asking_price = price;
            console.log('✅ Price extracted (number pattern):', data.asking_price);
            break;
          } else {
            console.log('⏭️ Skipping unreasonable price:', price);
          }
        }
      }
    }

    // Extract phone number - Updated for Dubizzle structure
    // First try to find "Show Number" buttons and click them
    console.log('🔍 Looking for "Show Number" buttons...');
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
      console.log('🖱️ Clicking "Show Number" buttons...');
      // Try to click all "Show Number" buttons
      for (let i = 0; i < showNumberButtons.length; i++) {
        try {
          console.log(`🖱️ Clicking button ${i + 1}:`, showNumberButtons[i].textContent);
          
          // Scroll button into view first
          showNumberButtons[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Wait a moment for scroll
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Click the button
          showNumberButtons[i].click();
          
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
            
            // Final fallback: scan entire page text
            if (!foundModal) {
              const allText = document.body.textContent;
              const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
              const allPhoneMatches = allText.match(phoneRegex);
              
              if (allPhoneMatches && allPhoneMatches.length > 0) {
                console.log('📞 All phone matches on page:', allPhoneMatches);
                const validPhone = allPhoneMatches.find(match => {
                  const cleanPhone = match.replace(/[^\d]/g, '');
                  return cleanPhone.length >= 9 && cleanPhone.length <= 12;
                });
                if (validPhone) {
                  data.phone_number = validPhone.replace(/[^\d]/g, '');
                  console.log('✅ Phone found in page content:', data.phone_number);
                }
              }
            }
          }
        } catch (error) {
          console.log('❌ Could not click show number button:', error);
        }
      }
    }

    // Look for phone numbers in various formats (only if not found in modal)
    if (!data.phone_number) {
      console.log('🔍 Looking for phone numbers in page content...');
      const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
      const bodyText = document.body.textContent || '';
      const phoneMatches = bodyText.match(phoneRegex);
      
      if (phoneMatches && phoneMatches.length > 0) {
        console.log('📞 Found phone matches:', phoneMatches);
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
        
        console.log('📞 Valid phones after filtering:', validPhones);
        
        if (validPhones.length > 0) {
          data.phone_number = validPhones[0].replace(/[^\d]/g, '');
          console.log('✅ Phone extracted from page:', data.phone_number);
        }
      }
    }

    // Look for phone links
    if (!data.phone_number) {
      console.log('🔍 Looking for phone links...');
      const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
      for (const link of phoneLinks) {
        const phone = link.href.replace('tel:', '').replace(/[^\d]/g, '');
        if (phone.length >= 9) {
          data.phone_number = phone;
          console.log('✅ Phone found in link:', data.phone_number);
          break;
        }
      }
    }
    
    // Final fallback: Look for any text that looks like a UAE phone number
    if (!data.phone_number) {
      console.log('🔍 Final fallback: Looking for UAE phone patterns...');
      const allText = document.body.textContent || '';
      
      // Look for +971 pattern specifically
      const uaePhoneRegex = /\+971[5-9][0-9]{7,8}/g;
      const uaeMatches = allText.match(uaePhoneRegex);
      
      if (uaeMatches && uaeMatches.length > 0) {
        console.log('📞 Found UAE phone pattern:', uaeMatches);
        data.phone_number = uaeMatches[0].replace(/[^\d]/g, '');
        console.log('✅ Phone found with UAE pattern:', data.phone_number);
      } else {
        // Look for any 10-12 digit number that starts with 5-9
        const generalPhoneRegex = /[5-9][0-9]{9,11}/g;
        const generalMatches = allText.match(generalPhoneRegex);
        
        if (generalMatches && generalMatches.length > 0) {
          console.log('📞 Found general phone pattern:', generalMatches);
          data.phone_number = generalMatches[0];
          console.log('✅ Phone found with general pattern:', data.phone_number);
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

    console.log('🎯 Final extraction result:', data);
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
    console.log('✅ Consignment created:', result);
    
    // Show success notification
    showSuccessNotification(`✅ Consignment created: ${consignmentData.vehicle_model}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error creating consignment:', error);
    
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
