from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from typing import Optional, Literal, Dict, Any
import json
import httpx
import os
from datetime import datetime
import logging
from models import (
    FeedingCommand, SleepCommand, DiaperCommand, HealthCommand, QueryCommand,
    UserContext, Child
)
from user_service import user_service

logger = logging.getLogger(__name__)

class MessageProcessor:
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-4",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self.backend_url = os.getenv("BACKEND_API_URL")
        self.user_service = user_service

    async def process_message(self, message: str, user_id: str, user_phone: Optional[str] = None, user_name: Optional[str] = None) -> Dict:
        """Process a natural language message with dynamic user context"""

        # Get user context
        user_context = await self.user_service.create_user_context(user_id, user_phone)
        if not user_context:
            return {
                "response": "User not found. Please make sure you're authenticated.",
                "error": "user_not_found"
            }

        if not user_context.children_names:
            return {
                "response": f"Hi {user_context.user.name}! You don't have any children registered yet. Please add a child first to start tracking their activities.",
                "intent": "no_children"
            }

        # First, classify the intent
        intent = await self._classify_intent(message, user_context)
        logger.info(f"Classified intent: {intent} for user: {user_context.user.name}")

        # Parse the message based on intent
        try:
            if intent == "feeding":
                command = await self._parse_feeding(message, user_context)
                return await self._execute_feeding(command, user_context)

            elif intent == "sleep":
                command = await self._parse_sleep(message, user_context)
                return await self._execute_sleep(command, user_context)

            elif intent == "diaper":
                command = await self._parse_diaper(message, user_context)
                return await self._execute_diaper(command, user_context)

            elif intent == "health":
                command = await self._parse_health(message, user_context)
                return await self._execute_health(command, user_context)

            elif intent == "query":
                command = await self._parse_query(message, user_context)
                return await self._execute_query(command, user_context)

            else:
                children_list = await self.user_service.get_child_names_for_prompts(user_id)
                return {
                    "response": f"I didn't understand that. You can tell me about feeding, sleep, diapers, or health updates for {children_list}. You can also ask questions like 'when did [child] last eat?'",
                    "intent": "unknown"
                }
        except Exception as e:
            logger.error(f"Error parsing message: {e}")
            return {
                "response": f"I understood this is about {intent}, but had trouble processing the details. Please try rephrasing.",
                "error": str(e)
            }

    async def _classify_intent(self, message: str, user_context: UserContext) -> str:
        """Classify the intent of the message"""
        children_names = ", ".join(user_context.children_names)

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are an assistant that classifies messages about baby care.
            The user has children named: {children_names}

            Classify the message into one of these categories:
            - feeding: anything about feeding, bottles, breast, formula, milk, eating, drinking
            - sleep: anything about sleep, nap, wake, rest, awake, bedtime
            - diaper: anything about diapers, poop, pee, wet, dirty, change
            - health: temperature, medicine, symptoms, weight, height, fever, illness
            - query: questions asking for information (when, how much, last time, status, summary, etc.)
            - other: anything else

            Respond with only the category name."""),
            ("user", "{message}")
        ])

        chain = prompt | self.llm
        result = await chain.ainvoke({"message": message})
        return result.content.strip().lower()

    async def _parse_feeding(self, message: str, user_context: UserContext) -> FeedingCommand:
        """Parse feeding-related message with dynamic child names"""
        current_time = datetime.now().isoformat()
        children_names = ", ".join(user_context.children_names)

        system_msg = f"""Extract feeding information from the message and return ONLY valid JSON.
        Child names available: {children_names}
        Current time: {current_time}

        Return a JSON object with these exact fields:
        - action: must be "create_feeding_log"
        - child_name: must be one of the available child names (exact match)
        - amount: number (ml amount) or null
        - type: must be "BOTTLE", "BREAST", "FORMULA", "MIXED", or "SOLID"
        - time: ISO datetime string (use current time if not specified)
        - notes: string or null

        If the child name is unclear or not mentioned, use the first available child.

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

    async def _parse_sleep(self, message: str, user_context: UserContext) -> SleepCommand:
        """Parse sleep-related message with dynamic child names"""
        current_time = datetime.now().isoformat()
        children_names = ", ".join(user_context.children_names)

        system_msg = f"""Extract sleep information from the message and return ONLY valid JSON.
        Child names available: {children_names}
        Current time: {current_time}

        Determine the action:
        - "start_sleep" if child is going to sleep now
        - "end_sleep" if child just woke up
        - "create_sleep_log" if reporting a past sleep

        Return a JSON object with these fields:
        - action: must be "start_sleep", "end_sleep", or "create_sleep_log"
        - child_name: must be one of the available child names (exact match)
        - start_time: ISO datetime or null
        - end_time: ISO datetime or null
        - type: must be "NAP" or "NIGHT"
        - quality: "DEEP", "RESTLESS", "INTERRUPTED", or null
        - notes: string or null

        If the child name is unclear, use the first available child.

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

    async def _parse_diaper(self, message: str, user_context: UserContext) -> DiaperCommand:
        """Parse diaper-related message with dynamic child names"""
        current_time = datetime.now().isoformat()
        children_names = ", ".join(user_context.children_names)

        system_msg = f"""Extract diaper information from the message and return ONLY valid JSON.
        Child names available: {children_names}
        Current time: {current_time}

        Return a JSON object with these exact fields:
        - action: must be "create_diaper_log"
        - child_name: must be one of the available child names (exact match)
        - type: must be "WET", "DIRTY", or "MIXED"
        - consistency: "NORMAL", "WATERY", "HARD", or null
        - time: ISO datetime string (use current time if not specified)
        - notes: string or null

        If the child name is unclear, use the first available child.

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

    async def _parse_health(self, message: str, user_context: UserContext) -> HealthCommand:
        """Parse health-related message with dynamic child names"""
        current_time = datetime.now().isoformat()
        children_names = ", ".join(user_context.children_names)

        system_msg = f"""Extract health information from the message and return ONLY valid JSON.
        Child names available: {children_names}
        Current time: {current_time}

        Return a JSON object with these exact fields:
        - action: must be "create_health_log"
        - child_name: must be one of the available child names (exact match)
        - type: must be "TEMPERATURE", "MEDICINE", "WEIGHT", "HEIGHT", or "SYMPTOM"
        - value: string value
        - unit: string unit or null
        - time: ISO datetime string (use current time if not specified)
        - notes: string or null

        If the child name is unclear, use the first available child.

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

    async def _parse_query(self, message: str, user_context: UserContext) -> QueryCommand:
        """Parse query/question message with dynamic child names"""
        children_names = ", ".join(user_context.children_names)

        system_msg = f"""Extract query information from the message and return ONLY valid JSON.
        Child names available: {children_names}

        Return a JSON object with these exact fields:
        - action: must be "query"
        - query_type: describe the type of query (e.g., "last_feeding", "last_sleep", "last_diaper", "summary", "status")
        - child_name: one of the available child names, or null if asking about all children
        - details: empty object

        If asking about all children or no specific child mentioned, set child_name to null.

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

    async def _execute_feeding(self, command: FeedingCommand, user_context: UserContext) -> Dict:
        """Execute feeding command by calling backend API"""
        child = await self.user_service.get_child_by_name(user_context.user.id, command.child_name)
        if not child:
            available_children = await self.user_service.get_child_names_for_prompts(user_context.user.id)
            return {"error": f"Child '{command.child_name}' not found. Available children: {available_children}"}

        # Get auth token
        token = self.user_service.get_user_token(user_context.user.id)
        if not token:
            return {"error": "Authentication token not found"}

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
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "childId": child.id,
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

    async def _execute_sleep(self, command: SleepCommand, user_context: UserContext) -> Dict:
        """Execute sleep command"""
        child = await self.user_service.get_child_by_name(user_context.user.id, command.child_name)
        if not child:
            available_children = await self.user_service.get_child_names_for_prompts(user_context.user.id)
            return {"error": f"Child '{command.child_name}' not found. Available children: {available_children}"}

        token = self.user_service.get_user_token(user_context.user.id)
        if not token:
            return {"error": "Authentication token not found"}

        if command.action == "end_sleep":
            # Find and end active sleep session
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/sleep/end/{child.id}",
                    headers={"Authorization": f"Bearer {token}"}
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
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "childId": child.id,
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

    async def _execute_diaper(self, command: DiaperCommand, user_context: UserContext) -> Dict:
        """Execute diaper command"""
        child = await self.user_service.get_child_by_name(user_context.user.id, command.child_name)
        if not child:
            available_children = await self.user_service.get_child_names_for_prompts(user_context.user.id)
            return {"error": f"Child '{command.child_name}' not found. Available children: {available_children}"}

        token = self.user_service.get_user_token(user_context.user.id)
        if not token:
            return {"error": "Authentication token not found"}

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
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "childId": child.id,
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

    async def _execute_health(self, command: HealthCommand, user_context: UserContext) -> Dict:
        """Execute health command"""
        child = await self.user_service.get_child_by_name(user_context.user.id, command.child_name)
        if not child:
            available_children = await self.user_service.get_child_names_for_prompts(user_context.user.id)
            return {"error": f"Child '{command.child_name}' not found. Available children: {available_children}"}

        token = self.user_service.get_user_token(user_context.user.id)
        if not token:
            return {"error": "Authentication token not found"}

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
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "childId": child.id,
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

    async def _execute_query(self, command: QueryCommand, user_context: UserContext) -> Dict:
        """Execute query command"""
        token = self.user_service.get_user_token(user_context.user.id)
        if not token:
            return {"error": "Authentication token not found"}

        child_id = None
        if command.child_name:
            child = await self.user_service.get_child_by_name(user_context.user.id, command.child_name)
            if not child:
                available_children = await self.user_service.get_child_names_for_prompts(user_context.user.id)
                return {"error": f"Child '{command.child_name}' not found. Available children: {available_children}"}
            child_id = child.id

        if command.query_type == "last_feeding":
            if not child_id:
                available_children = await self.user_service.get_child_names_for_prompts(user_context.user.id)
                return {"response": f"Please specify which child. Available children: {available_children}"}

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/feeding/last/{child_id}",
                    headers={"Authorization": f"Bearer {token}"}
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
            "response": f"Query received: {command.query_type} for {command.child_name or 'all children'}",
            "command": command.dict()
        }