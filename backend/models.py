import sqlite3
import os
from .config import Config

def get_db():
    """Returns a connection to the SQLite database with row factory enabled."""
    conn = sqlite3.connect(Config.DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Creates the database schema if it doesn't exist and seeds default products."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Create User table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        profile_image TEXT,
        is_admin INTEGER DEFAULT 0
    )
    """)

    # 2. Create Product table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        stock INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Create CartItem table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
    )
    """)

    # 4. Create Order table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        total_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    conn.commit()

    # Seed Default Products if empty
    cursor.execute("SELECT COUNT(*) as count FROM products")
    if cursor.fetchone()["count"] == 0:
        default_products = [
            (
                "Glow Hydra-Serum",
                "A lightweight, intense hydration serum packed with hyaluronic acid and niacinamide for an instant dewy radiance.",
                48.00,
                "Skincare",
                "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=65",
                25
            ),
            (
                "Velvet Matte Lipstick (Classic Red)",
                "Long-wear matte formulation with nourishing oils that keeps lips hydrated and delivers an ultra-pigmented aesthetic.",
                32.00,
                "Makeup",
                "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=65",
                35
            ),
            (
                "Argan Nourishing Hair Oil",
                "Restore shine and strength to dry or damaged hair. Fast-absorbing with a luxurious, non-greasy cashmere-like finish.",
                42.00,
                "Haircare",
                "https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=65",
                15
            ),
            (
                "Rose Oud Eau de Parfum",
                "A seductive blend of sweet damask rose and warm, smoky agarwood. Captivating, intense, and sophisticated.",
                110.00,
                "Perfume",
                "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=65",
                10
            ),
            (
                "Caffeine Awakening Eye Cream",
                "Instantly brightens tired-looking under-eyes and reduces puffiness with cold-pressed green coffee extracts.",
                36.00,
                "Skincare",
                "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=65",
                20
            ),
            (
                "Airbrush Finishing Powder",
                "A micro-fine translucent skin-blurring powder that sets makeup and controls shine for up to 12 hours.",
                39.00,
                "Makeup",
                "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=65",
                30
            ),
            (
                "Sandalwood Calm Cleansing Gel",
                "Sulfate-free pH-balanced cleanser created to pamper sensitive skin with soothing sandalwood and lavender extract.",
                28.00,
                "Skincare",
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=65",
                40
            ),
            (
                "Keratin Repair Hair Mask",
                "Intense conditioning treatment that reconstructs damaged hair shafts, repairs split ends, and seals moisture.",
                45.00,
                "Haircare",
                "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600&auto=format&fit=crop&q=65",
                18
            )
        ]
        cursor.executemany("""
        INSERT INTO products (name, description, price, category, image_url, stock)
        VALUES (?, ?, ?, ?, ?, ?)
        """, default_products)
        conn.commit()

    conn.close()
