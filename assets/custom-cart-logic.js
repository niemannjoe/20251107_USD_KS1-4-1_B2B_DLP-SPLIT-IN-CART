// ===== Custom Service Product Logic (Count-Based) =====

const customCartLogic = {
  SERVICE_VARIANT_ID: '43167575539897',
  
  // Debounce flag to prevent multiple rapid updates
  isUpdating: false, 

  init: function() {
    console.log('Custom Cart Logic: Initializing (Count-Based).');
    this.manageServiceProduct();

    document.addEventListener('cart:updated', () => {
      console.log('Custom Cart Logic: "cart:updated" event detected!');
      this.manageServiceProduct();
    });

    const cartDrawer = document.querySelector('#shopify-section-theme__cart'); // You may need to adjust this selector
    if (cartDrawer) {
      const observer = new MutationObserver((mutationsList) => {
        // We run the check on any change to the drawer's contents
        console.log('Custom Cart Logic: Cart Section (#shopify-section-theme__cart changed, running check.');
        this.manageServiceProduct();
      });

      observer.observe(cartDrawer, { childList: true, subtree: true });
    } else {
      console.warn('Custom Cart Logic: Could not find #shopify-section-theme__cart to observe.');
    }
  },

  manageServiceProduct: async function() {
    // Prevent multiple calls from firing at once
    if (this.isUpdating) {
        console.log('Custom Cart Logic: Update already in progress. Skipping.');
        return;
    }
    this.isUpdating = true;
    console.log('Custom Cart Logic: Running manageServiceProduct function.');

    if (!this.SERVICE_VARIANT_ID || this.SERVICE_VARIANT_ID === '00000000000000') {
      console.error('Service product variant ID is not set. Aborting.');
      this.isUpdating = false;
      return;
    }

    try {
      const cart = await (await fetch('/cart.js')).json();
      let serviceProductInCart = null;
      let logoProductCount = 0;
      let serviceFeeCount = 0;

      // Count logo products and find the service fee
      for (const item of cart.items) {
        if (item.variant_id.toString() === this.SERVICE_VARIANT_ID) {
          serviceProductInCart = item;
          serviceFeeCount = item.quantity;
        }
        
        // Check for the property you added in Step 1
        if (item.properties && item.properties._service_required === 'true') {
          // We count the total quantity of items that require the service
          logoProductCount += item.quantity; 
        }
      }

      console.log(`Custom Cart Logic: Logo product count: ${logoProductCount}`);
      console.log(`Custom Cart Logic: Service fee count in cart: ${serviceFeeCount}`);

      // Main logic: Compare counts and update if they don't match
      if (logoProductCount !== serviceFeeCount) {
        console.log(`%cCustom Cart Logic: Condition met. Setting service product quantity to ${logoProductCount}.`, 'color: green; font-weight: bold;');
        
        // We send the final desired quantity for the service product.
        // Shopify's /cart/update.js endpoint will add, remove, or update quantity to match.
        this.updateCart({ [this.SERVICE_VARIANT_ID]: logoProductCount });
        return;
      }
      
      console.log('Custom Cart Logic: No action needed. Counts match.');

    } catch (error) {
      console.error('Error in manageServiceProduct:', error);
    }
    
    // Release the update flag
    this.isUpdating = false;
  },

  updateCart: async function(updates) {
    await fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });

    // NOTE: We no longer reload the page, as 'cart:updated' will fire 
    // and re-run the check automatically, creating a more stable loop.
    // The cart drawer should update dynamically.
    // If your cart doesn't update, you may need to add this back:
    // window.location.reload(); 
    
    // Release the flag after the update request is sent
    this.isUpdating = false; 
  }
};

document.addEventListener('DOMContentLoaded', () => {
  customCartLogic.init();
});