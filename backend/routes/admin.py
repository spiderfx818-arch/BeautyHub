from flask import Blueprint, request, jsonify, session, current_app
import os
from werkzeug.utils import secure_filename
from ..models import get_db

admin_bp = Blueprint("admin", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

def is_allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def req_admin_decorator(func):
    """Enforces that only verified admins can look up analytics."""
    def wrapper(*args, **kwargs):
        user = session.get("user")
        if not user or not user.get("is_admin"):
            return jsonify({"error": "Access Denied. Admins only."}), 403
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

@admin_bp.route("/api/admin/stats", methods=["GET"])
@req_admin_decorator
def get_stats():
    """Generates counts, total stocks, and active orders for the dashboard interface."""
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Product stats
    cursor.execute("SELECT COUNT(*) as count, SUM(stock) as total_stock, SUM(price * stock) as total_value FROM products")
    p_stats = cursor.fetchone()
    
    # 2. User count
    cursor.execute("SELECT COUNT(*) as count FROM users")
    u_count = cursor.fetchone()["count"]
    
    # 3. Order active count (optional tables, initialized in models.py)
    cursor.execute("SELECT COUNT(*) as count, SUM(total_price) as sales FROM orders")
    o_row = cursor.fetchone()
    o_count = o_row["count"] if o_row else 0
    o_sales = o_row["sales"] if o_row and o_row["sales"] else 0
    
    # Send user details list to verify admins
    cursor.execute("SELECT id, name, email, profile_image, is_admin FROM users")
    users = [dict(r) for r in cursor.fetchall()]

    # Fetch orders list
    cursor.execute("""
    SELECT o.id, o.total_price, o.status, o.created_at, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.id DESC
    """)
    orders = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        "products_count": p_stats["count"] if p_stats else 0,
        "total_stock": p_stats["total_stock"] if p_stats and p_stats["total_stock"] else 0,
        "total_value": round(p_stats["total_value"], 2) if p_stats and p_stats["total_value"] else 0.0,
        "users_count": u_count,
        "orders_count": o_count,
        "total_sales": round(o_sales, 2),
        "users": users,
        "orders": orders
    })

@admin_bp.route("/api/admin/orders", methods=["GET"])
@req_admin_decorator
def view_orders():
    """Fetches list of orders for the admin."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT o.id, o.total_price, o.status, o.created_at, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.id DESC
    """)
    orders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(orders)

@admin_bp.route("/api/admin/upload-image", methods=["POST"])
@req_admin_decorator
def upload_image():
    """Extracts, validates, and uploads a file to the static uploads directory."""
    if "image" not in request.files:
        return jsonify({"error": "No file chunk found in multipart query"}), 400
        
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty file name submitted"}), 400
        
    if file and is_allowed_file(file.filename):
        filename = secure_filename(file.filename)
        
        # Determine upload directory: frontend/uploads
        upload_folder = os.path.join(current_app.root_path, "..", "frontend", "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Return web-facing URL path
        web_path = f"/uploads/{filename}"
        return jsonify({
            "message": "Image uploaded successfully",
            "image_url": web_path
        })
        
    return jsonify({"error": "Invalid file extension format"}), 400
