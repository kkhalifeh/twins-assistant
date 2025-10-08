import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import User, Child, UserContext
from auth_middleware import auth
from storage_service import storage

logger = logging.getLogger(__name__)

class UserService:
    """Manage user authentication, context, and children data"""

    def __init__(self):
        self.auth = auth
        self.storage = storage

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID, with caching"""
        # Try cache first
        cached_context = self.storage.get_user_context(user_id)
        if cached_context:
            user_data = cached_context.get("user")
            children_data = cached_context.get("children", [])
            children = [Child(**child) for child in children_data]
            return User(**user_data, children=children)

        return None

    async def authenticate_user_by_credentials(self, email: str, password: str) -> Optional[User]:
        """Authenticate user and return User object with children"""
        auth_result = await self.auth.authenticate_user(email, password)
        if not auth_result:
            return None

        user_data = auth_result["user"]
        token = auth_result["token"]

        # Get user's children
        children_data = await self.auth.get_user_children(token)
        children = [Child(**child) for child in children_data] if children_data else []

        user = User(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            role=user_data["role"],
            auth_token=token,
            children=children
        )

        # Cache the complete user context
        await self._cache_user_context(user)
        return user

    async def create_user_context(self, user_id: str, phone_number: Optional[str] = None) -> Optional[UserContext]:
        """Create complete user context for message processing"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        children_names = [child.name for child in user.children]

        context = UserContext(
            user=user,
            phone_number=phone_number,
            children_names=children_names
        )

        return context

    async def get_child_by_name(self, user_id: str, child_name: str) -> Optional[Child]:
        """Get specific child by name for a user"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        for child in user.children:
            if child.name.lower() == child_name.lower():
                return child

        return None

    async def get_child_names_for_prompts(self, user_id: str) -> str:
        """Get formatted child names for AI prompts"""
        user = await self.get_user_by_id(user_id)
        if not user or not user.children:
            return "No children found"

        names = [child.name for child in user.children]
        if len(names) == 1:
            return names[0]
        elif len(names) == 2:
            return f"{names[0]} and {names[1]}"
        else:
            return f"{', '.join(names[:-1])}, and {names[-1]}"

    async def refresh_user_data(self, user_id: str) -> Optional[User]:
        """Refresh user data from backend (invalidate cache)"""
        self.storage.invalidate_user_cache(user_id)

        # Get user from cache first (which should be empty now)
        cached_context = self.storage.get_user_context(user_id)
        if cached_context:
            token = cached_context["user"]["auth_token"]

            # Verify token is still valid
            user_info = await self.auth.verify_token(token)
            if user_info:
                children_data = await self.auth.get_user_children(token)
                children = [Child(**child) for child in children_data] if children_data else []

                user = User(
                    id=user_info["id"],
                    email=user_info["email"],
                    name=user_info["name"],
                    role=user_info["role"],
                    auth_token=token,
                    children=children
                )

                await self._cache_user_context(user)
                return user

        return None

    async def register_new_user(self, email: str, password: str, name: str, phone_number: Optional[str] = None) -> Optional[User]:
        """Register a new user"""
        auth_result = await self.auth.register_user(email, password, name)
        if not auth_result:
            return None

        user_data = auth_result["user"]
        token = auth_result["token"]

        user = User(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            role=user_data["role"],
            auth_token=token,
            children=[]
        )

        # Cache user context
        await self._cache_user_context(user)

        # If phone number provided, cache the phone-to-user mapping
        if phone_number:
            self.storage.cache_user_by_phone(phone_number, user_data)

        return user

    async def _cache_user_context(self, user: User) -> None:
        """Cache complete user context"""
        context_data = {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "auth_token": user.auth_token
            },
            "children": [
                {
                    "id": child.id,
                    "name": child.name,
                    "date_of_birth": child.date_of_birth.isoformat(),
                    "gender": child.gender
                }
                for child in user.children
            ]
        }

        self.storage.cache_user_context(user.id, context_data)

    def get_user_token(self, user_id: str) -> Optional[str]:
        """Get user's auth token from cache"""
        cached_context = self.storage.get_user_context(user_id)
        if cached_context:
            return cached_context.get("user", {}).get("auth_token")
        return None

# Global user service instance
user_service = UserService()