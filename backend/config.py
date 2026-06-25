import os
from dotenv import load_dotenv

# Load workspace .env if present
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "beautyhub_super_secret_cookie_key")
    DATABASE = os.path.join(os.path.dirname(__file__), "database.db")
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    
    # Whitelist of Admin Emails
    # We always whitelist the default user and sff6214@gmail.com
    ADMIN_EMAILS = [
        "sff6214@gmail.com",
        "admin@beautyhub.com",
        "beautyhub.admin@gmail.com"
    ]
