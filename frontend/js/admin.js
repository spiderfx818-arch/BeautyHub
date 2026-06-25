// BeautyHub Admin Control Dashboard Manager

let adminStats = null;

// Require Admin clearance
async function verifyAdminAuth() {
  try {
    const res = await fetch("/api/user");
    const data = await res.json();
    if (!data.authenticated || !data.user || !data.user.is_admin) {
      alert("Unauthorized Access! Admin credentials required.");
      window.location.href = "/";
      return false;
    }
    return true;
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/";
    return false;
  }
}

// Load and render stats cards, lists, orders
async function loadDashboardStats() {
  const productsCountEl = document.getElementById("admin-stats-p-count");
  const salesValueEl = document.getElementById("admin-stats-sales");
  const totalStockEl = document.getElementById("admin-stats-stock");
  const usersCountEl = document.getElementById("admin-stats-u-count");

  if (!productsCountEl) return; // Not on main admin dashboard page

  try {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) throw new Error("Could not pull statistics");
    
    adminStats = await res.json();

    // 1. Render stats
    productsCountEl.textContent = adminStats.products_count;
    salesValueEl.textContent = `$${parseFloat(adminStats.total_sales).toFixed(2)}`;
    totalStockEl.textContent = adminStats.total_stock;
    usersCountEl.textContent = adminStats.users_count;

    // 2. Render lists
    renderAdminProducts();
    renderAdminUsers(adminStats.users);
    renderAdminOrders(adminStats.orders);
  } catch (err) {
    console.error(err);
    alert("Fail to gather active admin dashboard tallies.");
  }
}

// Render products list in admin table grid
async function renderAdminProducts() {
  const tbody = document.getElementById("admin-products-table-tbody");
  if (!tbody) return;

  try {
    // Re-fetch products dynamically
    const res = await fetch("/api/products");
    const products = await res.json();

    tbody.innerHTML = "";
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">No products in database. Click 'Add Product' to begin.</td></tr>`;
      return;
    }

    products.forEach((prod) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="product-number-badge" style="background-color: var(--primary); color: white; font-family: var(--font-mono); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;">#${prod.product_number}</span></td>
        <td>
          <div class="table-product-cell">
            <img src="${prod.image_url || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=100'}" alt="${prod.name}">
            <div>
              <strong style="color:var(--text-dark);">${prod.name}</strong>
              <div style="font-size:11px; color:var(--text-light);">ID: ${prod.id}</div>
            </div>
          </div>
        </td>
        <td><span class="span-category">${prod.category}</span></td>
        <td><strong>$${parseFloat(prod.price).toFixed(2)}</strong></td>
        <td>
          <span class="span-stock ${prod.stock <= 0 ? 'out' : ''}">${prod.stock} left</span>
        </td>
        <td>
          <div class="action-buttons">
            <a href="/admin/edit_product.html?id=${prod.id}" class="btn-icon" title="Edit">
              <svg style="width:14px; height:14px; fill:currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </a>
            <button class="btn-icon del" onclick="deleteProductHandler(${prod.id})" title="Delete">
              <svg style="width:14px; height:14px; fill:currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load products list:", err);
  }
}

// Render registered users
function renderAdminUsers(users) {
  const tbody = document.getElementById("admin-users-table-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No users registered yet.</td></tr>`;
    return;
  }

  users.forEach((user) => {
    const roleTag = user.is_admin ? '<span class="span-badge" style="background-color:var(--pink-pastel); color:var(--accent);">Admin Whitelisted</span>' : '<span class="span-badge" style="background-color:var(--lavender); color:var(--text-gray);">Consumer</span>';
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="table-product-cell">
          <img src="${user.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" alt="${user.name}" style="border-radius:50%;">
          <div>
            <strong>${user.name}</strong>
          </div>
        </div>
      </td>
      <td><strong>${user.email}</strong></td>
      <td><span style="font-family:var(--font-mono); font-size:12px;">${user.id}</span></td>
      <td>${roleTag}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Render placed orders list
function renderAdminOrders(orders) {
  const tbody = document.getElementById("admin-orders-table-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No sales orders placed.</td></tr>`;
    return;
  }

  orders.forEach((o) => {
    const statusClass = o.status.toLowerCase() === "delivered" ? "delivered" : "pending";
    const dateStr = new Date(o.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong style="font-family:var(--font-mono)">#00${o.id}</strong></td>
      <td>
        <div><strong>${o.user_name}</strong></div>
        <div style="font-size:11px; color:var(--text-light);">${o.user_email}</div>
      </td>
      <td>${dateStr}</td>
      <td><strong>$${parseFloat(o.total_price).toFixed(2)}</strong></td>
      <td><span class="span-badge ${statusClass}">${o.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// DELETE Products CRUD Core
async function deleteProductHandler(id) {
  if (!confirm("Are you sure you want to delete this product from the master catalog?")) return;
  
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Delete operation failed");
    
    alert("Beauty product deleted successfully!");
    renderAdminProducts(); // Real-time tab updates
    loadDashboardStats(); // Refresh headers
  } catch (err) {
    console.error(err);
    alert("Could not remove product.");
  }
}

// IMAGE UPLOAD DRAG/DROP ASSISTANCE
function initImageUpload() {
  const zone = document.getElementById("upload-dropzone");
  const fileInput = document.getElementById("product-file-input");
  const preview = document.getElementById("product-image-preview");
  const urlInput = document.getElementById("product-image-url-input");

  if (!zone || !fileInput) return;

  zone.addEventListener("click", () => fileInput.click());

  // Prevent browser drag/drops
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    zone.addEventListener(eventName, (e) => e.preventDefault(), false);
  });

  zone.addEventListener("dragenter", () => zone.classList.add("dragging"));
  zone.addEventListener("dragover", () => zone.classList.add("dragging"));
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (e) => {
    zone.classList.remove("dragging");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0], preview, urlInput);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleImageFile(files[0], preview, urlInput);
    }
  });
}

// Read image and convert/transmit base64
function handleImageFile(file, previewImg, textInput) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const base64Data = reader.result;
    
    // Set preview locally immediately
    previewImg.src = base64Data;
    
    try {
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data
        })
      });
      if (!res.ok) throw new Error("Upload process failed");
      const data = await res.json();
      
      textInput.value = data.image_url;
      alert("Image uploaded and cached successfully!");
    } catch (err) {
      console.error(err);
      alert("Fail to upload media file securely to servers. We will fallback to using the base64 code.");
      textInput.value = base64Data; // Fallback directly to base64 encoding
    }
  };
}

// CREATE Product CRUD Form handler
async function handleAddProductForm(e) {
  e.preventDefault();
  const form = e.target;

  const name = form.name.value.trim();
  const description = form.description.value.trim();
  const price = parseFloat(form.price.value) || 0;
  const category = form.category.value;
  const image_url = form.image_url.value.trim();
  const stock = parseInt(form.stock.value) || 10;
  const buy_link = document.getElementById("buy_link")?.value?.trim() || "";
  const currency = document.getElementById("currency")?.value || "USD";

  if (!name || price <= 0 || !category) {
    alert("Please fill in all mandatory product options (Name, Price, Category)");
    return;
  }

  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price,
        category,
        image_url,
        stock,
        buy_link,
        currency
      })
    });

    if (!res.ok) throw new Error("Product creation failed");

    alert("Beauty product added successfully!");
    window.location.href = "/admin/dashboard.html";
  } catch (err) {
    console.error(err);
    alert("Failed to submit product.");
  }
}

// EDIT Product CRUD Populate handler
async function populateEditForm() {
  const form = document.getElementById("admin-edit-product-form");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    window.location.href = "/admin/dashboard.html";
    return;
  }

  try {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) throw new Error("Detail fetch failed");
    
    const prod = await res.json();

    form.product_id.value = prod.id;
    form.name.value = prod.name;
    form.description.value = prod.description || "";
    form.price.value = parseFloat(prod.price).toFixed(2);
    form.category.value = prod.category;
    form.image_url.value = prod.image_url;
    form.stock.value = prod.stock;
    form.buy_link.value = prod.buy_link || "";
    form.currency.value = prod.currency || "USD";

    const pNumField = document.getElementById("product_number_display");
    if (pNumField) {
      pNumField.value = `#${prod.product_number}`;
    }

    const preview = document.getElementById("product-image-preview");
    if (preview && prod.image_url) {
      preview.src = prod.image_url;
    }
  } catch (err) {
    console.error(err);
    alert("Failed to populate product details for editing.");
  }
}

// EDIT Product CRUD Update handler
async function handleEditProductForm(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.product_id.value;
  const name = form.name.value.trim();
  const description = form.description.value.trim();
  const price = parseFloat(form.price.value) || 0;
  const category = form.category.value;
  const image_url = form.image_url.value.trim();
  const stock = parseInt(form.stock.value) || 0;

  const buy_link = document.getElementById("buy_link")?.value?.trim() || "";
  const currency = document.getElementById("currency")?.value || "USD";

  if (!id || !name || price <= 0 || !category) {
    alert("Mandatory fields missing.");
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price,
        category,
        image_url,
        stock,
        buy_link,
        currency
      })
    });
    
    if (!res.ok) throw new Error("Update failed");
    
    alert("Product details updated successfully!");
    window.location.href = "/admin/dashboard.html";
  } catch (err) {
    console.error(err);
    alert("Failed to update product details.");
  }
}

// Ready hooks
window.addEventListener("DOMContentLoaded", async () => {
  const isClear = await verifyAdminAuth();
  if (!isClear) return;

  loadDashboardStats();
  initImageUpload();
  populateEditForm();

  // Bind forms
  const formAdd = document.getElementById("admin-add-product-form");
  if (formAdd) formAdd.addEventListener("submit", handleAddProductForm);

  const formEdit = document.getElementById("admin-edit-product-form");
  if (formEdit) formEdit.addEventListener("submit", handleEditProductForm);
});
