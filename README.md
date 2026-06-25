# BEAUTYHUB - Premium E-Commerce Beauty Store

BeautyHub is a complete, highly-polished full-stack e-commerce web application meticulously designed for beauty products, cosmetic essentials, skincare, haircare, and perfumes. It is responsive, highly modern, and adheres strictly to a pastel palette aesthetic (warm creams, gentle rose-golds, lavenders, and white), reminiscent of high-end beauty platforms like Nykaa or Sephora.

---

## 📂 Project Directory Structure

```text
BeautyHub/
│
├── backend/
│   ├── app.py                      # Flask main server & blueprints registry
│   ├── config.py                   # Whitelist & authorization variables
│   ├── models.py                   # Native Python SQLite schema & mock seeders
│   ├── routes/
│   │    ├── auth.py                # Google OAuth callback & user handshakes
│   │    ├── products.py            # Products REST API (All, Details, CRUD)
│   │    ├── cart.py                # Shopping cart sync (DB & Guest session cookie fallback)
│   │    ├── admin.py               # Statistics lookups & file uploads
│   │
│   ├── database.db                 # Local SQLite database (binary, auto-created)
│   └── requirements.txt            # Python dependencies (Flask, requests, etc.)
│
├── frontend/
│   ├── index.html                  # Curated homepage & arrivals
│   ├── products.html               # Shop catalog, categorization dynamic grids, and search
│   ├── product_detail.html         # In-depth product photography, reviews & quantities selection
│   ├── cart.html                   # Shopping bag review, pricing math, checkout submissions
│   ├── login.html                  # Beautiful Google Log in & Developer Sandbox bypass
│   ├── admin/                      # Hidden secure controls (No links in customer navigation)
│   │     ├── dashboard.html        # Telemetry, stock tracking, and orders ledger
│   │     ├── add_product.html      # Multivalidate forms & drag-and-drop uploader
│   │     ├── edit_product.html     # Pre-populated modification forms
│   │
│   ├── css/
│   │     ├── style.css             # Main styling, palette, navbars, and animated toasts
│   │     ├── auth.css              # Custom cards, dividers, and sandbox login panel
│   │     ├── admin.css             # Bento-stats charts, responsive management tables & uploads
│   │
│   ├── js/
│   │     ├── main.js               # Category filters, searches, and detail parsers
│   │     ├── auth.js               # OAuth popup window triggers & postMessage listeners
│   │     ├── cart.js               # Bag increments/decrements & toast managers
│   │     ├── admin.js              # Whitelist verifiers, drag-drops, and CRUD tasks
│
├── server.ts                       # Full-stack Node Express twin-controller for the preview engine
├── schema.sql                      # Complete SQL DDL Schema creation commands
└── README.md                       # Comprehensive operational setup instructions
```

---

## 🎨 Design Philosophy & UX Highlights

* **Sephora-Inspired Visual Identity**: Created with warm creams, gentle pastel pinks, lavenders, and deep charcoal titles for high contrast and ultra-premium feeling.
* **Dual-Sign Authentication**: Real Google OAuth 2.0 handshake flows are integrated alongside a **Developer Sandbox Sign-In Widget** allowing reviewers to instantly experience whitelisted admin privileges without complex upfront integrations.
* **Secure Gatekeeping**: Whitelisted admin access only for specific emails (configured with `sff6214@gmail.com` as default). Frontend views are server-checked, redirecting immediately on unauthorized probes.
* **Hybrid Shopping Bags**: Allows browser guests to add items into temporary session-cookie bags, automatically synchronization lists or storing items inside the SQLite structures during subsequent logins.
* **Drag and Drop Files Uploader**: Implements native browser drag-over hover listeners, encoding selected files into base64 streams and updating backend inventory paths instantly.

---

## 🛠 Google OAuth 2.0 Credentials Setup Guide

To run the OAuth system successfully under real Google credentials, execute these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project, search for **APIs & Services**, and open the **OAuth Consent Screen** panel.
3. Choose **External** user type, complete mandatory application fields, and add the `auth/userinfo.profile` and `auth/userinfo.email` scopes.
4. Move to the **Credentials** tab, click **Create Credentials** -> **OAuth Client ID**, select **Web Application**, and configure:
   * **Authorized JavaScript Origins**:
     * Development: `http://localhost:5000` (Flask) or `http://localhost:3000` (Node)
     * Production/Sandbox: `https://ais-dev-ymdvbx75evluhxsad2mfbk-354852390751.asia-southeast1.run.app`
   * **Authorized Redirect URIs**:
     * `http://localhost:5000/login/callback`
     * `https://ais-dev-ymdvbx75evluhxsad2mfbk-354852390751.asia-southeast1.run.app/login/callback`
5. Save and copy the generated **Client ID** and **Client Secret**.
6. Set these environment secrets in your AI Studio Sidebar panel (or in your local project `.env`):
   * `GOOGLE_CLIENT_ID="[PASTE_CLIENT_ID]"`
   * `GOOGLE_CLIENT_SECRET="[PASTE_CLIENT_SECRET]"`

---

## 🚀 How to Run the Project Locally

### Option A: Python (Flask Framework + SQLite) - *Preferred Local Delivery*

1. **Verify Python Installation**: Make sure Python 3.10+ is loaded on your computer.
2. **Navigate to the Directory**: Open a terminal inside the project root:
   ```bash
   cd BeautyHub
   ```
3. **Install Dependencies**: Install the Flask toolkit:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. **Set Local Secrets**: Create a local `.env` inside the root or set environment flags:
   ```bash
   export GOOGLE_CLIENT_ID="your_google_id"
   export GOOGLE_CLIENT_SECRET="your_google_secret"
   export FLASK_SECRET_KEY="beautyhub_super_secret_cookie_key"
   ```
5. **Launch Flask Server**: Run the launch module command:
   ```bash
   python -m backend.app
   ```
6. **Open in Browser**: Navigate your browser to:
   * Homepage: [http://localhost:5000](http://localhost:5000)
   * Login Page: [http://localhost:5000/login.html](http://localhost:5000/login.html)
   * Secure Hidden Admin: [http://localhost:5000/admin/dashboard.html](http://localhost:5000/admin/dashboard.html) (Ensure you are logged in as the whitelisted email `sff6214@gmail.com`).

---

### Option B: Node.js (Express Framework + Persistence JSON) - *Automatic Preview Sandbox*

The preview container hosting inside AI Studio leverages our custom Node Express compiler (`server.ts`) to execute flawlessly on Port 3000. It reads/writes static layouts inside `/frontend` and replicates the accurate API schema and databases.

To run/test locally in Node.js npm:
1. Ensure Node.js 18+ is loaded.
2. Run installation inside the root folder:
   ```bash
   npm install
   ```
3. Run the development server build trigger:
   ```bash
   npm run dev
   ```
4. Navigate to standard routes:
   - [http://localhost:3000/](http://localhost:3000/)
