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
from user_service import user_service
from models import ProcessMessageRequest, RegisterUserRequest, APIResponse

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
# ProcessMessageRequest is now imported from models

@app.post("/process")
async def process_message(request: ProcessMessageRequest):
    """Process a message directly (for testing)"""
    try:
        result = await message_processor.process_message(
            message=request.message,
            user_id=request.user_id,
            user_phone=request.user_phone,
            user_name=request.user_name
        )
        return {"status": "success", "result": result}

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User registration endpoint
@app.post("/register")
async def register_user(request: RegisterUserRequest):
    """Register a new user"""
    try:
        user = await user_service.register_new_user(
            email=request.email,
            password=request.password,
            name=request.name,
            phone_number=request.phone_number
        )

        if user:
            return APIResponse(
                success=True,
                message="User registered successfully",
                data={
                    "user_id": user.id,
                    "name": user.name,
                    "email": user.email
                }
            )
        else:
            return APIResponse(
                success=False,
                message="Registration failed",
                error="Could not create user"
            )

    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return APIResponse(
            success=False,
            message="Registration failed",
            error=str(e)
        )

# User authentication endpoint
@app.post("/authenticate")
async def authenticate_user(email: str, password: str):
    """Authenticate user and return user context"""
    try:
        user = await user_service.authenticate_user_by_credentials(email, password)

        if user:
            return APIResponse(
                success=True,
                message="Authentication successful",
                data={
                    "user_id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "children": [child.name for child in user.children]
                }
            )
        else:
            return APIResponse(
                success=False,
                message="Authentication failed",
                error="Invalid credentials"
            )

    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return APIResponse(
            success=False,
            message="Authentication failed",
            error=str(e)
        )

# API info endpoint
@app.get("/")
async def root():
    return {
        "service": "Twin Parenting AI Service",
        "endpoints": {
            "health": "/health",
            "webhook_verify": "GET /webhook",
            "webhook_receive": "POST /webhook",
            "process_message": "POST /process",
            "register": "POST /register",
            "authenticate": "POST /authenticate"
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
