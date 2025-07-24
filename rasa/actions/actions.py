from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import requests
import json

class ActionCreateTask(Action):
    def name(self) -> Text:
        return "action_create_task"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        task_name = tracker.get_slot("task_name")
        
        if task_name:
            # Call the orchestrator API to create task
            try:
                response = requests.post(
                    "http://localhost:3000/api/orchestrator/tasks",
                    json={"name": task_name, "status": "pending"}
                )
                if response.ok:
                    dispatcher.utter_message(text=f"✅ Task '{task_name}' has been created!")
                else:
                    dispatcher.utter_message(text=f"Sorry, I couldn't create the task. Please try again.")
            except:
                dispatcher.utter_message(text="I'm having trouble connecting to the task service.")
        else:
            dispatcher.utter_message(text="What task would you like me to create?")
        
        return []

class ActionListTasks(Action):
    def name(self) -> Text:
        return "action_list_tasks"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        try:
            response = requests.get("http://localhost:3000/api/orchestrator/tasks")
            if response.ok:
                tasks = response.json()
                if tasks:
                    task_list = "📋 Your current tasks:\n"
                    for task in tasks:
                        status = "✅" if task.get("completed") else "⏳"
                        task_list += f"{status} {task.get('name')}\n"
                    dispatcher.utter_message(text=task_list)
                else:
                    dispatcher.utter_message(text="You don't have any tasks yet. Would you like to create one?")
        except:
            dispatcher.utter_message(text="I couldn't retrieve your tasks right now.")
        
        return []

class ActionBrowseWebsite(Action):
    def name(self) -> Text:
        return "action_browse_website"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        website_url = tracker.get_slot("website_url")
        
        if website_url:
            # Ensure URL has protocol
            if not website_url.startswith(('http://', 'https://')):
                website_url = 'https://' + website_url
            
            try:
                response = requests.post(
                    "http://localhost:3000/api/browser-agent/navigate",
                    json={"url": website_url}
                )
                if response.ok:
                    dispatcher.utter_message(text=f"🌐 I've opened {website_url} for you. You can see it in the browser panel.")
                else:
                    dispatcher.utter_message(text="I had trouble opening that website.")
            except:
                dispatcher.utter_message(text="The browser service isn't available right now.")
        else:
            dispatcher.utter_message(text="Which website would you like me to browse?")
        
        return []

class ActionToggleConversationMode(Action):
    def name(self) -> Text:
        return "action_toggle_conversation_mode"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        current_mode = tracker.get_slot("conversation_mode")
        new_mode = not current_mode
        
        return [SlotSet("conversation_mode", new_mode)]

class ActionToggleAutoSpeak(Action):
    def name(self) -> Text:
        return "action_toggle_auto_speak"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        current_setting = tracker.get_slot("auto_speak")
        new_setting = not current_setting
        
        return [SlotSet("auto_speak", new_setting)]

class ActionChangeVoice(Action):
    def name(self) -> Text:
        return "action_change_voice"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        voice_name = tracker.get_slot("voice_name")
        
        if voice_name:
            dispatcher.utter_message(text=f"I've switched to the {voice_name} voice.")
            return [SlotSet("current_voice", voice_name)]
        else:
            dispatcher.utter_message(text="Which voice would you like me to use? Available: rachel, josh, bella, adam, sam")
        
        return []

class ActionAIResponse(Action):
    """General AI response action that uses the LLM backend"""
    
    def name(self) -> Text:
        return "action_ai_response"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get the last user message
        user_message = tracker.latest_message.get('text')
        
        try:
            # Call the AI API
            response = requests.post(
                "http://localhost:3000/api/ai/chat",
                json={
                    "prompt": user_message,
                    "model": "auto",
                    "task_type": "general",
                    "complexity": "medium",
                    "quality": "standard"
                }
            )
            
            if response.ok:
                data = response.json()
                ai_response = data.get('result', 'I apologize, but I couldn\'t generate a response.')
                dispatcher.utter_message(text=ai_response)
            else:
                dispatcher.utter_message(text="I'm having trouble thinking right now. Please try again.")
        except Exception as e:
            dispatcher.utter_message(text="I'm experiencing some technical difficulties. Please try again later.")
        
        return []

class ActionGenerateImage(Action):
    def name(self) -> Text:
        return "action_generate_image"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Extract image description from user message
        user_message = tracker.latest_message.get('text')
        # Remove common prefixes
        prompt = user_message.lower().replace('generate an image of', '').replace('create a picture of', '').replace('make an image showing', '').strip()
        
        try:
            response = requests.post(
                "http://localhost:3000/api/ai/chat",
                json={
                    "prompt": prompt,
                    "task_type": "image",
                    "complexity": "medium",
                    "quality": "standard"
                }
            )
            
            if response.ok:
                data = response.json()
                result = data.get('result', '')
                dispatcher.utter_message(text=f"🎨 Here's your image:\n\n{result}")
            else:
                dispatcher.utter_message(text="I couldn't generate the image right now.")
        except:
            dispatcher.utter_message(text="The image generation service is unavailable.")
        
        return []

class ActionAnalyzeDocument(Action):
    def name(self) -> Text:
        return "action_analyze_document"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        dispatcher.utter_message(text="📄 Please upload your document using the paperclip button, and I'll analyze it for you.")
        
        return []

class ActionBuildApp(Action):
    def name(self) -> Text:
        return "action_build_app"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        app_type = tracker.get_slot("app_type")
        
        if app_type:
            dispatcher.utter_message(text=f"🚀 I'll help you build a {app_type} app! Let me open DeepAgent for you...")
            # In a real implementation, this would trigger the DeepAgent interface
        else:
            dispatcher.utter_message(text="What type of app would you like to build? (e.g., react, python, web, mobile)")
        
        return []