import json
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class StorageService:
    """Simple in-memory storage service for caching user data"""

    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = int(os.getenv("CACHE_TTL", 3600))  # 1 hour default

    def _is_expired(self, timestamp: datetime) -> bool:
        """Check if cached data is expired"""
        return datetime.now() - timestamp > timedelta(seconds=self.cache_ttl)

    def get_user_by_phone(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """Get cached user data by phone number"""
        cache_key = f"phone:{phone_number}"
        if cache_key in self.cache:
            data = self.cache[cache_key]
            if not self._is_expired(data.get("timestamp", datetime.min)):
                return data.get("user_data")
        return None

    def cache_user_by_phone(self, phone_number: str, user_data: Dict[str, Any]) -> None:
        """Cache user data by phone number"""
        cache_key = f"phone:{phone_number}"
        self.cache[cache_key] = {
            "user_data": user_data,
            "timestamp": datetime.now()
        }
        logger.info(f"Cached user data for phone: {phone_number}")

    def get_user_children(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached children data for a user"""
        cache_key = f"children:{user_id}"
        if cache_key in self.cache:
            data = self.cache[cache_key]
            if not self._is_expired(data.get("timestamp", datetime.min)):
                return data.get("children_data")
        return None

    def cache_user_children(self, user_id: str, children_data: Dict[str, Any]) -> None:
        """Cache children data for a user"""
        cache_key = f"children:{user_id}"
        self.cache[cache_key] = {
            "children_data": children_data,
            "timestamp": datetime.now()
        }
        logger.info(f"Cached children data for user: {user_id}")

    def get_user_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get complete cached user context"""
        cache_key = f"context:{user_id}"
        if cache_key in self.cache:
            data = self.cache[cache_key]
            if not self._is_expired(data.get("timestamp", datetime.min)):
                return data.get("context_data")
        return None

    def cache_user_context(self, user_id: str, context_data: Dict[str, Any]) -> None:
        """Cache complete user context"""
        cache_key = f"context:{user_id}"
        self.cache[cache_key] = {
            "context_data": context_data,
            "timestamp": datetime.now()
        }
        logger.info(f"Cached user context for user: {user_id}")

    def invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate all cached data for a user"""
        keys_to_remove = []
        for key in self.cache.keys():
            if user_id in key:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self.cache[key]

        logger.info(f"Invalidated cache for user: {user_id}")

    def clear_expired_cache(self) -> None:
        """Remove expired entries from cache"""
        expired_keys = []
        for key, data in self.cache.items():
            if self._is_expired(data.get("timestamp", datetime.min)):
                expired_keys.append(key)

        for key in expired_keys:
            del self.cache[key]

        if expired_keys:
            logger.info(f"Cleared {len(expired_keys)} expired cache entries")

# Global storage instance
storage = StorageService()