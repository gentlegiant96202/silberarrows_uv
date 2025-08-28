// Quick test to see if the form fields exist
console.log('🔍 Testing SilberArrows form selectors...');

const testSelectors = [
  'textarea[name="c-description"]',
  'textarea[name="c-key-equipment"]', 
  'textarea[name="c-technical-data"]',
  'input[name="c-title"]',
  'input[name="c-price"]',
  'select[name="c-manufacturer"]'
];

testSelectors.forEach(selector => {
  const element = document.querySelector(selector);
  console.log(`${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (element) {
    console.log(`  - Tag: ${element.tagName}, Name: ${element.name}, ID: ${element.id || 'NO ID'}`);
  }
});

// Also check if any description-related fields exist
console.log('\n🔍 Looking for any description-related fields...');
const descFields = document.querySelectorAll('[name*="description"], [id*="description"], textarea');
descFields.forEach((field, i) => {
  console.log(`${i+1}. ${field.tagName} - name="${field.name}" id="${field.id}" placeholder="${field.placeholder || 'none'}"`);
});
