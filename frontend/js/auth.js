// BeautyHub Client-Side Authentication Manager

// Global User State
let currentUser = null;

async function checkAuth() {
  try {
    const res = await fetch("/api/user");
    if (!res.ok) throw new Error("Failed to check auth state");
    
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;
      renderHeaderUser(currentUser);
    } else {
      currentUser = null;
      renderHeaderUser(null);
    }
    
    // Custom trigger for components depending on user state
    window.dispatchEvent(new CustomEvent("authStateChanged", { detail: currentUser }));
    return currentUser;
  } catch (err) {
    console.error("Auth check error:", err);
    renderHeaderUser(null);
  }
}

function renderHeaderUser(user) {
  const container = document.getElementById("header-user-container");
  if (!container) return; // Navbar user panel wrapper

  if (user) {
    // Check if admin is active, if so provide links
    const adminLink = user.is_admin
  ? `<a href="/admin" class="btn-admin">Admin Panel</a>`
  : "";

    container.innerHTML = `
      <div class="user-profile-menu">
        ${adminLink}
        <img src="${user.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="profile-avatar" alt="Avatar">
        <span class="profile-name">${user.name.split(" ")[0]}</span>
        <a href="/logout" class="btn-logout" style="font-size: 11px; font-weight:600; text-transform:uppercase; color:var(--text-gray); margin-left: 10px; border-left:1px solid var(--border-color); padding-left:10px;">Logout</a>
      </div>
    `;
  } else {
    container.innerHTML = `
      <a href="/login.html" class="btn-login-header">SIGN IN</a>
    `;
  }
}

// Open Google Login Popup
async function startGoogleLogin() {
  try {
    const res = await fetch("/login/google");
    if (!res.ok) throw new Error("Failed to construct google redirection link");
    const { url } = await res.json();
    
    // Open OAuth directly in popup to bypass iframe blocks in AI Studio
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const popup = window.open(
      url, 
      "beautyhub_google_auth", 
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!popup) {
      alert("Popup blocked! Please allow popups for beautyhub to enable sign-in.");
    }
  } catch (err) {
    console.error("Failed to start Google login routing:", err);
  }
}

// Message Listener for OAuth results
window.addEventListener("message", (event) => {
  const origin = event.origin;
  if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
    return;
  }
  if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
    showToast("Successfully logged in!");
    checkAuth();
  }
});

// Load auth state when window loads
window.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});
