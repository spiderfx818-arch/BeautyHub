import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import pg from "pg";


// Augment express-session types for strict TypeScript checks
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      name: string;
      email: string;
      profile_image: string;
      is_admin: boolean;
    };
    cart?: { [key: string]: number };
  }
}

// Load Environment variables
dotenv.config();
console.log("CLIENT ID =", process.env.GOOGLE_CLIENT_ID);

const { Pool } = pg;

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_number INTEGER UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC,
        category TEXT,
        image_url TEXT,
        stock INTEGER,
        buy_link TEXT,
        currency TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Products table ready");
  } catch (err) {
    console.error("Database Init Error:", err);
  }
}

// Set up cookies and JSON parsing parameters
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Setup sessions for Iframe support (SameSite=None, Secure=True)
// Note: If running inside standard run.app iframe preview, secure and SameSite are required
app.use(
  session({
    secret: process.env.FLASK_SECRET_KEY || "beautyhub_super_secret_cookie_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// File Path of Database
const DB_FILE = path.join(process.cwd(), "backend", "express_database.json");

const normalizeEmail = (email?: string | null) => (email || "").trim().toLowerCase();

const getAdminEmails = () => {
  const configured = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  return Array.from(new Set([
    "sff6214@gmail.com",
    "spiderfx818@gmail.com",
    "admin@beautyhub.com",
    "beautyhub.admin@gmail.com",
    ...configured,
  ]));
};

// Define Whitelist of Administrator Email addresses
const ADMIN_EMAILS = getAdminEmails();

// Seed Data
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Glow Hydra-Serum",
    description: "A lightweight, intense hydration serum packed with hyaluronic acid and niacinamide for an instant dewy radiance.",
    price: 48.00,
    category: "Skincare",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=65",
    stock: 25
  },
  {
    id: 2,
    name: "Velvet Matte Lipstick (Classic Red)",
    description: "Long-wear matte formulation with nourishing oils that keeps lips hydrated and delivers an ultra-pigmented aesthetic.",
    price: 32.00,
    category: "Makeup",
    image_url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=65",
    stock: 35
  },
  {
    id: 3,
    name: "Argan Nourishing Hair Oil",
    description: "Restore shine and strength to dry or damaged hair. Fast-absorbing with a luxurious, non-greasy cashmere-like finish.",
    price: 42.00,
    category: "Haircare",
    image_url: "https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=65",
    stock: 15
  },
  {
    id: 4,
    name: "Rose Oud Eau de Parfum",
    description: "A seductive blend of sweet damask rose and warm, smoky agarwood. Captivating, intense, and sophisticated.",
    price: 110.00,
    category: "Perfume",
    image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=65",
    stock: 10
  },
  {
    id: 5,
    name: "Caffeine Awakening Eye Cream",
    description: "Instantly brightens tired-looking under-eyes and reduces puffiness with cold-pressed green coffee extracts.",
    price: 36.00,
    category: "Skincare",
    image_url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=65",
    stock: 20
  },
  {
    id: 6,
    name: "Airbrush Finishing Powder",
    description: "A micro-fine translucent skin-blurring powder that sets makeup and controls shine for up to 12 hours.",
    price: 39.00,
    category: "Makeup",
    image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=65",
    stock: 30
  },
  {
    id: 7,
    name: "Sandalwood Calm Cleansing Gel",
    description: "Sulfate-free pH-balanced cleanser created to pamper sensitive skin with soothing sandalwood and lavender extract.",
    price: 28.00,
    category: "Skincare",
    image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=65",
    stock: 40
  },
  {
    id: 8,
    name: "Keratin Repair Hair Mask",
    description: "Intense weekly conditioning treatment that reconstructs damaged hair shafts, repairs split ends, and seals moisture.",
    price: 45.00,
    category: "Haircare",
    image_url: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600&auto=format&fit=crop&q=65",
    stock: 18
  }
];

// Database Management Helpers
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initData = {
        users: [],
        products: DEFAULT_PRODUCTS,
        cart_items: [],
        orders: [
          {
            id: 1,
            user_id: "google_12345",
            total_price: 135.00,
            status: "Delivered",
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 2,
            user_id: "google_67890",
            total_price: 84.00,
            status: "Pending",
            created_at: new Date().toISOString()
          }
        ]
      };
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(initData, null, 2), "utf-8");
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(content);

    // Migration and verification of unique permanent product_number
    let migrated = false;
    if (data.products && Array.isArray(data.products)) {
      // Step 1: Track existing unique product_numbers that are already assigned
      const assignedNumbers = new Set<number>();
      data.products.forEach((p: any) => {
        if (p.product_number !== undefined && p.product_number !== null) {
          assignedNumbers.add(parseInt(p.product_number));
        }
      });

      // Step 2: Assign numbers sequentially from 1 to any product lacking a product_number
      // We sort ascending by id so that older products (ID 1, 2, 3...) receive sequential numbers starting from 1
      const sorted = [...data.products].sort((a: any, b: any) => a.id - b.id);
      let currentNum = 1;

      sorted.forEach((p: any) => {
        // Find corresponding product item in live data store to mutate
        const itemInDB = data.products.find((item: any) => item.id === p.id);
        if (itemInDB && (itemInDB.product_number === undefined || itemInDB.product_number === null)) {
          while (assignedNumbers.has(currentNum)) {
            currentNum++;
          }
          itemInDB.product_number = currentNum;
          assignedNumbers.add(currentNum);
          migrated = true;
        }
      });
    }

    if (migrated) {
      console.log("[MIGRATION] Migration triggered: updated product serial numbers in database.");
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    }

    return data;
  } catch (err) {
    console.error("Failed to read JSON DB:", err);
    return { users: [], products: DEFAULT_PRODUCTS, cart_items: [], orders: [] };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to JSON DB:", err);
  }
}

// Middleware: Require Admin
function reqAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = req.session.user;
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: "Access Denied. Admin privileges required." });
  }
  next();
}

// --- REST API API ENDPOINTS ---

// GET /api/user: Fetch active session user info
app.get("/api/user", (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// GET /login/google: Handle Google OAuth redirection or provide URL
app.get("/login/google", (req, res) => {
  const appUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
  const redirectUri = `${appUrl}/login/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  
  const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
    prompt: "select_account"
  }).toString();

  res.json({ url: authUrl });
});

  app.get("/login/callback", async (req, res) => {
  try {
    const code = req.query.code as string;

    if (!code) {
      return res.send("Google authorization code not found.");
    }

    const appUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
    const redirectUri = `${appUrl}/login/callback`;

    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const googleUser = userResponse.data;

    const email = googleUser.email;
    const cleanEmail = normalizeEmail(email);
    const is_admin = ADMIN_EMAILS.includes(cleanEmail);

    console.log("EMAIL RAW:", email);
    console.log("EMAIL CLEAN:", cleanEmail);
    console.log("IS ADMIN:", is_admin);

    console.log("Email From Google:", email);
    console.log("Admin List:", ADMIN_EMAILS);
    console.log("Is Admin:", ADMIN_EMAILS.includes(email));

    const db = readDB();

    let user = db.users.find((u: any) => normalizeEmail(u.email) === cleanEmail);

    if (!user) {
      user = {
        id: googleUser.id,
        name: googleUser.name,
        email: cleanEmail,
        profile_image: googleUser.picture,
        is_admin
      };

      db.users.push(user);
    } else {
      user.email = cleanEmail;
      user.is_admin = is_admin;
      user.name = googleUser.name;
      user.profile_image = googleUser.picture;
    }

    writeDB(db);

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      profile_image: user.profile_image,
      is_admin: user.is_admin
    };

    console.log("ADMIN CHECK:", email, is_admin);

    return res.redirect("/");

  } catch (error: any) {
    console.error("Google OAuth Error:", error?.response?.data || error);

    return res.send(`
      <html>
      <body style="font-family:sans-serif;padding:40px">
      <h2>Google Login Failed</h2>
      <pre>${JSON.stringify(error?.response?.data || error.message, null, 2)}</pre>
      </body>
      </html>
    `);
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({
      loggedIn: false
    });
  }

  return res.json({
    loggedIn: true,
    user: req.session.user
  });
});

// GET /logout: Clear session and redirect to homepage
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// PRODUCTS API
// GET /api/products: Filter/search and read standard catalog items
app.get("/api/products", async (req, res) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (category) {
      params.push(category);
      conditions.push(`LOWER(TRIM(category)) = LOWER(TRIM($${params.length}))`);
    }

    if (search) {
      const productNumberMatch = search.match(/^#?(\d+)$/);

      if (productNumberMatch) {
        params.push(Number(productNumberMatch[1]));
        conditions.push(`product_number = $${params.length}`);
      } else {
        params.push(`%${search}%`);
        conditions.push(`name ILIKE $${params.length}`);
      }
    }

    const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT * FROM products${whereClause} ORDER BY id DESC`;

    const result = await pool.query(
      query,
      params
    );

    const results = [...(result.rows || [])]
      .sort((a: any, b: any) => b.id - a.id)
      .map((p: any) => ({
        ...p,
        buy_link: p.buy_link || "",
        currency: p.currency || "USD"
      }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database Error" });
  }
});

// GET /api/products/:id: Load specific detail pages
app.get("/api/products/:id", (req, res) => {
  const idNum = parseInt(req.params.id);
  const db = readDB();
  const product = db.products.find((p: any) => p.id === idNum);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json({
  ...product,
  buy_link: product.buy_link || "",
  currency: product.currency || "USD"
});
});

// POST /api/products: Create items (Admin only)
app.post("/api/products", reqAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      image_url,
      stock,
      buy_link,
      currency
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO products
      (product_number,name,description,price,category,image_url,stock,buy_link,currency)
      VALUES (
        (SELECT COALESCE(MAX(product_number),0)+1 FROM products),
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *;
      `,
      [
        name,
        description,
        price,
        category,
        image_url,
        stock,
        buy_link,
        currency
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database Error" });
  }
});

// PUT /api/products/:id: Edit items (Admin only)
app.put("/api/products/:id", reqAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const {
      name,
      description,
      price,
      category,
      image_url,
      stock,
      buy_link,
      currency
    } = req.body;

    await pool.query(
      `
      UPDATE products
      SET
        name=$1,
        description=$2,
        price=$3,
        category=$4,
        image_url=$5,
        stock=$6,
        buy_link=$7,
        currency=$8
      WHERE id=$9
      `,
      [
        name,
        description,
        price,
        category,
        image_url,
        stock,
        buy_link,
        currency,
        id
      ]
    );

    res.json({ message: "Product updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database Error" });
  }
});

// DELETE /api/products/:id: Delete items (Admin only)
app.delete("/api/products/:id", reqAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query(
      "DELETE FROM products WHERE id=$1",
      [id]
    );

    res.json({
      message: "Product deleted successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Database Error"
    });
  }
});

// CART API
// GET /api/cart: Fetch current cartitems
app.get("/api/cart", (req, res) => {
  const db = readDB();
  const user = req.session.user;

  if (user) {
    // Logged in DB query
    const user_cart = db.cart_items.filter((c: any) => c.user_id === user.id);
    const cartItemsList = user_cart.map((c: any) => {
      const prod = db.products.find((p: any) => p.id === c.product_id);
      return {
        product_id: c.product_id,
        quantity: c.quantity,
        name: prod ? prod.name : "Unknown Product",
        price: prod ? prod.price : 0,
        category: prod ? prod.category : "Skincare",
        image_url: prod ? prod.image_url : "",
        stock: prod ? prod.stock : 10,
        product_number: prod ? prod.product_number : null
      };
    });
    res.json(cartItemsList);
  } else {
    // Guest Session Cart Fallback
    const sessionCart = req.session.cart || {};
    const cartItemsList = Object.keys(sessionCart).map((pidStr) => {
      const pid = parseInt(pidStr);
      const prod = db.products.find((p: any) => p.id === pid);
      return {
        product_id: pid,
        quantity: sessionCart[pidStr],
        name: prod ? prod.name : "Unknown Product",
        price: prod ? prod.price : 0,
        category: prod ? prod.category : "Skincare",
        image_url: prod ? prod.image_url : "",
        stock: prod ? prod.stock : 10,
        product_number: prod ? prod.product_number : null
      };
    }).filter(item => item.price > 0);
    res.json(cartItemsList);
  }
});

// POST /api/cart/add: Increment or add cart item
app.post("/api/cart/add", (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (product_id === undefined) {
    return res.status(400).json({ error: "Missing product_id" });
  }

  const pid = parseInt(product_id);
  const qty = parseInt(quantity) || 1;
  const db = readDB();

  const prod = db.products.find((p: any) => p.id === pid);
  if (!prod) {
    return res.status(404).json({ error: "Product not found" });
  }

  const user = req.session.user;
  if (user) {
    // Logged in SQLite simulation
    let item = db.cart_items.find((c: any) => c.user_id === user.id && c.product_id === pid);
    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: db.cart_items.length + 1,
        user_id: user.id,
        product_id: pid,
        quantity: qty
      };
      db.cart_items.push(item);
    }
    writeDB(db);
  } else {
    // Guest session cart
    if (!req.session.cart) {
      req.session.cart = {};
    }
    req.session.cart[pid.toString()] = (req.session.cart[pid.toString()] || 0) + qty;
  }

  res.json({ message: "Product added to cart successfully" });
});

// POST /api/cart/remove: Decrement or slice item
app.post("/api/cart/remove", (req, res) => {
  const { product_id, all = false } = req.body;
  if (product_id === undefined) {
    return res.status(400).json({ error: "Missing product_id" });
  }

  const pid = parseInt(product_id);
  const db = readDB();
  const user = req.session.user;

  if (user) {
    const idx = db.cart_items.findIndex((c: any) => c.user_id === user.id && c.product_id === pid);
    if (idx !== -1) {
      if (all || db.cart_items[idx].quantity <= 1) {
        db.cart_items.splice(idx, 1);
      } else {
        db.cart_items[idx].quantity -= 1;
      }
      writeDB(db);
    }
  } else {
    const sessionCart = req.session.cart || {};
    const pidStr = pid.toString();
    if (sessionCart[pidStr]) {
      if (all || sessionCart[pidStr] <= 1) {
        delete sessionCart[pidStr];
      } else {
        sessionCart[pidStr] -= 1;
      }
      req.session.cart = sessionCart;
    }
  }

  res.json({ message: "Product removed from cart successfully" });
});

// ADMIN TELEMETRY
// GET /api/admin/stats: Analytical tallies for admin dashboard (Admin only)
app.get("/api/admin/stats", reqAdmin, (req, res) => {
  const db = readDB();
  const productsCount = db.products.length;
  const totalStock = db.products.reduce((acc: number, p: any) => acc + (p.stock || 0), 0);
  const totalValue = db.products.reduce((acc: number, p: any) => acc + ((p.price || 0) * (p.stock || 0)), 0);
  
  // Custom mock users for display with admin roles
  const usersList = [
    { id: "google_12345", name: "Jane Smith", email: "janesmith@beautyhub.com", profile_image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120", is_admin: false },
    { id: "google_67890", name: "Sarah Connor", email: "sarah@skynet.com", profile_image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120", is_admin: false },
    { id: "admin_sff", name: "BeautyHub Admin", email: "sff6214@gmail.com", profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", is_admin: true },
    ...db.users
  ];

  // Map orders with user info
  const ordersList = db.orders.map((o: any) => {
    const user = usersList.find((u: any) => u.id === o.user_id) || { name: "Guest User", email: "guest@beautyhub.com" };
    return {
      id: o.id,
      total_price: o.total_price,
      status: o.status,
      created_at: o.created_at,
      user_name: user.name,
      user_email: user.email
    };
  });

  const salesTotal = db.orders.reduce((acc: number, o: any) => acc + (o.total_price || 0), 0);

  res.json({
    products_count: productsCount,
    total_stock: totalStock,
    total_value: parseFloat(totalValue.toFixed(2)),
    users_count: usersList.length,
    orders_count: db.orders.length,
    total_sales: parseFloat(salesTotal.toFixed(2)),
    users: usersList,
    orders: ordersList
  });
});

// POST /api/admin/upload-image: Base64 or standard URL image upload simulator
app.post("/api/admin/upload-image", reqAdmin, (req, res) => {
  const { name, base64 } = req.body;
  if (!base64) {
    return res.status(400).json({ error: "Missing base64 data stream" });
  }

  try {
    // Strip headers if they exist
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const filename = `uploaded_${Date.now()}_${name || "product.jpg"}`;
    const uploadDir = path.join(process.cwd(), "frontend", "uploads");
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    res.json({
      message: "Image uploaded successfully",
      image_url: `/uploads/${filename}`
    });
  } catch (err) {
    console.error("Express upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});


// --- SERVE THE FRONTEND ENTIRELY ---

const frontendDir = path.join(process.cwd(), "frontend");

// Route pages securely
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(frontendDir, "products.html"));
});

app.get("/product_detail", (req, res) => {
  res.sendFile(path.join(frontendDir, "product_detail.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(frontendDir, "cart.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(frontendDir, "login.html"));
});

// Secure static HTML serving for Admin files
app.get("/admin", (req, res) => {
  const user = req.session.user;
  if (!user || !user.is_admin) {
    return res.send(`
      <div style="font-family:sans-serif; text-align:center; padding:100px;">
        <h2>Access Denied</h2>
        <p>You must be an Administrator logged in with <strong>sff6214@gmail.com</strong> to access the admin portal.</p>
        <p><a href="/">Return to Home</a></p>
      </div>
    `);
  }
  res.sendFile(path.join(frontendDir, "admin", "dashboard.html"));
});

app.get("/admin/dashboard", (req, res) => {
  const user = req.session.user;
  if (!user || !user.is_admin) {
    return res.redirect("/admin");
  }
  res.sendFile(path.join(frontendDir, "admin", "dashboard.html"));
});

app.get("/admin/add_product", (req, res) => {
  const user = req.session.user;
  if (!user || !user.is_admin) {
    return res.redirect("/admin");
  }
  res.sendFile(path.join(frontendDir, "admin", "add_product.html"));
});

app.get("/admin/edit_product", (req, res) => {
  const user = req.session.user;
  if (!user || !user.is_admin) {
    return res.redirect("/admin");
  }
  res.sendFile(path.join(frontendDir, "admin", "edit_product.html"));
});

// Serve frontend directory assets statically
app.use(express.static(frontendDir));

const PORT = Number(process.env.PORT) || 3000;

initDatabase().then(() => {
  app.listen(PORT, "0.0.0.0", async () => {
    await initDatabase();
    console.log(`Express dev server running on port ${PORT}`);
  });
});
