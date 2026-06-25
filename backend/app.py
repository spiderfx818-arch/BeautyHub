import os
from flask import Flask, send_from_directory, redirect, request, session
from flask_session import Session
from .config import Config
from .models import init_db

# Import Blueprints
from .routes.auth import auth_bp
from .routes.products import products_bp
from .routes.cart import cart_bp
from .routes.admin import admin_bp

def create_app():
    # Setup template and static folders targeting /frontend
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
    
    app = Flask(__name__, 
                static_folder=frontend_dir,
                static_url_path="")
                
    app.config.from_object(Config)
    
    # Configure Flask serverside Session persistence
    app.config["SESSION_TYPE"] = "filesystem"
    Session(app)
    
    # Initialize SQLite schema and insert seed rows
    init_db()
    
    # Register API blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(cart_bp)
    app.register_blueprint(admin_bp)
    
    # --- Frontend Static Page Routes ---
    
    @app.route("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")
        
    @app.route("/products")
    @app.route("/products.html")
    def products_page():
        return send_from_directory(frontend_dir, "products.html")
        
    @app.route("/product_detail")
    @app.route("/product_detail.html")
    def detail_page():
        return send_from_directory(frontend_dir, "product_detail.html")
        
    @app.route("/cart")
    @app.route("/cart.html")
    def cart_page():
        return send_from_directory(frontend_dir, "cart.html")
        
    @app.route("/login")
    @app.route("/login.html")
    def login_page():
        return send_from_directory(frontend_dir, "login.html")
        
    # Hidden secure admin routes (server-side gatekeeping check)
    @app.route("/admin")
    @app.route("/admin/dashboard")
    @app.route("/admin/dashboard.html")
    def admin_dashboard():
        user = session.get("user")
        if not user or not user.get("is_admin"):
            return "<h3>Access Denied. You are not authorized to view this page.</h3><p><a href='/'>Go Home</a></p>", 403
        return send_from_directory(os.path.join(frontend_dir, "admin"), "dashboard.html")
        
    @app.route("/admin/add_product")
    @app.route("/admin/add_product.html")
    def admin_add_product():
        user = session.get("user")
        if not user or not user.get("is_admin"):
            return "<h3>Access Denied. You are not authorized to view this page.</h3><p><a href='/'>Go Home</a></p>", 403
        return send_from_directory(os.path.join(frontend_dir, "admin"), "add_product.html")
        
    @app.route("/admin/edit_product")
    @app.route("/admin/edit_product.html")
    def admin_edit_product():
        user = session.get("user")
        if not user or not user.get("is_admin"):
            return "<h3>Access Denied. You are not authorized to view this page.</h3><p><a href='/'>Go Home</a></p>", 403
        return send_from_directory(os.path.join(frontend_dir, "admin"), "edit_product.html")
        
    @app.route("/uploads/<path:filename>")
    def upload_static(filename):
        upload_folder = os.path.join(frontend_dir, "uploads")
        return send_from_directory(upload_folder, filename)

    return app

if __name__ == "__main__":
    app = create_app()
    # Run locally inside standard Python environment
    app.run(host="0.0.0.0", port=5000, debug=True)
