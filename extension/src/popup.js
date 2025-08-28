// Popup script for SilberArrows Car Filler extension
let allCars = [];
let selectedCar = null;

// DOM elements
const searchInput = document.getElementById('search');
const carList = document.getElementById('carList');
const fillBtn = document.getElementById('fillBtn');
const optionsBtn = document.getElementById('optionsBtn');
const statusDiv = document.getElementById('status');

// API configuration
const API_BASE = 'http://localhost:3000'; // TODO: Make this configurable

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadCars();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  fillBtn.addEventListener('click', handleFill);
  optionsBtn.addEventListener('click', openOptions);
}

// Load cars from API
async function loadCars() {
  try {
    showStatus('Loading cars...', 'loading');
    
    const response = await fetch(`${API_BASE}/api/extension-car-data`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load cars');
    }
    
    allCars = data.cars || [];
    renderCarList(allCars);
    hideStatus();
    
  } catch (error) {
    console.error('Failed to load cars:', error);
    showStatus(`Error: ${error.message}`, 'error');
    carList.innerHTML = `
      <div class="status error">
        Failed to load cars. Check your connection.
      </div>
    `;
  }
}

// Render car list
function renderCarList(cars) {
  if (cars.length === 0) {
    carList.innerHTML = `
      <div class="status">
        No cars found matching your search.
      </div>
    `;
    return;
  }
  
  carList.innerHTML = cars.map(car => `
    <div class="car-option" data-car-id="${car.id}">
      <div class="name">${car.displayName}</div>
      <div class="price">AED ${formatPrice(car.price)}</div>
    </div>
  `).join('');
  
  // Add click listeners
  carList.querySelectorAll('.car-option').forEach(option => {
    option.addEventListener('click', () => selectCar(option.dataset.carId));
  });
}

// Handle search
function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    renderCarList(allCars);
    return;
  }
  
  const filtered = allCars.filter(car => 
    car.displayName.toLowerCase().includes(query) ||
    car.stockNumber.toLowerCase().includes(query)
  );
  
  renderCarList(filtered);
}

// Select a car
function selectCar(carId) {
  // Remove previous selection
  carList.querySelectorAll('.car-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // Add selection to clicked option
  const option = carList.querySelector(`[data-car-id="${carId}"]`);
  if (option) {
    option.classList.add('selected');
    selectedCar = allCars.find(car => car.id === carId);
    fillBtn.disabled = false;
  }
}

// Handle fill button click
async function handleFill() {
  if (!selectedCar) {
    showStatus('Please select a car first', 'error');
    return;
  }
  
  try {
    fillBtn.disabled = true;
    showStatus('Fetching car details...', 'loading');
    
    // Get detailed car data
    const response = await fetch(`${API_BASE}/api/extension-car-data?id=${selectedCar.id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch car details');
    }
    
    // Send data to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'fillCarData',
      carData: data.car
    });
    
    showStatus('Car data filled successfully!', 'success');
    
    // Auto-close popup after success
    setTimeout(() => {
      window.close();
    }, 1500);
    
  } catch (error) {
    console.error('Fill failed:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    fillBtn.disabled = false;
  }
}

// Open options page
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// Show status message
function showStatus(message, type = 'loading') {
  statusDiv.className = `status ${type}`;
  statusDiv.innerHTML = type === 'loading' 
    ? `<span class="loading-spinner"></span>${message}`
    : message;
  statusDiv.classList.remove('hidden');
}

// Hide status message
function hideStatus() {
  statusDiv.classList.add('hidden');
}

// Format price with commas
function formatPrice(price) {
  if (!price) return 'N/A';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
