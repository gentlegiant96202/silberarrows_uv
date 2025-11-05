# Facebook Pixel + GTM Setup Guide
## Automotive Catalog Tracking Implementation

---

## 🎯 **What We're Tracking**

| Event | Trigger | FB Pixel Event | Purpose |
|-------|---------|----------------|---------|
| Vehicle Page View | User lands on vehicle detail page | **ViewContent** | Track product views |
| Phone/WhatsApp Click | User clicks Call/WhatsApp button | **AddToCart** | Track leads/interest |

---

## 📊 **DataLayer Events Being Pushed**

### **1. ViewContent (Automatic on Page Load)**
```javascript
{
  event: 'view_content',
  ecommerce: {
    items: [{
      item_id: 'STOCK123',        // stock_number from database
      item_name: '2024 Mercedes-Benz EQS-580',
      item_brand: 'Mercedes-Benz',
      item_category: 'Vehicles',
      item_category2: 'EQS',
      price: 8500,
      quantity: 1
    }]
  },
  content_ids: ['STOCK123'],
  content_type: 'product',
  content_name: '2024 Mercedes-Benz EQS-580',
  content_category: 'vehicles',
  value: 8500,
  currency: 'AED'
}
```

### **2. AddToCart (Phone/WhatsApp Click)**
```javascript
{
  event: 'add_to_cart',
  ecommerce: {
    items: [{
      item_id: 'STOCK123',
      item_name: '2024 Mercedes-Benz EQS-580',
      item_brand: 'Mercedes-Benz',
      item_category: 'Vehicles',
      item_category2: 'EQS',
      price: 8500,
      quantity: 1
    }]
  },
  content_ids: ['STOCK123'],
  content_type: 'product',
  content_name: '2024 Mercedes-Benz EQS-580',
  content_category: 'vehicles',
  value: 8500,
  currency: 'AED',
  interaction_type: 'phone_call',  // or 'whatsapp'
  page: 'vehicle_detail',
  location: 'footer'               // or omitted if main CTA
}
```

---

## 🔧 **GTM Configuration (Step-by-Step)**

### **Step 1: Create DataLayer Variables**

Go to **GTM → Variables → User-Defined Variables → New**

#### Variable 1: Content IDs
- **Name:** `DL - Content IDs`
- **Type:** Data Layer Variable
- **Variable Name:** `content_ids`

#### Variable 2: Content Type
- **Name:** `DL - Content Type`
- **Type:** Data Layer Variable
- **Variable Name:** `content_type`

#### Variable 3: Content Name
- **Name:** `DL - Content Name`
- **Type:** Data Layer Variable
- **Variable Name:** `content_name`

#### Variable 4: Value
- **Name:** `DL - Value`
- **Type:** Data Layer Variable
- **Variable Name:** `value`

#### Variable 5: Currency
- **Name:** `DL - Currency`
- **Type:** Data Layer Variable
- **Variable Name:** `currency`

---

### **Step 2: Create Triggers**

#### Trigger 1: ViewContent
- **Name:** `Event - ViewContent`
- **Type:** Custom Event
- **Event Name:** `view_content`
- **This trigger fires on:** All Custom Events

#### Trigger 2: AddToCart
- **Name:** `Event - AddToCart`
- **Type:** Custom Event
- **Event Name:** `add_to_cart`
- **This trigger fires on:** All Custom Events

---

### **Step 3: Create Facebook Pixel Tags**

#### Tag 1: FB Pixel - ViewContent
**GTM → Tags → New**
- **Tag Type:** Custom HTML
- **Name:** `FB Pixel - ViewContent`
- **HTML:**
```html
<script>
if (typeof fbq !== 'undefined') {
  fbq('track', 'ViewContent', {
    content_ids: {{DL - Content IDs}},
    content_type: {{DL - Content Type}},
    content_name: {{DL - Content Name}},
    content_category: 'vehicles',
    value: {{DL - Value}},
    currency: {{DL - Currency}}
  });
  console.log('FB Pixel: ViewContent tracked', {
    content_ids: {{DL - Content IDs}},
    value: {{DL - Value}}
  });
}
</script>
```
- **Triggering:** `Event - ViewContent`

#### Tag 2: FB Pixel - AddToCart
**GTM → Tags → New**
- **Tag Type:** Custom HTML
- **Name:** `FB Pixel - AddToCart`
- **HTML:**
```html
<script>
if (typeof fbq !== 'undefined') {
  fbq('track', 'AddToCart', {
    content_ids: {{DL - Content IDs}},
    content_type: {{DL - Content Type}},
    content_name: {{DL - Content Name}},
    content_category: 'vehicles',
    value: {{DL - Value}},
    currency: {{DL - Currency}}
  });
  console.log('FB Pixel: AddToCart tracked', {
    content_ids: {{DL - Content IDs}},
    value: {{DL - Value}}
  });
}
</script>
```
- **Triggering:** `Event - AddToCart`

---

## ⚠️ **CRITICAL: Catalog ID Matching**

### **Your content_ids MUST match your Facebook Catalog**

We're using: `vehicle.stock_number || vehicle.id`

**Check your Facebook Catalog:**
1. Go to **Commerce Manager → Catalog**
2. Open your catalog
3. Check the **`id`** column format

**Options:**
- If catalog uses `stock_number` → Perfect! ✅
- If catalog uses UUID → Change code to use `vehicle.id` only
- If catalog uses custom format → Update both catalog and code

**To verify match:**
```javascript
// In browser console on vehicle page:
window.dataLayer.filter(e => e.event === 'view_content')
// Check content_ids[0] matches your catalog ID
```

---

## 🧪 **Testing Your Setup**

### **Test 1: ViewContent Event**
1. Open vehicle detail page: `/leasing/showroom/[vehicleId]`
2. Open Chrome DevTools → Console
3. Type: `window.dataLayer.filter(e => e.event === 'view_content')`
4. Verify you see the event with correct `content_ids`

### **Test 2: AddToCart Event**
1. On vehicle page, click "Call Us" or "WhatsApp"
2. In console: `window.dataLayer.filter(e => e.event === 'add_to_cart')`
3. Verify event fired with vehicle data

### **Test 3: Facebook Pixel Helper**
1. Install [Facebook Pixel Helper Chrome Extension](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Visit vehicle page
3. Check helper shows:
   - ✅ PageView (on load)
   - ✅ ViewContent (on load)
   - ✅ AddToCart (on click)

### **Test 4: Facebook Events Manager**
1. Go to **Facebook Events Manager**
2. Select your Pixel (ID: `1157092422720819`)
3. Click **Test Events**
4. Perform actions on your site
5. Verify events appear in real-time

### **Test 5: GTM Preview Mode**
1. **GTM → Preview** → Enter: `https://portal.silberarrows.com/leasing/showroom/[any-vehicle-id]`
2. Load page → Check **"view_content" Custom Event** fired
3. Click phone → Check **"add_to_cart" Custom Event** fired
4. Check both FB Pixel tags fired

---

## 📈 **Expected Results**

### **After 24-48 Hours:**
- Catalog Match Rate: **90%+** (from 0%)
- Product Views: Start showing numbers
- Product Adds (AddToCart): Track leads

### **Troubleshooting Low Match Rate:**
1. **Check ID Format:** content_ids must EXACTLY match catalog IDs
2. **Check Catalog Status:** Ensure catalog items are approved
3. **Check Multiple Catalogs:** If you have 2+ catalogs with same items, match rate splits

---

## 🎯 **Summary**

✅ **Code Changes:** Complete - pushing `view_content` and `add_to_cart` events  
🔧 **GTM Setup:** Follow Step 1-3 above  
🧪 **Testing:** Use 5 tests above to verify  
📊 **Monitor:** Check Facebook Events Manager for incoming events

---

## 📞 **Need Help?**

If match rate stays below 90% after setup:
1. Export catalog and share ID column format
2. Check GTM Preview mode for errors
3. Verify Facebook Pixel Helper shows correct data
4. Check browser console for dataLayer events

---

**Last Updated:** November 2025  
**Pixel ID:** 1157092422720819  
**Event Source:** portal.silberarrows.com

