#!/usr/bin/env python3
"""
Enhanced Dubizzle Scraper for Next.js Integration
Based on: https://github.com/gentlegiant96202/scraper.git
Features: Real phone extraction, duplicate detection, progress tracking
"""

import time
import random
import json
import sys
import os
import re
from datetime import datetime
from typing import List, Dict, Optional, Set
import logging

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException, StaleElementReferenceException
from webdriver_manager.chrome import ChromeDriverManager

# Setup logging to stderr so stdout is clean for JSON
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

class NextJSScraperProgress:
    """Progress tracker for Next.js integration"""
    
    def __init__(self, job_id: str, max_cars: int):
        self.job_id = job_id
        self.max_cars = max_cars
        self.processed = 0
        self.successful_leads = 0
        self.skipped_duplicates = 0
        
    def update_progress(self, status: str, message: str = "", car_data: Dict = None):
        """Send progress update to Next.js via stdout JSON"""
        progress_data = {
            "job_id": self.job_id,
            "status": status,
            "message": message,
            "processed": self.processed,
            "successful_leads": self.successful_leads,
            "skipped_duplicates": self.skipped_duplicates,
            "max_cars": self.max_cars,
            "success_rate": round((self.successful_leads / max(1, self.processed)) * 100, 1),
            "timestamp": datetime.now().isoformat()
        }
        
        if car_data:
            progress_data["car_data"] = car_data
            
        # Send to Next.js via stdout - removed emoji to fix JSON parsing
        print(f"PYTHON_PROGRESS: {json.dumps(progress_data)}")
        sys.stdout.flush()
        
        # Also log to stderr for debugging
        logger.info(f"Progress: {status} - {message} - Processed: {self.processed}/{self.max_cars} - Success: {self.successful_leads}")

class DubizzleScraper:
    """Enhanced Dubizzle scraper with real phone extraction"""
    
    def __init__(self, job_id: str, max_cars: int = 20):
        self.driver: Optional[webdriver.Chrome] = None
        self.progress = NextJSScraperProgress(job_id, max_cars)
        self.scraped_data: List[Dict] = []
        self.existing_phones: Set[str] = set()
        # Load existing phone numbers from database to prevent duplicates
        self.load_existing_phones()
        
    def load_existing_phones(self):
        """Load existing phone numbers from database to prevent duplicates"""
        try:
            # This would normally use a database connection, but since we're running as a subprocess,
            # we'll let the Node.js API handle the duplicate checking
            # For now, we'll just initialize an empty set and rely on database constraints
            self.existing_phones = set()
            logger.info("Initialized duplicate detection (database checking handled by API)")
        except Exception as e:
            logger.error(f"Error loading existing phones: {e}")
            self.existing_phones = set()

    def setup_driver(self):
        """Setup Chrome WebDriver with optimized settings"""
        chrome_options = Options()
        # Remove headless mode so you can see the browser working
        # chrome_options.add_argument('--headless=new')  # Commented out for debugging
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    def normalize_phone(self, phone: str) -> str:
        """Normalize phone number for comparison"""
        if not phone:
            return ""
        return re.sub(r'[\s\-\.\(\)\+]', '', str(phone))

    def is_phone_duplicate(self, phone: str) -> bool:
        """Check if phone number is a duplicate in current session"""
        normalized = self.normalize_phone(phone)
        return normalized in self.existing_phones if normalized else False

    def add_phone_to_session(self, phone: str):
        """Add phone number to current session duplicates"""
        normalized = self.normalize_phone(phone)
        if normalized:
            self.existing_phones.add(normalized)

    def find_car_listings(self, search_url: str) -> List[str]:
        """Find all car listing URLs from search pages"""
        self.progress.update_progress("running", "Finding car listings...")
        
        car_urls = []
        page_num = 1
        max_pages = 10  # Limit to prevent infinite loops
        
        while page_num <= max_pages:
            current_url = f"{search_url}&page={page_num}" if page_num > 1 else search_url
            
            try:
                self.driver.get(current_url)
                time.sleep(3)
                
                # Handle any popups
                try:
                    popup_selectors = [
                        'button:has-text("Accept")',
                        'button:has-text("Don\'t Allow")',
                        '[data-testid="popup-close"]'
                    ]
                    for selector in popup_selectors:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        if elements and elements[0].is_displayed():
                            elements[0].click()
                            time.sleep(1)
                            break
                except:
                    pass
                
                # Find car listing links - look for individual car pages with date patterns
                page_car_urls = []
                
                try:
                    all_links = self.driver.find_elements(By.TAG_NAME, 'a')
                    for link in all_links:
                        href = link.get_attribute('href')
                        if href and '/motors/used-cars/' in href:
                            # Look for URLs with date patterns like /2025/6/27/ which indicate individual car pages
                            if '/' in href and len(href.split('/')) > 8:  # Individual car pages have many path segments
                                # Check if it's not a pagination or filter link
                                if not any(param in href for param in ['page=', 'seller_type=', 'fuel_type=', 'year__']):
                                    if href not in car_urls:
                                        page_car_urls.append(href)
                except:
                    pass
                
                if not page_car_urls:
                    logger.info(f"No cars found on page {page_num}, stopping pagination")
                    break
                    
                car_urls.extend(page_car_urls)
                logger.info(f"Found {len(page_car_urls)} cars on page {page_num}")
                
                # Debug: Log first few URLs to see what we're getting
                if page_car_urls:
                    logger.info(f"Sample URLs from page {page_num}:")
                    for i, url in enumerate(page_car_urls[:3]):
                        logger.info(f"  {i+1}: {url}")
                
                # Check for next page
                try:
                    next_button = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="pagination-next-page"], .pagination-next')
                    if not next_button.is_enabled():
                        break
                except:
                    break
                    
                page_num += 1
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error on page {page_num}: {e}")
                break
        
        self.progress.update_progress("running", f"Found {len(car_urls)} car listings")
        return car_urls

    def find_and_click_call_button(self) -> bool:
        """Find and click the call button to reveal real phone number"""
        # More comprehensive selectors for Dubizzle call buttons
        call_button_selectors = [
            'button[class*="call"]',
            'a[class*="call"]',
            'button[class*="phone"]', 
            'a[class*="phone"]',
            'button[class*="contact"]',
            'a[class*="contact"]',
            '[data-testid*="call"]',
            '[data-testid*="phone"]',
            '[data-testid*="contact"]',
            'button:contains("Call")',
            'a:contains("Call")',
            'button:contains("اتصل")',
            'a:contains("اتصل")'
        ]
        
        # Also try to find buttons by text content
        try:
            all_buttons = self.driver.find_elements(By.TAG_NAME, "button")
            all_links = self.driver.find_elements(By.TAG_NAME, "a")
            
            for element in all_buttons + all_links:
                try:
                    text = element.text.lower()
                    if any(keyword in text for keyword in ['call', 'phone', 'contact', 'اتصل']):
                        if element.is_displayed() and element.is_enabled():
                            # Use WebDriverWait to ensure element is clickable
                            wait = WebDriverWait(self.driver, 5)
                            clickable_element = wait.until(EC.element_to_be_clickable(element))
                            clickable_element.click()
                            logger.info(f"✅ Call button clicked successfully: {text}")
                            return True
                except (TimeoutException, ElementClickInterceptedException, StaleElementReferenceException):
                    continue
                except Exception as e:
                    logger.debug(f"Error clicking element: {e}")
                    continue
        except Exception as e:
            logger.debug(f"Error finding buttons by text: {e}")
        
        # Try the CSS selectors as fallback
        for selector in call_button_selectors:
            try:
                wait = WebDriverWait(self.driver, 2)
                element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
                element.click()
                logger.info(f"✅ Call button clicked via CSS selector: {selector}")
                return True
            except TimeoutException:
                continue
            except Exception as e:
                logger.debug(f"Error with selector {selector}: {e}")
                continue
        
        return False

    def wait_for_phone_to_appear(self, timeout: int = 10) -> str:
        """Wait for phone number to appear after clicking call button using WebDriverWait"""
        # Define custom expected condition for phone number
        class PhoneNumberPresent:
            def __init__(self):
                self.phone_selectors = [
                    'a[href^="tel:"]',
                    '[class*="phone"]',
                    '[data-testid*="phone"]',
                    'span[class*="phone"]',
                    'div[class*="phone"]',
                    'p[class*="phone"]',
                    '[class*="contact"]',
                    'span[class*="contact"]',
                    'div[class*="contact"]',
                    # Look for elements containing UAE phone patterns
                    '//*[contains(text(), "+971")]',
                    '//*[contains(text(), "050")]',
                    '//*[contains(text(), "055")]',
                    '//*[contains(text(), "056")]',
                    '//*[contains(text(), "052")]',
                    '//*[contains(text(), "054")]'
                ]
                
            def __call__(self, driver):
                # Try CSS selectors first
                for selector in self.phone_selectors[:9]:  # CSS selectors
                    try:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in elements:
                            if element.is_displayed():
                                text = element.text or element.get_attribute('href') or element.get_attribute('textContent') or ''
                                if text:
                                    # Extract UAE phone number
                                    phone_match = re.search(r'(\+971|971|0)(50|55|56|52|54)\d{7}', text)
                                    if phone_match:
                                        return phone_match.group(0)
                    except:
                        continue
                
                # Try XPath selectors for text content
                for xpath in self.phone_selectors[9:]:  # XPath selectors
                    try:
                        elements = driver.find_elements(By.XPATH, xpath)
                        for element in elements:
                            if element.is_displayed():
                                text = element.text or element.get_attribute('textContent') or ''
                                if text:
                                    # Extract UAE phone number
                                    phone_match = re.search(r'(\+971|971|0)(50|55|56|52|54)\d{7}', text)
                                    if phone_match:
                                        return phone_match.group(0)
                    except:
                        continue
                
                # Also check all visible text on the page for phone numbers
                try:
                    page_text = driver.find_element(By.TAG_NAME, 'body').text
                    phone_matches = re.findall(r'(\+971|971|0)(50|55|56|52|54)\d{7}', page_text)
                    if phone_matches:
                        # Return the first phone number found
                        return phone_matches[0][0] + phone_matches[0][1] + phone_matches[0][2:] if len(phone_matches[0]) > 2 else ''.join(phone_matches[0])
                except:
                    pass
                
                return False
        
        try:
            wait = WebDriverWait(self.driver, timeout)
            phone_number = wait.until(PhoneNumberPresent())
            logger.info(f"📱 Phone number found after waiting: {phone_number}")
            return phone_number
        except TimeoutException:
            logger.warning(f"⏰ Timeout waiting for phone number to appear after {timeout} seconds")
            return ""
        except Exception as e:
            logger.error(f"❌ Error waiting for phone number: {e}")
            return ""

    def extract_phone_after_click(self) -> str:
        """Extract phone number after clicking call button with enhanced waiting"""
        # First, wait a short time for any immediate changes
        time.sleep(2)
        
        # Try the enhanced waiting mechanism
        phone_number = self.wait_for_phone_to_appear(timeout=15)
        if phone_number:
            return phone_number
        
        # Fallback to the old method with some additional selectors
        phone_selectors = [
            'a[href^="tel:"]',
            '[class*="phone"]',
            '[data-testid*="phone"]',
            'span[class*="phone"]',
            'div[class*="phone"]',
            'p[class*="phone"]',
            '[class*="contact"]',
            'span[class*="contact"]',
            'div[class*="contact"]',
            # More specific Dubizzle selectors
            '[class*="number"]',
            '[class*="mobile"]',
            '[class*="tel"]',
            'span:has-text("+971")',
            'span:has-text("050")',
            'span:has-text("055")',
            'span:has-text("056")',
            'span:has-text("052")',
            'span:has-text("054")'
        ]
        
        for selector in phone_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    if element.is_displayed():
                        text = element.text or element.get_attribute('href') or element.get_attribute('textContent') or ''
                        if text:
                            # Extract UAE phone number
                            phone_match = re.search(r'(\+971|971|0)(50|55|56|52|54)\d{7}', text)
                            if phone_match:
                                logger.info(f"📱 Phone found via fallback method: {phone_match.group(0)}")
                                return phone_match.group(0)
            except:
                continue
        
        # Final fallback - check entire page source
        try:
            page_source = self.driver.page_source
            phone_matches = re.findall(r'(\+971|971|0)(50|55|56|52|54)\d{7}', page_source)
            if phone_matches:
                phone = ''.join(phone_matches[0])
                logger.info(f"📱 Phone found in page source: {phone}")
                return phone
        except:
            pass
        
        return ""

    def get_car_details(self, car_url: str) -> Dict:
        """Extract car details including real phone number"""
        car_data = {
            'url': car_url,
            'title': '',
            'price': '',
            'phone_number': '',
            'button_clicked': False,
            'phone_revealed': False,
            'scraped_at': datetime.now().isoformat()
        }
        
        try:
            self.driver.get(car_url)
            # Wait for page to load
            wait = WebDriverWait(self.driver, 10)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(3)
            
            # Extract title
            title_selectors = ['h1', '[data-testid*="title"]', '.listing-title']
            for selector in title_selectors:
                try:
                    element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    car_data['title'] = element.text.strip()
                    break
                except:
                    continue
            
            # Extract price
            price_selectors = ['[class*="price"]', '[data-testid*="price"]']
            for selector in price_selectors:
                try:
                    element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    price_text = element.text.strip()
                    car_data['price'] = re.sub(r'[^\d]', '', price_text)
                    break
                except:
                    continue
            
            # Try to click call button and get real phone
            button_clicked = self.find_and_click_call_button()
            car_data['button_clicked'] = button_clicked
            
            if button_clicked:
                # Use enhanced phone extraction with proper waiting
                phone_number = self.extract_phone_after_click()
                if phone_number:
                    car_data['phone_number'] = phone_number
                    car_data['phone_revealed'] = True
                    logger.info(f"🎉 PHONE FOUND: {phone_number}")
                else:
                    logger.warning(f"❌ No phone found despite clicking button for: {car_data['title'][:50]}...")
            else:
                logger.warning(f"❌ Could not find/click call button for: {car_data['title'][:50]}...")
            
        except Exception as e:
            logger.error(f"Error extracting car details: {e}")
        
        return car_data

    def scrape_cars(self, search_url: str, max_cars: int = 20):
        """Main scraping method"""
        self.progress.update_progress("running", "Starting scraper...")
        
        try:
            self.setup_driver()
            car_urls = self.find_car_listings(search_url)
            
            if not car_urls:
                self.progress.update_progress("error", "No car listings found")
                return
            
            self.progress.update_progress("running", f"Processing {min(len(car_urls), max_cars)} cars")
            
            for i, car_url in enumerate(car_urls[:max_cars]):
                self.progress.processed = i + 1
                
                self.progress.update_progress("running", f"Processing car {i+1}/{min(len(car_urls), max_cars)}")
                
                car_data = self.get_car_details(car_url)
                
                # Check for duplicate phone in current session
                if car_data['phone_number'] and self.is_phone_duplicate(car_data['phone_number']):
                    self.progress.skipped_duplicates += 1
                    self.progress.update_progress("running", f"⏭️ Skipped duplicate phone: {car_data['phone_number']}")
                    continue
                
                # If we got a new phone number, count it as successful
                if car_data['phone_number']:
                    self.progress.successful_leads += 1
                    self.add_phone_to_session(car_data['phone_number'])
                    self.progress.update_progress("running", f"✅ Found new lead: {car_data['phone_number']}", car_data)
                else:
                    self.progress.update_progress("running", f"❌ No phone found for: {car_data['title'][:50]}...")
                
                self.scraped_data.append(car_data)
                
                # Delay between requests to avoid being blocked
                time.sleep(random.uniform(3, 6))
            
            self.progress.update_progress("completed", f"Scraping completed! Found {self.progress.successful_leads} leads")
            
        except Exception as e:
            logger.error(f"Scraping error: {e}")
            self.progress.update_progress("error", f"Scraping failed: {str(e)}")
        
        finally:
            if self.driver:
                self.driver.quit()

def main():
    """Main entry point for the scraper"""
    if len(sys.argv) < 4:
        print("Usage: python python_scraper.py <job_id> <search_url> <max_cars>")
        sys.exit(1)
    
    job_id = sys.argv[1]
    search_url = sys.argv[2]
    max_cars = int(sys.argv[3])
    
    scraper = DubizzleScraper(job_id, max_cars)
    scraper.scrape_cars(search_url, max_cars)

if __name__ == "__main__":
    main() 