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
    # Supports both the built-in defaults and an optional comma-separated ADMIN_EMAILS env var.
    def _get_admin_emails():
        configured = os.environ.get("ADMIN_EMAILS", "")
        configured_emails = [email.strip().lower() for email in configured.split(",") if email.strip()]
        defaults = [
            "sff6214@gmail.com",
            "spiderfx818@gmail.com",
            "admin@beautyhub.com",
            "beautyhub.admin@gmail.com",
        ]
        return list(dict.fromkeys(defaults + configured_emails))

    ADMIN_EMAILS = _get_admin_emails()
