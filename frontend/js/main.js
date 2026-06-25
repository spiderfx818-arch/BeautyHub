// BeautyHub Core Front-End Controller

let allProductsList = [];
let currentFilterCategory = "";
function getCurrencySymbol(currency) {
  switch ((currency || "USD").toUpperCase()) {
    case "USD":
      return "$";
    case "INR":
      return "₹";
    case "BDT":
      return "৳";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return "$";
  }
}

function formatPrice(price, currency) {
  return `${getCurrencySymbol(currency)}${parseFloat(price || 0).toFixed(2)}`;
}

// Fetch and render products on catalog grid
async function loadProducts(filterCategory = "", searchText = "") {
  const container = document.getElementById("products-catalog-grid");
  const fallbackContainer = document.getElementById("products-fallback-loader");
  if (!container) return; // Not on listings or index page
  
  if (fallbackContainer) fallbackContainer.style.display = "block";
  container.innerHTML = "";

  try {
    const url = new URL("/api/products", window.location.origin);
    if (filterCategory) url.searchParams.append("category", filterCategory);
    if (searchText) url.searchParams.append("search", searchText);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Catalog load failed");
    
    const products = await res.json();
    allProductsList = products;
    
    if (fallbackContainer) fallbackContainer.style.display = "none";

    if (products.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 24px; color:var(--text-gray);">
          <p style="font-size:18px; margin-bottom:10px;">No beauty items found.</p>
          <p style="font-size:13px;">Try modifying your search or picking another category.</p>
        </div>
      `;
      return;
    }

    products.forEach((product) => {
      const stockBadge = product.stock <= 0 
        ? `<span class="product-badge" style="background-color:#ef4444;">SOLD OUT</span>` 
        : (product.stock < 5 ? `<span class="product-badge" style="background-color:#f59e0b;">LOW STOCK</span>` : "");

      const productCard = document.createElement("div");
      productCard.className = "product-card";
      productCard.innerHTML = `
        <div class="product-card-img">
          ${stockBadge}
          <a href="/product_detail.html?id=${product.id}">
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600'}" alt="${product.name}" loading="lazy">
          </a>
        </div>
        <div class="product-card-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="product-card-category" style="margin-bottom: 0;">${product.category}</span>
            <span class="product-number-badge" style="background-color: var(--primary); color: white; font-family: var(--font-mono); font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px;">#${product.product_number}</span>
          </div>
          <h3 class="product-card-title">
            <a href="/product_detail.html?id=${product.id}">${product.name}</a>
          </h3>
          <div class="product-card-price">${formatPrice(product.price, product.currency)}</div>
          <button class="btn-add-cart" onclick="addToCart(${product.id}, 1)">
            <svg style="width:16px; height:16px; fill:currentColor;" viewBox="0 0 24 24"><path d="M17.21 9l-4.3-6.45c-.2-.29-.53-.45-.88-.45-.35 0-.68.16-.88.45L6.85 9H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-2.79zM12 4.4L15.07 9H8.93L12 4.4zM20 19H4v-8h16v8zm-8-2c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/></svg>
            ADD TO BAG
          </button>
        </div>
      `;
      container.appendChild(productCard);
    });
  } catch (err) {
    console.error("Products catalog loader error:", err);
    if (fallbackContainer) fallbackContainer.style.display = "none";
    container.innerHTML = `<p style="text-align:center; padding:40px; color:#ef4444;">Failed to load products. Please check server connections.</p>`;
  }
}

// Render Particular Product Row Details on Details Page
async function loadProductDetails() {
  const nameEl = document.getElementById("detail-name");
  const categoryEl = document.getElementById("detail-category");
  const priceEl = document.getElementById("detail-price");
  const descEl = document.getElementById("detail-desc");
  const stockEl = document.getElementById("detail-stock");
  const imgEl = document.getElementById("detail-image");
  const btnAdd = document.getElementById("btn-detail-add-bag");
  const btnBuyNow = document.getElementById("btn-detail-buy-now");
  const qtyInput = document.getElementById("detail-qty-input");

  if (!nameEl) return; // Not on detail page

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    window.location.href = "/products.html";
    return;
  }

  try {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) throw new Error("Failed to load details");
    
    const product = await res.json();
    
    document.title = `${product.name} | BeautyHub`;
    nameEl.textContent = product.name;
    categoryEl.textContent = product.category;
    priceEl.textContent = formatPrice(product.price, product.currency);
    
    const pNumEl = document.getElementById("detail-product-number");
    if (pNumEl) {
      pNumEl.textContent = `#${product.product_number}`;
    }
    descEl.textContent = product.description || "No description provided for this product.";
    imgEl.src = product.image_url || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600";
    
    if (product.stock <= 0) {
      stockEl.textContent = "Out of Stock";
      stockEl.style.color = "#ef4444";
      if (btnAdd) {
        btnAdd.disabled = true;
        btnAdd.textContent = "OUT OF STOCK";
        btnAdd.style.opacity = "0.5";
      }
      if (btnBuyNow) {
        btnBuyNow.disabled = true;
        btnBuyNow.textContent = "OUT OF STOCK";
        btnBuyNow.style.opacity = "0.5";
      }
    } else {
      stockEl.textContent = `${product.stock} items available`;
      stockEl.style.color = "#059669";
    }

    if (btnAdd) {
      btnAdd.onclick = () => {
        const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
        addToCart(product.id, qty);
      };
    }

    if (btnBuyNow) {
  btnBuyNow.onclick = () => {
    if (product.buy_link && product.buy_link.trim() !== "") {
      window.open(product.buy_link, "_blank");
    } else {
      alert("No buy link has been added for this product yet.");
    }
  };
}
  } catch (err) {
    console.error("Details page loading error:", err);
    document.querySelector(".product-detail-layout").innerHTML = `
      <div style="text-align:center; padding:80px 24px;">
        <h2>Product Details Not Found</h2>
        <p style="margin:16px 0; color:var(--text-gray);">This product is unavailable or removed.</p>
        <a href="/products.html" class="btn-primary" style="display:inline-block;">Back to Catalog</a>
      </div>
    `;
  }
}

// Instant Tab Click Hooks
function setupFilterTabs() {
  const tabs = document.querySelectorAll(".nav-category-tab");
  if (tabs.length === 0) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      
      const category = tab.getAttribute("data-category");
      currentFilterCategory = category || "";
      loadProducts(currentFilterCategory);
    });
  });
}

// Setup Search Inputs
function setupSearchHandlers() {
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-button");

  if (!searchInput) return;

  const performSearch = () => {
    const text = searchInput.value.trim();
    loadProducts(currentFilterCategory, text);
  };

  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });
}

// Ready Execution Hooks
window.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadProductDetails();
  setupFilterTabs();
  setupSearchHandlers();
});
