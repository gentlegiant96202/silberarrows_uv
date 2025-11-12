// Run this in the browser console on your form page to inspect field names
// Find all form inputs, selects, and textareas
const formElements = document.querySelectorAll('input, select, textarea');
formElements.forEach((element, index) => {
  const info = {
    index: index,
    tag: element.tagName,
    type: element.type || 'N/A',
    name: element.name || 'NO NAME',
    id: element.id || 'NO ID',
    placeholder: element.placeholder || 'NO PLACEHOLDER',
    value: element.value || 'EMPTY'
  };
  
  // Try to find associated label
  let label = '';
  if (element.id) {
    const labelEl = document.querySelector(`label[for="${element.id}"]`);
    if (labelEl) label = labelEl.textContent.trim();
  }
  
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) label = parentLabel.textContent.trim();
  }
  
  if (!label) {
    const prevLabel = element.previousElementSibling;
    if (prevLabel && prevLabel.tagName === 'LABEL') {
      label = prevLabel.textContent.trim();
    }
  }
  
  info.label = label || 'NO LABEL';
});

// Also check for any WordPress-specific patterns
const wpFields = document.querySelectorAll('[name*="car"], [name*="price"], [name*="year"], [name*="mileage"], [name*="manufacturer"], [name*="transmission"], [name*="colour"], [name*="description"]');
wpFields.forEach(field => {
});
