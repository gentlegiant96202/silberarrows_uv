// Quick test to see if the form fields exist
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
  if (element) {
  }
});

// Also check if any description-related fields exist
const descFields = document.querySelectorAll('[name*="description"], [id*="description"], textarea');
descFields.forEach((field, i) => {
});
