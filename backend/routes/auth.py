from flask import Blueprint, request, session, redirect, jsonify, url_for
import requests
import json
from ..config import Config
from ..models import get_db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login/google")
def login_google():
    """Generates the Google OAuth 2.0 Authorization URL and redirects the user."""
    # Build redirect URI
    redirect_uri = f"{Config.APP_URL}/login/callback"
    
    # Standard Google OAuth 2.0 authorization endpoint
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": Config.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        # Request access to basic profile and email
        "scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        "prompt": "select_account"
    }
    
    # Construct URL and return
    query_string = "&".join(f"{k}={requests.utils.quote(v)}" for k, v in params.items())
    full_url = f"{auth_url}?{query_string}"
    
    # In REST context, client might call this to fetch the auth URL
    # Or navigate directly. We handle both: if AJAX, return json, else redirect.
    if request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
        return jsonify({"url": full_url})
        
    return redirect(full_url)

@auth_bp.route("/login/callback")
def login_callback():
    """Handles the Google OAuth redirection, exchanges code for token, and registers/logs in the user."""
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "No authorization code provided"}), 400
        
    redirect_uri = f"{Config.APP_URL}/login/callback"
    
    try:
        # Step 1: Exchange auth code for access token
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": Config.GOOGLE_CLIENT_ID,
            "client_secret": Config.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        token_resp = requests.post(token_url, data=data)
        token_json = token_resp.json()
        
        if "access_token" not in token_json:
            return f"<h3>Authentication failed: Mismatch or missing token keys. Please verify credentials.</h3><p><a href='/'>Go Home</a></p>", 400
            
        access_token = token_json["access_token"]
        
        # Step 2: Fetch user profile info from Google API
        user_info_resp = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_info = user_info_resp.json()
        
        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name", "BeautyHub Enthusiast")
        profile_image = user_info.get("picture", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop")
        
        if not google_id or not email:
            return jsonify({"error": "Failed to retrieve user identifier from Google"}), 400
            
        # Is user an admin?
        is_admin = 1 if email in Config.ADMIN_EMAILS else 0
        
        # Step 3: Register or update user in SQLite database
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE id = ?", (google_id,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            # Update name/image, maintain or set admin from whitelist configs
            cursor.execute("""
            UPDATE users SET name = ?, profile_image = ?, is_admin = ? WHERE id = ?
            """, (name, profile_image, is_admin, google_id))
        else:
            # Create user
            cursor.execute("""
            INSERT INTO users (id, name, email, profile_image, is_admin)
            VALUES (?, ?, ?, ?, ?)
            """, (google_id, name, email, profile_image, is_admin))
            
        conn.commit()
        conn.close()
        
        # Step 4: Record user in flask session
        session["user"] = {
            "id": google_id,
            "name": name,
            "email": email,
            "profile_image": profile_image,
            "is_admin": bool(is_admin)
        }
        
        # Return success popup window message
        return """
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. You can close this window now.</p>
          </body>
        </html>
        """
        
    except Exception as e:
        return f"<h3>OAuth Error: {str(e)}</h3><p><a href='/'>Go Home</a></p>", 500

@auth_bp.route("/logout")
def logout():
    """Logs the user out by clearing the session."""
    session.pop("user", None)
    return redirect("/")

@auth_bp.route("/api/user")
def get_user():
    """Returns details of the logged-in user, or null/empty info if unauthenticated."""
    user = session.get("user")
    if not user:
        return jsonify({"authenticated": False, "user": None})
        
    return jsonify({
        "authenticated": True,
        "user": user
    })
