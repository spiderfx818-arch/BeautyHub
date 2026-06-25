from flask import Blueprint, request, jsonify, session
from ..models import get_db

products_bp = Blueprint("products", __name__)

def req_admin(func):
    """Decorator to enforce admin authorizations on routes."""
    def wrapper(*args, **kwargs):
        user = session.get("user")
        if not user or not user.get("is_admin"):
            return jsonify({"error": "Unauthorized. Admin credentials required."}), 403
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

@products_bp.route("/api/products", methods=["GET"])
def get_products():
    """Fetches all products with optional filters for category and search text."""
    category = request.args.get("category")
    search = request.args.get("search")
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    
    if category:
        query += " AND category = ?"
        params.append(category)
        
    if search:
        query += " AND (name LIKE ? OR description LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    query += " ORDER BY id DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    # Convert SQlite rows to lists of dicts
    products = []
    for r in rows:
        products.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "price": r["price"],
            "category": r["category"],
            "image_url": r["image_url"],
            "stock": r["stock"]
        })
        
    conn.close()
    return jsonify(products)

@products_bp.route("/api/products/<int:pid>", methods=["GET"])
def get_product(pid):
    """Fetches a single product by its unique integer database ID."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (pid,))
    r = cursor.fetchone()
    conn.close()
    
    if not r:
        return jsonify({"error": "Product not found"}), 404
        
    product = {
        "id": r["id"],
        "name": r["name"],
        "description": r["description"],
        "price": r["price"],
        "category": r["category"],
        "image_url": r["image_url"],
        "stock": r["stock"]
    }
    return jsonify(product)

@products_bp.route("/api/products", methods=["POST"])
@req_admin
def create_product():
    """Creates a new beauty product (admin privilege required)."""
    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description", "")
    price = data.get("price")
    category = data.get("category")
    image_url = data.get("image_url", "")
    stock = data.get("stock", 10)
    
    if not name or price is None or not category:
        return jsonify({"error": "Missing required fields: name, price, category"}), 400
        
    try:
        price = float(price)
        stock = int(stock)
    except ValueError:
        return jsonify({"error": "Invalid format for price or stock"}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO products (name, description, price, category, image_url, stock)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (name, description, price, category, image_url, stock))
    
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    
    return jsonify({
        "message": "Product created successfully",
        "id": new_id
    }), 201

@products_bp.route("/api/products/<int:pid>", methods=["PUT"])
@req_admin
def update_product(pid):
    """Updates an existing beauty product (admin privilege required)."""
    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description")
    price = data.get("price")
    category = data.get("category")
    image_url = data.get("image_url")
    stock = data.get("stock")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (pid,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Product not found"}), 404
        
    # Build UPDATE query dynamically
    fields = []
    params = []
    
    if name is not None:
        fields.append("name = ?")
        params.append(name)
    if description is not None:
        fields.append("description = ?")
        params.append(description)
    if price is not None:
        try:
            fields.append("price = ?")
            params.append(float(price))
        except ValueError:
            return jsonify({"error": "Price must be a valid number"}), 400
    if category is not None:
        fields.append("category = ?")
        params.append(category)
    if image_url is not None:
        fields.append("image_url = ?")
        params.append(image_url)
    if stock is not None:
        try:
            fields.append("stock = ?")
            params.append(int(stock))
        except ValueError:
            return jsonify({"error": "Stock must be a valid integer"}), 400
            
    if not fields:
        return jsonify({"error": "No update fields supplied"}), 400
        
    query = f"UPDATE products SET {', '.join(fields)} WHERE id = ?"
    params.append(pid)
    
    cursor.execute(query, params)
    conn.commit()
    conn.close()
    
    return jsonify({"message": f"Product {pid} updated successfully"})

@products_bp.route("/api/products/<int:pid>", methods=["DELETE"])
@req_admin
def delete_product(pid):
    """Deletes an existing product by unique database ID (admin privilege required)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (pid,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Product not found"}), 404
        
    cursor.execute("DELETE FROM products WHERE id = ?", (pid,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": f"Product {pid} deleted successfully"})
