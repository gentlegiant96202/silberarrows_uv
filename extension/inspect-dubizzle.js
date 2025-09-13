// Dubizzle Field Inspector
// Run this in the browser console on dubizzle.com car listing form page

console.log('🔍 Dubizzle Field Inspector - Finding form fields...');

// Common field types to look for
const fieldTypes = {
  'Make': ['make', 'brand', 'manufacturer'],
  'Model': ['model', 'car-model'],
  'Year': ['year', 'model-year'],
  'Price': ['price', 'cost', 'amount'],
  'Mileage': ['mileage', 'odometer', 'km', 'kilometers'],
  'Color': ['color', 'colour', 'paint'],
  'Transmission': ['transmission', 'gearbox'],
  'Fuel Type': ['fuel', 'petrol', 'diesel', 'gas'],
  'Body Type': ['body', 'type', 'style'],
  'Condition': ['condition', 'state'],
  'Location': ['location', 'city', 'area'],
  'Description': ['description', 'details', 'info'],
  'Images': ['image', 'photo', 'picture'],
  'Seller Type': ['seller', 'dealer', 'owner']
};

const results = {};

// Function to find fields by various methods
function findFields() {
  Object.keys(fieldTypes).forEach(fieldName => {
    const keywords = fieldTypes[fieldName];
    const found = [];
    
    keywords.forEach(keyword => {
      // Method 1: data-testid attributes
      const testIds = document.querySelectorAll(`[data-testid*="${keyword}"]`);
      testIds.forEach(el => {
        found.push({
          selector: `[data-testid="${el.getAttribute('data-testid')}"]`,
          type: el.tagName.toLowerCase(),
          method: 'data-testid'
        });
      });
      
      // Method 2: name attributes
      const names = document.querySelectorAll(`[name*="${keyword}"]`);
      names.forEach(el => {
        found.push({
          selector: `[name="${el.getAttribute('name')}"]`,
          type: el.tagName.toLowerCase(),
          method: 'name'
        });
      });
      
      // Method 3: id attributes
      const ids = document.querySelectorAll(`[id*="${keyword}"]`);
      ids.forEach(el => {
        found.push({
          selector: `#${el.id}`,
          type: el.tagName.toLowerCase(),
          method: 'id'
        });
      });
      
      // Method 4: class names
      const classes = document.querySelectorAll(`[class*="${keyword}"]`);
      classes.forEach(el => {
        if (el.classList.length > 0) {
          const relevantClass = Array.from(el.classList).find(cls => cls.includes(keyword));
          if (relevantClass) {
            found.push({
              selector: `.${relevantClass}`,
              type: el.tagName.toLowerCase(),
              method: 'class'
            });
          }
        }
      });
    });
    
    // Remove duplicates
    const unique = found.filter((item, index, self) => 
      index === self.findIndex(t => t.selector === item.selector)
    );
    
    if (unique.length > 0) {
      results[fieldName] = unique;
    }
  });
}

// Run the field finder
findFields();

// Display results
console.log('\n📋 DUBIZZLE FIELD MAPPING RESULTS:');
console.log('Copy this into your extension background.js:\n');

let mappingCode = "'dubizzle.com': {\n";

Object.keys(results).forEach(fieldName => {
  const selectors = results[fieldName].map(item => `'${item.selector}'`).join(', ');
  const jsFieldName = fieldName.toLowerCase().replace(/\s+/g, '').replace('type', 'Type');
  
  console.log(`${fieldName}:`, results[fieldName]);
  mappingCode += `  ${jsFieldName}: [${selectors}],\n`;
});

mappingCode += '},';

console.log('\n🔧 EXTENSION MAPPING CODE:');
console.log(mappingCode);

// Also show a summary
console.log('\n📊 SUMMARY:');
console.log(`Found ${Object.keys(results).length} field types`);
console.log(`Total selectors: ${Object.values(results).reduce((sum, arr) => sum + arr.length, 0)}`);

// Test if we can find common form elements
console.log('\n🧪 TESTING COMMON SELECTORS:');
const commonSelectors = [
  'select[data-testid*="make"]',
  'select[data-testid*="model"]', 
  'select[data-testid*="year"]',
  'input[data-testid*="price"]',
  'input[data-testid*="mileage"]',
  'textarea[data-testid*="description"]'
];

commonSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  if (elements.length > 0) {
    console.log(`✅ ${selector}: Found ${elements.length} element(s)`);
  } else {
    console.log(`❌ ${selector}: Not found`);
  }
});
