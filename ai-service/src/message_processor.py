from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
import json
import httpx
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Pydantic models for structured output
class FeedingCommand(BaseModel):
    action: Literal["create_feeding_log"]
    child_name: str
    amount: Optional[float] = Field(None, description="Amount in ml")
    type: Literal["BREAST", "BOTTLE", "FORMULA", "MIXED", "SOLID"]
    time: Optional[str] = Field(None, description="ISO format time")
    notes: Optional[str] = None

class SleepCommand(BaseModel):
    action: Literal["start_sleep", "end_sleep", "create_sleep_log"]
    child_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    type: Optional[Literal["NAP", "NIGHT"]] = "NAP"
    quality: Optional[Literal["DEEP", "RESTLESS", "INTERRUPTED"]] = None
    notes: Optional[str] = None

class DiaperCommand(BaseModel):
    action: Literal["create_diaper_log"]
    child_name: str
    type: Literal["WET", "DIRTY", "MIXED"]
    consistency: Optional[Literal["NORMAL", "WATERY", "HARD"]] = None
    time: Optional[str] = None
    notes: Optional[str] = None

class HealthCommand(BaseModel):
    action: Literal["create_health_log"]
    child_name: str
    type: Literal["TEMPERATURE", "MEDICINE", "WEIGHT", "HEIGHT", "SYMPTOM"]
    value: str
    unit: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None

class QueryCommand(BaseModel):
    action: Literal["query"]
    query_type: str
    child_name: Optional[str] = None
    details: Dict[str, Any] = {}

class MessageProcessor:
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-4",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self.backend_url = os.getenv("BACKEND_API_URL")
        self.api_token = os.getenv("BACKEND_API_TOKEN")
        
        # Store child mappings
        self.children = {
            "samar": "cmgf1705b00016392cua4bod1",
            "maryam": "cmgf1705e00026392b2idt34c"
        }
    
    async def process_message(self, message: str, user_phone: str, user_name: Optional[str] = None) -> Dict:
        """Process a natural language message and execute the appropriate action"""
        
        # First, classify the intent
        intent = await self._classify_intent(message)
        logger.info(f"Classified intent: {intent}")
        
        # Parse the message based on intent
        try:
            if intent == "feeding":
                command = await self._parse_feeding(message)
                return await self._execute_feeding(command)
            
            elif intent == "sleep":
                command = await self._parse_sleep(message)
                return await self._execute_sleep(command)
            
            elif intent == "diaper":
                command = await self._parse_diaper(message)
                return await self._execute_diaper(command)
            
            elif intent == "health":
                command = await self._parse_health(message)
                return await self._execute_health(command)
            
            elif intent == "query":
                command = await self._parse_query(message)
                return await self._execute_query(command)
            
            else:
                return {
                    "response": "I didn't understand that. You can tell me about feeding, sleep, diapers, or health updates for Samar or Maryam.",
                    "intent": "unknown"
                }
        except Exception as e:
            logger.error(f"Error parsing message: {e}")
            return {
                "response": f"I understood this is about {intent}, but had trouble processing the details. Please try rephrasing.",
                "error": str(e)
            }
    
    async def _classify_intent(self, message: str) -> str:
        """Classify the intent of the message"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an assistant that classifies messages about baby care.
            Classify the message into one of these categories:
            - feeding: anything about feeding, bottles, breast, formula, milk, eating
            - sleep: anything about sleep, nap, wake, rest, awake
            - diaper: anything about diapers, poop, pee, wet, dirty, change
            - health: temperature, medicine, symptoms, weight, height
            - query: questions asking for information (when, how much, last time, etc.)
            - other: anything else
            
            Respond with only the category name."""),
            ("user", "{message}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        return result.content.strip().lower()
    
    async def _parse_feeding(self, message: str) -> FeedingCommand:
        """Parse feeding-related message"""
        current_time = datetime.now().isoformat()
        
        system_msg = f"""Extract feeding information from the message and return ONLY valid JSON.
        Child names are: Samar, Maryam
        Current time: {current_time}
        
        Return a JSON object with these exact fields:
        - action: must be "create_feeding_log"
        - child_name: must be "Samar" or "Maryam"
        - amount: number (ml amount) or null
        - type: must be "BOTTLE", "BREAST", "FORMULA", "MIXED", or "SOLID"
        - time: ISO datetime string (use current time if not specified)
        - notes: string or null
        
        Return ONLY the JSON object, no other text."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "{message}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        
        # Parse the JSON response
        try:
            data = json.loads(result.content)
            return FeedingCommand(**data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {result.content}")
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', result.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return FeedingCommand(**data)
            raise e
    
    async def _parse_sleep(self, message: str) -> SleepCommand:
        """Parse sleep-related message"""
        current_time = datetime.now().isoformat()
        
        system_msg = f"""Extract sleep information from the message and return ONLY valid JSON.
        Child names are: Samar, Maryam
        Current time: {current_time}
        
        Determine the action:
        - "start_sleep" if child is going to sleep now
        - "end_sleep" if child just woke up
        - "create_sleep_log" if reporting a past sleep
        
        Return a JSON object with these fields:
        - action: must be "start_sleep", "end_sleep", or "create_sleep_log"
        - child_name: must be "Samar" or "Maryam"
        - start_time: ISO datetime or null
        - end_time: ISO datetime or null
        - type: must be "NAP" or "NIGHT"
        - quality: "DEEP", "RESTLESS", "INTERRUPTED", or null
        - notes: string or null
        
        Return ONLY the JSON object, no other text."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "{message}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        
        try:
            data = json.loads(result.content)
            return SleepCommand(**data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {result.content}")
            import re
            json_match = re.search(r'\{.*\}', result.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return SleepCommand(**data)
            raise e
    
    async def _parse_diaper(self, message: str) -> DiaperCommand:
        """Parse diaper-related message"""
        current_time = datetime.now().isoformat()
        
        system_msg = f"""Extract diaper information from the message and return ONLY valid JSON.
        Child names are: Samar, Maryam
        Current time: {current_time}
        
        Return a JSON object with these exact fields:
        - action: must be "create_diaper_log"
        - child_name: must be "Samar" or "Maryam"
        - type: must be "WET", "DIRTY", or "MIXED"
        - consistency: "NORMAL", "WATERY", "HARD", or null
        - time: ISO datetime string (use current time if not specified)
        - notes: string or null
        
        Return ONLY the JSON object, no other text."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "{message}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        
        try:
            data = json.loads(result.content)
            return DiaperCommand(**data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {result.content}")
            import re
            json_match = re.search(r'\{.*\}', result.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return DiaperCommand(**data)
            raise e
    
    async def _parse_health(self, message: str) -> HealthCommand:
        """Parse health-related message"""
        current_time = datetime.now().isoformat()
        
        system_msg = f"""Extract health information from the message and return ONLY valid JSON.
        Child names are: Samar, Maryam
        Current time: {current_time}
        
        Return a JSON object with these exact fields:
        - action: must be "create_health_log"
        - child_name: must be "Samar" or "Maryam"
        - type: must be "TEMPERATURE", "MEDICINE", "WEIGHT", "HEIGHT", or "SYMPTOM"
        - value: string value
        - unit: string unit or null
        - time: ISO datetime string (use current time if not specified)
        - notes: string or null
        
        Return ONLY the JSON object, no other text."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "{message}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        
        try:
            data = json.loads(result.content)
            return HealthCommand(**data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {result.content}")
            import re
            json_match = re.search(r'\{.*\}', result.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return HealthCommand(**data)
            raise e
    
    async def _parse_query(self, message: str) -> QueryCommand:
        """Parse query/question message"""
        system_msg = """Extract query information from the message and return ONLY valid JSON.
        Child names are: Samar, Maryam
        
        Return a JSON object with these exact fields:
        - action: must be "query"
        - query_type: describe the type of query (e.g., "last_feeding", "last_sleep", "last_diaper", "summary")
        - child_name: "Samar", "Maryam", or null if both
        - details: empty object
        
        Return ONLY the JSON object, no other text."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "{message}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        
        try:
            data = json.loads(result.content)
            return QueryCommand(**data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {result.content}")
            import re
            json_match = re.search(r'\{.*\}', result.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return QueryCommand(**data)
            raise e
    
    async def _execute_feeding(self, command: FeedingCommand) -> Dict:
        """Execute feeding command by calling backend API"""
        child_id = self.children.get(command.child_name.lower())
        if not child_id:
            return {"error": f"Unknown child: {command.child_name}"}
        
        # Ensure we have a valid datetime
        try:
            if command.time:
                dt = datetime.fromisoformat(command.time.replace('Z', '+00:00'))
                formatted_time = dt.isoformat()
            else:
                formatted_time = datetime.now().isoformat()
        except:
            formatted_time = datetime.now().isoformat()
        
        logger.info(f"Sending feeding log with time: {formatted_time}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.backend_url}/feeding",
                headers={"Authorization": f"Bearer {self.api_token}"},
                json={
                    "childId": child_id,
                    "startTime": formatted_time,
                    "type": command.type,
                    "amount": command.amount,
                    "notes": command.notes or ""
                }
            )
            
            if response.status_code == 201:
                return {
                    "success": True,
                    "response": f"✅ Logged feeding for {command.child_name}: {command.amount}ml {command.type.lower()}",
                    "data": response.json()
                }
            else:
                logger.error(f"Failed to create feeding log: {response.text}")
                return {
                    "success": False,
                    "response": "Failed to log feeding",
                    "error": response.text
                }
    
    async def _execute_sleep(self, command: SleepCommand) -> Dict:
        """Execute sleep command"""
        child_id = self.children.get(command.child_name.lower())
        if not child_id:
            return {"error": f"Unknown child: {command.child_name}"}
        
        if command.action == "end_sleep":
            # Find and end active sleep session
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/sleep/end/{child_id}",
                    headers={"Authorization": f"Bearer {self.api_token}"}
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "response": f"✅ {command.child_name} woke up from {command.type.lower()}",
                        "data": response.json()
                    }
                elif response.status_code == 404:
                    return {
                        "success": False,
                        "response": f"No active sleep session found for {command.child_name}. Did they go to sleep earlier?",
                    }
                else:
                    return {
                        "success": False,
                        "response": "Failed to record wake up",
                        "error": response.text
                    }
        
        elif command.action == "start_sleep":
            # Create new sleep session
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/sleep",
                    headers={"Authorization": f"Bearer {self.api_token}"},
                    json={
                        "childId": child_id,
                        "startTime": command.start_time or datetime.now().isoformat(),
                        "type": command.type,
                        "notes": command.notes or f"{command.child_name} went to sleep"
                    }
                )
                
                if response.status_code == 201:
                    return {
                        "success": True,
                        "response": f"✅ {command.child_name} started {command.type.lower()}",
                        "data": response.json()
                    }
                else:
                    return {
                        "success": False,
                        "response": "Failed to log sleep start",
                        "error": response.text
                    }
        
        return {
            "success": True,
            "response": f"✅ Sleep logged for {command.child_name}",
            "command": command.dict()
        }
    
    async def _execute_diaper(self, command: DiaperCommand) -> Dict:
        """Execute diaper command"""
        child_id = self.children.get(command.child_name.lower())
        if not child_id:
            return {"error": f"Unknown child: {command.child_name}"}
        
        # Ensure we have a valid datetime
        try:
            if command.time:
                dt = datetime.fromisoformat(command.time.replace('Z', '+00:00'))
                formatted_time = dt.isoformat()
            else:
                formatted_time = datetime.now().isoformat()
        except:
            formatted_time = datetime.now().isoformat()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.backend_url}/diapers",
                headers={"Authorization": f"Bearer {self.api_token}"},
                json={
                    "childId": child_id,
                    "timestamp": formatted_time,
                    "type": command.type,
                    "consistency": command.consistency,
                    "notes": command.notes or ""
                }
            )
            
            if response.status_code == 201:
                return {
                    "success": True,
                    "response": f"✅ Diaper change logged for {command.child_name}: {command.type.lower()}",
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "response": "Failed to log diaper change",
                    "error": response.text
                }
    
    async def _execute_health(self, command: HealthCommand) -> Dict:
        """Execute health command"""
        child_id = self.children.get(command.child_name.lower())
        if not child_id:
            return {"error": f"Unknown child: {command.child_name}"}
        
        # Ensure we have a valid datetime
        try:
            if command.time:
                dt = datetime.fromisoformat(command.time.replace('Z', '+00:00'))
                formatted_time = dt.isoformat()
            else:
                formatted_time = datetime.now().isoformat()
        except:
            formatted_time = datetime.now().isoformat()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.backend_url}/health",
                headers={"Authorization": f"Bearer {self.api_token}"},
                json={
                    "childId": child_id,
                    "timestamp": formatted_time,
                    "type": command.type,
                    "value": command.value,
                    "unit": command.unit,
                    "notes": command.notes or ""
                }
            )
            
            if response.status_code == 201:
                return {
                    "success": True,
                    "response": f"✅ Health data logged for {command.child_name}: {command.type.lower()} = {command.value}{command.unit or ''}",
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "response": "Failed to log health data",
                    "error": response.text
                }
    
    async def _execute_query(self, command: QueryCommand) -> Dict:
        """Execute query command"""
        child_id = None
        if command.child_name:
            child_id = self.children.get(command.child_name.lower())
        
        if command.query_type == "last_feeding":
            if not child_id:
                return {"response": "Please specify which child (Samar or Maryam)"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/feeding/last/{child_id}",
                    headers={"Authorization": f"Bearer {self.api_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    time = datetime.fromisoformat(data['startTime'].replace('Z', '+00:00'))
                    time_ago = datetime.now() - time.replace(tzinfo=None)
                    hours = int(time_ago.total_seconds() // 3600)
                    minutes = int((time_ago.total_seconds() % 3600) // 60)
                    
                    return {
                        "success": True,
                        "response": f"{command.child_name} last ate {hours}h {minutes}m ago ({data['amount']}ml {data['type'].lower()})",
                        "data": data
                    }
                else:
                    return {
                        "success": False,
                        "response": f"No feeding records found for {command.child_name}"
                    }
        
        return {
            "success": True,
            "response": f"Query received: {command.query_type} for {command.child_name or 'both children'}",
            "command": command.dict()
        }
