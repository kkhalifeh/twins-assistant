from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
import uvicorn
import logging

# Import our modules
from message_processor import MessageProcessor
from webhook_handler import WhatsAppWebhook

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Twin Parenting AI Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
message_processor = MessageProcessor()
whatsapp_webhook = WhatsAppWebhook()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "twin-parenting-ai",
        "version": "1.0.0"
    }

# WhatsApp webhook verification
@app.get("/webhook")
async def verify_webhook(request: Request):
    """Handle WhatsApp webhook verification"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    if mode and token:
        if mode == "subscribe" and token == os.getenv("META_WEBHOOK_VERIFY_TOKEN"):
            logger.info("Webhook verified successfully")
            return int(challenge)
    
    raise HTTPException(status_code=403, detail="Forbidden")

# WhatsApp webhook for messages
@app.post("/webhook")
async def receive_message(request: Request):
    """Handle incoming WhatsApp messages"""
    try:
        body = await request.json()
        logger.info(f"Received webhook: {body}")
        
        # Process the webhook
        result = await whatsapp_webhook.process_webhook(body)
        return {"status": "success", "result": result}
    
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return {"status": "error", "message": str(e)}

# Direct message processing endpoint (for testing)
class ProcessMessageRequest(BaseModel):
    message: str
    user_phone: str
    user_name: Optional[str] = None

@app.post("/process")
async def process_message(request: ProcessMessageRequest):
    """Process a message directly (for testing)"""
    try:
        result = await message_processor.process_message(
            message=request.message,
            user_phone=request.user_phone,
            user_name=request.user_name
        )
        return {"status": "success", "result": result}
    
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API info endpoint
@app.get("/")
async def root():
    return {
        "service": "Twin Parenting AI Service",
        "endpoints": {
            "health": "/health",
            "webhook_verify": "GET /webhook",
            "webhook_receive": "POST /webhook",
            "process_message": "POST /process"
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
