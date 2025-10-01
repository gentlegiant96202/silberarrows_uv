// Car Data Extractor for various car listing sites
// Extracts car details from Dubizzle, AutoTrader, and other sites

class CarDataExtractor {
  constructor() {
    this.siteDetectors = {
      'dubizzle.com': this.extractDubizzleData.bind(this),
      'autotrader.ae': this.extractAutoTraderData.bind(this),
      'cars24.com': this.extractCars24Data.bind(this),
      'yallamotor.com': this.extractYallaMotorData.bind(this),
      'olx.com': this.extractOlxData.bind(this),
      'dubicars.com': this.extractDubicarsData.bind(this),
      'default': this.extractGenericData.bind(this)
    };
  }

  // Main extraction method
  async extractCarData() {
    const url = window.location.href;
    const domain = this.getDomain(url);
    
    console.log('🔍 Extracting car data from:', domain);
    
    const extractor = this.siteDetectors[domain] || this.siteDetectors['default'];
    const data = await extractor();
    
    // Add metadata
    data.extracted_from = url;
    data.extracted_at = new Date().toISOString();
    data.site_domain = domain;
    
    console.log('✅ Extracted car data:', data);
    return data;
  }

  getDomain(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  // Dubizzle extraction
  async extractDubizzleData() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Extract title/model
      const titleSelectors = [
        'h1[data-testid="ad-title"]',
        'h1.ad-title',
        '.ad-title',
        'h1',
        '[data-testid="ad-title"]'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.vehicle_model = element.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '[data-testid="ad-price"]',
        '.ad-price',
        '.price',
        '[class*="price"]',
        '[data-testid="price"]'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      // Extract phone number (try multiple methods)
      data.phone_number = await this.extractPhoneNumber();

      // Extract additional details for notes
      const details = this.extractAdditionalDetails();
      if (details.length > 0) {
        data.notes = details.join('\n');
      }

      // Extract year from title if possible
      const yearMatch = data.vehicle_model.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        data.year = yearMatch[0];
      }

    } catch (error) {
      console.error('Error extracting Dubizzle data:', error);
    }

    return data;
  }

  // AutoTrader extraction
  async extractAutoTraderData() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Extract title
      const titleSelectors = [
        'h1[data-testid="ad-title"]',
        '.ad-title',
        'h1',
        '.vehicle-title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.vehicle_model = element.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '.vehicle-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      data.phone_number = await this.extractPhoneNumber();
      data.notes = this.extractAdditionalDetails().join('\n');

    } catch (error) {
      console.error('Error extracting AutoTrader data:', error);
    }

    return data;
  }

  // Cars24 extraction
  async extractCars24Data() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Extract title
      const titleSelectors = [
        'h1[data-testid="car-title"]',
        '.car-title',
        'h1',
        '.vehicle-title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.vehicle_model = element.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '.car-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      data.phone_number = await this.extractPhoneNumber();
      data.notes = this.extractAdditionalDetails().join('\n');

    } catch (error) {
      console.error('Error extracting Cars24 data:', error);
    }

    return data;
  }

  // YallaMotor extraction
  async extractYallaMotorData() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Extract title
      const titleSelectors = [
        'h1[data-testid="car-title"]',
        '.car-title',
        'h1',
        '.vehicle-title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.vehicle_model = element.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '.car-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      data.phone_number = await this.extractPhoneNumber();
      data.notes = this.extractAdditionalDetails().join('\n');

    } catch (error) {
      console.error('Error extracting YallaMotor data:', error);
    }

    return data;
  }

  // OLX extraction
  async extractOlxData() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Extract title
      const titleSelectors = [
        'h1[data-testid="ad-title"]',
        '.ad-title',
        'h1',
        '.title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.vehicle_model = element.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '.ad-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      data.phone_number = await this.extractPhoneNumber();
      data.notes = this.extractAdditionalDetails().join('\n');

    } catch (error) {
      console.error('Error extracting OLX data:', error);
    }

    return data;
  }

  // Dubicars extraction
  async extractDubicarsData() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Extract title
      const titleSelectors = [
        'h1[data-testid="car-title"]',
        '.car-title',
        'h1',
        '.vehicle-title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.vehicle_model = element.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '.car-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      data.phone_number = await this.extractPhoneNumber();
      data.notes = this.extractAdditionalDetails().join('\n');

    } catch (error) {
      console.error('Error extracting Dubicars data:', error);
    }

    return data;
  }

  // Generic extraction for unknown sites
  async extractGenericData() {
    const data = {
      vehicle_model: '',
      asking_price: null,
      phone_number: '',
      listing_url: window.location.href,
      notes: '',
      status: 'new_lead'
    };

    try {
      // Try to find title in common selectors
      const titleSelectors = [
        'h1',
        'h2',
        '.title',
        '.car-title',
        '.vehicle-title',
        '[class*="title"]',
        '[data-testid*="title"]'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const text = element.textContent.trim();
          // Only use if it looks like a car title (contains year or common car words)
          if (text.match(/\b(19|20)\d{2}\b/) || 
              text.match(/\b(mercedes|bmw|audi|toyota|honda|nissan|ford|chevrolet|hyundai|kia|lexus|infiniti|acura|mazda|subaru|volkswagen|volvo|jaguar|land rover|porsche|ferrari|lamborghini|mclaren|bentley|rolls royce|maserati|alfa romeo|fiat|peugeot|renault|citroen|seat|skoda|dacia|opel|saab|volvo)\b/i)) {
            data.vehicle_model = text;
            break;
          }
        }
      }

      // Try to find price
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '[data-testid*="price"]',
        '.cost',
        '.amount'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.innerText || '';
          const priceMatch = priceText.match(/[\d,]+/);
          if (priceMatch) {
            data.asking_price = parseInt(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }

      data.phone_number = await this.extractPhoneNumber();
      data.notes = this.extractAdditionalDetails().join('\n');

    } catch (error) {
      console.error('Error extracting generic data:', error);
    }

    return data;
  }

  // Extract phone number using multiple methods
  async extractPhoneNumber() {
    // Method 1: Look for phone number in text content
    const phoneRegex = /(\+971|971|0)?[5-9][0-9]{7,8}/g;
    const bodyText = document.body.textContent || '';
    const phoneMatches = bodyText.match(phoneRegex);
    
    if (phoneMatches && phoneMatches.length > 0) {
      // Return the first valid phone number
      for (const match of phoneMatches) {
        const cleanPhone = match.replace(/[^\d]/g, '');
        if (cleanPhone.length >= 9) {
          return cleanPhone;
        }
      }
    }

    // Method 2: Look for clickable phone links
    const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of phoneLinks) {
      const phone = link.href.replace('tel:', '').replace(/[^\d]/g, '');
      if (phone.length >= 9) {
        return phone;
      }
    }

    // Method 3: Look for phone number in specific elements
    const phoneSelectors = [
      '[data-testid*="phone"]',
      '.phone',
      '.contact',
      '.seller-info',
      '.contact-info'
    ];
    
    for (const selector of phoneSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || '';
        const phoneMatch = text.match(phoneRegex);
        if (phoneMatch) {
          const cleanPhone = phoneMatch[0].replace(/[^\d]/g, '');
          if (cleanPhone.length >= 9) {
            return cleanPhone;
          }
        }
      }
    }

    return '';
  }

  // Extract additional details for notes
  extractAdditionalDetails() {
    const details = [];
    
    try {
      // Look for key specifications
      const specSelectors = [
        '.specifications',
        '.details',
        '.features',
        '.car-details',
        '.vehicle-details',
        '[class*="spec"]',
        '[class*="detail"]'
      ];
      
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

      // Look for mileage/kilometers
      const mileageSelectors = [
        '[class*="mileage"]',
        '[class*="km"]',
        '[class*="kilometer"]',
        '[data-testid*="mileage"]'
      ];
      
      for (const selector of mileageSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text.match(/\d+.*km/i)) {
            details.push(`Mileage: ${text}`);
            break;
          }
        }
      }

      // Look for year
      const yearSelectors = [
        '[class*="year"]',
        '[data-testid*="year"]'
      ];
      
      for (const selector of yearSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text.match(/\b(19|20)\d{2}\b/)) {
            details.push(`Year: ${text}`);
            break;
          }
        }
      }

      // Look for color
      const colorSelectors = [
        '[class*="color"]',
        '[data-testid*="color"]'
      ];
      
      for (const selector of colorSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text.length > 2 && text.length < 20) {
            details.push(`Color: ${text}`);
            break;
          }
        }
      }

    } catch (error) {
      console.error('Error extracting additional details:', error);
    }

    return details;
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarDataExtractor;
} else {
  window.CarDataExtractor = CarDataExtractor;
}
