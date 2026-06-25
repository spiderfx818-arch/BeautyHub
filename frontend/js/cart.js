// BeautyHub Shopping Cart Manager

// Global User State cached here from authStateChanged events or checkAuth
let currentCartUser = null;

// Listen for authStateChanged to update the cache
window.addEventListener("authStateChanged", (e) => {
  currentCartUser = e.detail;
  console.log("[DEBUG cart] Auth state changed, current user is:", currentCartUser);
  updateCartCount();
});

// Helper function to check auth state synchronously based on cache or localStorage checks
function isUserAuthenticated() {
  return !!currentCartUser;
}

// Fetch all product data for guest cart description lookup
async function fetchAllProducts() {
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch all products:", err);
  }
  return [];
}

async function fetchCart() {
  console.log("[DEBUG fetchCart] fetching. Is authenticated:", isUserAuthenticated());
  
  if (isUserAuthenticated()) {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        return await res.json();
      }
      throw new Error("Failed to fetch logged-in user cart");
    } catch (err) {
      console.warn("Logged-in cart fetch failed, falling back to local storage guest cart:", err);
    }
  }

  // Guest Local Storage Cart Fallback
  try {
    const localCartObj = JSON.parse(localStorage.getItem("beautyhub_guest_cart") || "{}");
    const products = await fetchAllProducts();
    const cartItemsList = Object.keys(localCartObj).map((pidStr) => {
      const pid = parseInt(pidStr);
      const prod = products.find((p) => p.id === pid);
      if (!prod) return null;
      return {
        product_id: pid,
        quantity: localCartObj[pidStr],
        name: prod.name,
        price: prod.price,
        category: prod.category,
        image_url: prod.image_url,
        stock: prod.stock,
        product_number: prod.product_number
      };
    }).filter(item => item !== null);
    
    return cartItemsList;
  } catch (err) {
    console.error("Local cart fetch parsed error:", err);
    return [];
  }
}

async function updateCartCount() {
  const items = await fetchCart();
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const totalQuantity = items.reduce((acc, curr) => acc + curr.quantity, 0);
  badge.textContent = totalQuantity;
  badge.style.display = totalQuantity > 0 ? "flex" : "none";
}

async function addToCart(productId, quantity = 1) {
  const pid = parseInt(productId);
  const qty = parseInt(quantity) || 1;
  console.log("[DEBUG addToCart] Called with:", { pid, qty });

  if (isUserAuthenticated()) {
    try {
      const payload = { product_id: pid, quantity: qty };
      console.log("[DEBUG addToCart] API Request Payload:", payload);

      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      console.log("[DEBUG addToCart] API raw response status:", res.status);
      const textResponse = await res.text();
      console.log("[DEBUG addToCart] API text response:", textResponse);

      if (res.ok) {
        showToast("Added to beauty bag!");
        await updateCartCount();
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        return;
      }
      console.warn("Backend add failed, falling back to local storage guest cart.");
    } catch (err) {
      console.error("[DEBUG addToCart] Backend error:", err);
    }
  }

  // Guest/Fallback Local Storage Logic
  try {
    const localCartObj = JSON.parse(localStorage.getItem("beautyhub_guest_cart") || "{}");
    localCartObj[pid.toString()] = (localCartObj[pid.toString()] || 0) + qty;
    localStorage.setItem("beautyhub_guest_cart", JSON.stringify(localCartObj));
    
    console.log("[DEBUG addToCart] Local storage updated successfully:", localCartObj);
    showToast("Added to beauty bag!");
    await updateCartCount();
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  } catch (err) {
    console.error("Failed to save local cart:", err);
    showToast("Failed to add item to bag");
  }
}

async function removeFromCart(productId, removeAll = false) {
  const pid = parseInt(productId);
  console.log("[DEBUG removeFromCart] Called with:", { pid, removeAll });

  if (isUserAuthenticated()) {
    try {
      const res = await fetch("/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: pid, all: removeAll })
      });
      if (res.ok) {
        showToast(removeAll ? "Product removed" : "Item decreased");
        await updateCartCount();
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        return;
      }
      console.warn("Backend remove failed, falling back to local storage guest cart.");
    } catch (err) {
      console.error("[DEBUG removeFromCart] Backend error:", err);
    }
  }

  // Guest/Fallback Local Storage Logic
  try {
    const localCartObj = JSON.parse(localStorage.getItem("beautyhub_guest_cart") || "{}");
    const pidStr = pid.toString();
    if (localCartObj[pidStr]) {
      if (removeAll || localCartObj[pidStr] <= 1) {
        delete localCartObj[pidStr];
      } else {
        localCartObj[pidStr] -= 1;
      }
      localStorage.setItem("beautyhub_guest_cart", JSON.stringify(localCartObj));
      showToast(removeAll ? "Product removed" : "Item decreased");
    }
    await updateCartCount();
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  } catch (err) {
    console.error("Failed to remove item from local storage:", err);
    showToast("Failed to remove item");
  }
}

// Global Toast creator helper
function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span style="color:var(--accent);">❤</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto eject toast
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Set up event listeners on page load
window.addEventListener("DOMContentLoaded", async () => {
  // Let's retrieve checking auth to initialize currentUser if possible
  if (typeof checkAuth === "function") {
    currentCartUser = await checkAuth();
  }
  updateCartCount();
});

// Explicitly export functions to window for dynamic pages
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.fetchCart = fetchCart;
window.updateCartCount = updateCartCount;
