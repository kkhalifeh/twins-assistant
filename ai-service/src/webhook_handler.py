import os
import httpx
import logging
from typing import Dict, Any
from message_processor import MessageProcessor

logger = logging.getLogger(__name__)

class WhatsAppWebhook:
    def __init__(self):
        self.access_token = os.getenv("META_ACCESS_TOKEN")
        self.phone_number_id = os.getenv("META_PHONE_NUMBER_ID")
        self.api_url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
        self.message_processor = MessageProcessor()
    
    async def process_webhook(self, webhook_data: Dict) -> Dict:
        """Process incoming webhook from WhatsApp"""
        try:
            # Extract message data from webhook
            entry = webhook_data.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            
            if "messages" in value:
                message = value["messages"][0]
                contact = value["contacts"][0]
                
                # Extract message details
                from_number = message["from"]
                message_text = message.get("text", {}).get("body", "")
                sender_name = contact.get("profile", {}).get("name", "")
                
                logger.info(f"Message from {sender_name} ({from_number}): {message_text}")
                
                # Process the message
                result = await self.message_processor.process_message(
                    message=message_text,
                    user_phone=from_number,
                    user_name=sender_name
                )
                
                # Send response back to WhatsApp
                await self.send_message(from_number, result.get("response", "Message received"))
                
                return result
            
            return {"status": "no_message"}
            
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            raise
    
    async def send_message(self, to_number: str, message: str) -> bool:
        """Send message back to WhatsApp user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "to": to_number,
                        "type": "text",
                        "text": {"body": message}
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"Message sent successfully to {to_number}")
                    return True
                else:
                    logger.error(f"Failed to send message: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return False
