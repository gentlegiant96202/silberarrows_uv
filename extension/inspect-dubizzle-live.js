// Live Dubizzle Field Inspector
// Copy and paste this into the browser console on a dubizzle car listing form page

console.log('🔍 Live Dubizzle Field Inspector - Scanning current page...');

// Find all form inputs, selects, and textareas
const allInputs = document.querySelectorAll('input, select, textarea');
const results = {};

console.log(`Found ${allInputs.length} form elements total`);

// Group by likely field types based on name, id, placeholder, etc.
allInputs.forEach((element, index) => {
  const info = {
    tag: element.tagName.toLowerCase(),
    type: element.type || 'N/A',
    name: element.name || '',
    id: element.id || '',
    placeholder: element.placeholder || '',
    className: element.className || '',
    selector: getUniqueSelector(element)
  };
  
  // Try to guess field type
  const text = (info.name + ' ' + info.id + ' ' + info.placeholder + ' ' + info.className).toLowerCase();
  
  let fieldType = 'unknown';
  if (text.includes('make') || text.includes('brand')) fieldType = 'make';
  else if (text.includes('model')) fieldType = 'model';
  else if (text.includes('year')) fieldType = 'year';
  else if (text.includes('price') || text.includes('cost')) fieldType = 'price';
  else if (text.includes('mileage') || text.includes('km') || text.includes('odometer')) fieldType = 'mileage';
  else if (text.includes('color') || text.includes('colour')) fieldType = 'color';
  else if (text.includes('transmission') || text.includes('gear')) fieldType = 'transmission';
  else if (text.includes('fuel') || text.includes('petrol') || text.includes('diesel')) fieldType = 'fuel';
  else if (text.includes('body') || text.includes('type') || text.includes('style')) fieldType = 'bodyType';
  else if (text.includes('condition') || text.includes('state')) fieldType = 'condition';
  else if (text.includes('location') || text.includes('city') || text.includes('area')) fieldType = 'location';
  else if (text.includes('description') || text.includes('detail')) fieldType = 'description';
  else if (text.includes('image') || text.includes('photo') || text.includes('picture')) fieldType = 'images';
  else if (text.includes('reference') || text.includes('stock') || text.includes('vin')) fieldType = 'reference';
  
  if (!results[fieldType]) results[fieldType] = [];
  results[fieldType].push(info);
});

// Helper function to generate unique selector
function getUniqueSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.name) return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.length > 0);
    if (classes.length > 0) return `${element.tagName.toLowerCase()}.${classes[0]}`;
  }
  return `${element.tagName.toLowerCase()}:nth-of-type(${Array.from(element.parentNode.children).indexOf(element) + 1})`;
}

// Display results
console.log('\n📋 DUBIZZLE FIELD MAPPING RESULTS:');
console.log('Copy these selectors into your extension:\n');

Object.keys(results).sort().forEach(fieldType => {
  if (results[fieldType].length > 0) {
    console.log(`${fieldType.toUpperCase()}:`);
    results[fieldType].forEach(field => {
      console.log(`  ${field.selector} // ${field.tag}${field.type !== 'N/A' ? '[' + field.type + ']' : ''} - ${field.name || field.id || 'no-name'}`);
    });
    console.log('');
  }
});

// Generate extension-ready mapping
console.log('\n🔧 EXTENSION MAPPING FORMAT:');
const mapping = {};
Object.keys(results).forEach(fieldType => {
  if (results[fieldType].length > 0 && fieldType !== 'unknown') {
    mapping[fieldType] = results[fieldType].map(f => f.selector);
  }
});

console.log('dubizzle.com: {');
Object.keys(mapping).forEach(key => {
  console.log(`  ${key}: ${JSON.stringify(mapping[key])},`);
});
console.log('}');

console.log('\n✅ Inspection complete! Check the console output above.');
