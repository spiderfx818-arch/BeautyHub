from flask import Blueprint, request, jsonify, session
from ..models import get_db

cart_bp = Blueprint("cart", __name__)

def get_session_cart():
    """Initializes and returns the temporary guest cart from raw session data."""
    if "cart" not in session:
        session["cart"] = {}
    return session["cart"]

@cart_bp.route("/api/cart", methods=["GET"])
def get_cart():
    """Retrieves all items currently in the cart, resolving names/prices from database."""
    user = session.get("user")
    items_out = []
    
    if user:
        # Fetch directly from sqlite DB
        user_id = user["id"]
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.product_id, c.quantity, p.name, p.price, p.category, p.image_url, p.stock
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        """, (user_id,))
        rows = cursor.fetchall()
        for r in rows:
            items_out.append({
                "product_id": r["product_id"],
                "quantity": r["quantity"],
                "name": r["name"],
                "price": r["price"],
                "category": r["category"],
                "image_url": r["image_url"],
                "stock": r["stock"]
            })
        conn.close()
    else:
        # Session cart fallback for guest browsing
        guest_cart = get_session_cart()
        if guest_cart:
            conn = get_db()
            cursor = conn.cursor()
            for pid_str, quantity in list(guest_cart.items()):
                try:
                    pid = int(pid_str)
                except ValueError:
                    continue
                cursor.execute("SELECT * FROM products WHERE id = ?", (pid,))
                p = cursor.fetchone()
                if p:
                    items_out.append({
                        "product_id": pid,
                        "quantity": quantity,
                        "name": p["name"],
                        "price": p["price"],
                        "category": p["category"],
                        "image_url": p["image_url"],
                        "stock": p["stock"]
                    })
            conn.close()
            
    return jsonify(items_out)

@cart_bp.route("/api/cart/add", methods=["POST"])
def add_to_cart():
    """Adds a item or increments its quantity in the shopping cart."""
    data = request.get_json() or {}
    product_id = data.get("product_id")
    quantity = data.get("quantity", 1)
    
    if product_id is None:
        return jsonify({"error": "Missing product_id"}), 400
        
    try:
        product_id = int(product_id)
        quantity = int(quantity)
    except ValueError:
        return jsonify({"error": "product_id and quantity must be integers"}), 400
        
    # Check if product exists and is in stock
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT stock FROM products WHERE id = ?", (product_id,))
    p = cursor.fetchone()
    if not p:
        conn.close()
        return jsonify({"error": "Product not found"}), 404
        
    user = session.get("user")
    if user:
        user_id = user["id"]
        # DB check
        cursor.execute("SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
        row = cursor.fetchone()
        
        if row:
            new_qty = row["quantity"] + quantity
            cursor.execute("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", (new_qty, user_id, product_id))
        else:
            cursor.execute("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)", (user_id, product_id, quantity))
            
        conn.commit()
        conn.close()
    else:
        # Store in guest session cart
        guest_cart = get_session_cart()
        pid_str = str(product_id)
        guest_cart[pid_str] = guest_cart.get(pid_str, 0) + quantity
        session.modified = True
        conn.close()
        
    return jsonify({"message": "Product added to cart successfully"})

@cart_bp.route("/api/cart/remove", methods=["POST"])
def remove_from_cart():
    """Decrements or completely deletes a product from the shopping cart."""
    data = request.get_json() or {}
    product_id = data.get("product_id")
    # if disconnect_full is True, delete the entire row
    all_qty = data.get("all", False)
    
    if product_id is None:
        return jsonify({"error": "Missing product_id"}), 400
        
    try:
        product_id = int(product_id)
    except ValueError:
        return jsonify({"error": "Invalid format for product_id"}), 400
        
    user = session.get("user")
    if user:
        user_id = user["id"]
        conn = get_db()
        cursor = conn.cursor()
        
        if all_qty:
            cursor.execute("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
        else:
            cursor.execute("SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
            row = cursor.fetchone()
            if row:
                if row["quantity"] <= 1:
                    cursor.execute("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
                else:
                    cursor.execute("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", (row["quantity"] - 1, user_id, product_id))
                    
        conn.commit()
        conn.close()
    else:
        guest_cart = get_session_cart()
        pid_str = str(product_id)
        if pid_str in guest_cart:
            if all_qty or guest_cart[pid_str] <= 1:
                del guest_cart[pid_str]
            else:
                guest_cart[pid_str] -= 1
            session.modified = True
            
    return jsonify({"message": "Product removed from cart successfully"})
