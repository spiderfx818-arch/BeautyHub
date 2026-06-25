-- BeautyHub Standalone SQLite Schema Definition

-- 1. User table (holds Google OAuth logins)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,               -- Google ID
    name TEXT NOT NULL,                -- Profile Full Name
    email TEXT NOT NULL UNIQUE,        -- Google Account Email
    profile_image TEXT,                -- Google Avatar Picture URL
    is_admin INTEGER DEFAULT 0         -- Integer Boolean (0 for false, 1 for true)
);

-- 2. Product table (beauty store catalog item specs)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,            -- Skincare, Makeup, Haircare, Perfume
    image_url TEXT,
    stock INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Shopping Cart items table (associates users to products)
CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)        -- Assures only one row per product/user
);

-- 4. Sales Orders table (optional tracking references)
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Shipped, Delivered, Canceled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
