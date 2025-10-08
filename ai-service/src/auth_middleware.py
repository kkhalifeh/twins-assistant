import os
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class AuthMiddleware:
    """Handle authentication with the backend API"""

    def __init__(self):
        self.backend_url = os.getenv("BACKEND_API_URL")
        if not self.backend_url:
            raise ValueError("BACKEND_API_URL environment variable is required")

    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user and get JWT token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/auth/login",
                    json={"email": email, "password": password},
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "token": data.get("token"),
                        "user": data.get("user")
                    }
                else:
                    logger.error(f"Authentication failed: {response.text}")
                    return None

        except Exception as e:
            logger.error(f"Error during authentication: {e}")
            return None

    async def register_user(self, email: str, password: str, name: str) -> Optional[Dict[str, Any]]:
        """Register a new user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/auth/register",
                    json={
                        "email": email,
                        "password": password,
                        "name": name
                    },
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 201:
                    data = response.json()
                    return {
                        "token": data.get("token"),
                        "user": data.get("user")
                    }
                else:
                    logger.error(f"Registration failed: {response.text}")
                    return None

        except Exception as e:
            logger.error(f"Error during registration: {e}")
            return None

    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and get user info"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/auth/profile",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    }
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Token verification failed: {response.text}")
                    return None

        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None

    async def get_user_children(self, token: str) -> Optional[list]:
        """Get user's children from backend"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/children",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    }
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get children: {response.text}")
                    return []

        except Exception as e:
            logger.error(f"Error getting children: {e}")
            return []

    def create_authenticated_headers(self, token: str) -> Dict[str, str]:
        """Create headers with authentication token"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

# Global auth instance
auth = AuthMiddleware()