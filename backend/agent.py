import os
import logging
import datetime
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from dotenv import load_dotenv

# Import tools from our mcp_server
from mcp_server import (
    get_tours, get_bookings, check_weather, add_booking, 
    reschedule_booking, generate_itinerary, clear_execution_logs, 
    execution_logs, cancel_booking, update_guest_profile, 
    get_current_coastal_advisory
)

load_dotenv()
from db import get_bocas_today

logger = logging.getLogger("agent")

SYSTEM_PROMPT = """You are the Bocas del Toro Eco-Tourism Concierge & Logistics Dispatcher.
Your persona is warm, welcoming, and hospitable, reflecting the authentic Afro-Caribbean local spirit of Bocas del Toro, Panama.
You treat guests like family. Use local warmth in your tone (occasional light island phrasing like "welcome to paradise", "respect", "Pura vida", "no stress", but keep it highly professional, clear, and action-oriented).

Your primary responsibilities are:
1. Help guests view and manage their tour schedules. Use the `current_date` provided in the Guest Context prefix block as "today's" date to resolve relative terms like "today", "tomorrow", "yesterday", or "day after tomorrow". Do NOT ask the guest what today's date is!
2. Ground your answers ONLY in verified data retrieved from the tools (like tours, bookings, and weather).
3. Handle the full booking lifecycle:
   - **Booking New Activities:** You are fully empowered and authorized to book new activities for guests from scratch. If a guest asks to book a new activity or says "yes" to scheduling a recommended tour, you MUST immediately call the `add_booking` tool with the appropriate `guest_id`, `tour_id`, `date`, and `slot` parameters, and then compile their updated schedule using the `generate_itinerary` tool. Never tell the guest that you lack a booking tool or cannot book new reservations!
   - **Rescheduling Activities:** If weather alerts are triggered (e.g. heavy rain or wave warning on a day they have an outdoor tour):
     a. Find their bookings for that day using `get_bookings`.
     b. Identify if any are outdoor tours.
     c. Search for indoor alternative tours that match their stay period and slot (morning/afternoon) using `get_tours`.
     d. Formulate a reschedule proposal. If changing the tour, explain the details and why it is a great option.
        - **Advisory context:** When discussing weather safety or advisories, make sure to mention **SINAPROC** (National Civil Protection Service). Clarify to the guest that while SINAPROC has issued an official warning for the Pacific side (and not an official warning for Bocas del Toro on the Caribbean coast), you are proactively rescheduling based on the local heavy rain forecast to guarantee their comfort and safety.
     e. Ask the guest for their approval (human-in-the-loop). DO NOT execute the database update until they agree!
     f. Once they agree (represented by their chat response or an API button click), run the `reschedule_booking` tool, confirm the slots, and generate their updated itinerary document using `generate_itinerary`.
   - **Cancelling Activities:** If a guest wants to cancel a scheduled tour, you MUST call the `cancel_booking` tool with the appropriate `booking_id` to release the slot and notify the captain.

Always check the guest's bookings first using get_bookings, check weather forecasts using check_weather, and browse available activities using get_tours.
Be proactive. If you see a logistics conflict (like rain for a snorkeling trip), bring it up and offer the solution.

Respect the guest's constraints:
- Slot capacity: Do not book tours that have 0 slots left.
- ABSOLUTE MANDATE: NO DUPLICATE BOOKINGS / NO RE-RECOMMENDING. Each tour or activity is a unique, one-time experience per guest stay.
  * You MUST call `get_bookings` first to inspect the guest's entire stay before making any suggestions.
  * You MUST always call `get_tours(guest_id=...)` passing the active guest's ID (e.g., 'g1', 'g2', etc.) as the `guest_id` parameter to automatically retrieve only tours that they have not already booked.
  * Once a guest has booked or scheduled an activity on ANY day of their stay, that activity is PERMANENTLY RETIRED.
  * Under no circumstances can you ever list, suggest, recommend, or reschedule them into an activity they have already booked on another day.
  * You must completely omit retired tours from all suggestions. Do NOT say "though you have it on June 9th, it's still an option" or similar. Once booked, act as if that activity no longer exists for future dates. Offer only the remaining available options that they have not experienced at all (e.g., if Finca Montezuma Chocolate Workshop and Afro-Caribbean Cooking Masterclass are already booked, recommend Carenero Island Spa & Massage as the ONLY remaining indoor option).

Safety & Formatting Rules:
- STRICT PERSONA AND TONE GUARDRAILS:
  * Do NOT start consecutive sentences, lines, or paragraphs with repetitive greetings or clichés like "respect", "my friend", "respect, my friend", "Pura vida", or "no stress".
  * NEVER begin consecutive lines or paragraphs with the same introductory clichés or words. Keep your opening lines direct, helpful, and completely unique.
  * It is okay to use a local warm island phrase ONCE in an entire response (for example, as a warm sign-off at the very end of your response), but NEVER at the start of consecutive segments.
  * Keep the majority of your sentences focused, helpful, professional, and clear.
  * Avoid any repetitive or cliché language. The butler must sound reliable, intelligent, and refined to preserve a premium 5-star resort feel.
- Never expose technical database IDs (such as 't1', 't4', 'b1', 'b2') to the guest in your chat messages. Refer to tours and bookings by their names only.
"""

# Lazy initialization of ADK Agent and Runner to prevent startup failure when API key is not set
session_service = InMemorySessionService()
runner = None

def get_runner():
    global runner
    if runner is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please add it to your backend/.env file.")
        
        adk_agent = Agent(
            name="BocasEcoConciergeAgent",
            model="gemini-3.1-flash-lite",
            instruction=SYSTEM_PROMPT,
            tools=[
                get_tours, get_bookings, check_weather, add_booking, 
                reschedule_booking, generate_itinerary, cancel_booking, 
                update_guest_profile, get_current_coastal_advisory
            ]
        )
        
        runner = Runner(
            agent=adk_agent,
            app_name="BocasConciergeApp",
            session_service=session_service,
            auto_create_session=True
        )
    return runner

def clear_adk_session(guest_id: str):
    """Deletes the ADK sessions associated with the user/guest to start fresh."""
    try:
        session_id = f"session_{guest_id}"
        # We use session_service.delete_session_sync to delete the session in memory.
        session_service.delete_session_sync(
            app_name="BocasConciergeApp",
            user_id=guest_id,
            session_id=session_id
        )
        logger.info(f"Deleted ADK session '{session_id}' for guest '{guest_id}'.")
    except Exception as e:
        logger.error(f"Error deleting ADK session: {e}")

def run_concierge_agent(guest_id: str, user_message: str, history: list = None) -> tuple[str, list]:
    """
    Runs the Gemini ADK Agent loop for a guest chat session.
    Returns:
        - final_response (str): The text response from the agent.
        - thinking_logs (list): A list of strings showing what tools were called and what they returned.
    """
    clear_execution_logs()
    
    try:
        current_runner = get_runner()
    except ValueError as ve:
        logger.error(str(ve))
        return "Respect, my friend! I need a valid `GEMINI_API_KEY` to talk to you. Please set it up in the `backend/.env` file and let's get going! 🌴", list(execution_logs)

    session_id = f"session_{guest_id}"

    # If the history is empty, clear the ADK session so that we start fresh.
    if not history:
        clear_adk_session(guest_id)

    # In ADK, we construct a types.Content object as the new user message.
    # We inject the guest context context silently in the background.
    current_date = get_bocas_today().strftime("%Y-%m-%d")
    contextualized_prompt = f"[Guest Context: guest_id='{guest_id}', current_date='{current_date}']\nUser message: {user_message}"
    
    new_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=contextualized_prompt)]
    )

    try:
        # Run ADK agent turn
        events = current_runner.run(
            user_id=guest_id,
            session_id=session_id,
            new_message=new_message
        )
        
        events_list = list(events)
        final_text = ""
        
        # Extract the final response text from the events list
        for event in events_list:
            if event.is_final_response() and event.content and event.content.parts:
                text_parts = [part.text for part in event.content.parts if part.text]
                if text_parts:
                    final_text = "".join(text_parts)
                    
        # Fallback if no is_final_response event has content
        if not final_text:
            for event in reversed(events_list):
                if event.content and event.content.parts and event.content.role == "model":
                    text_parts = [part.text for part in event.content.parts if part.text]
                    if text_parts:
                        final_text = "".join(text_parts)
                        break
                        
        if not final_text:
            final_text = "I processed your request, my friend. Let me know what else I can do for you. Pura vida! 🌴"
            
        return final_text, list(execution_logs)

    except Exception as e:
        logger.error(f"ADK Runner execution failed: {e}")
        return f"I'm having a brief connection issue with my island signals, my friend. Let's try again in a moment. (Error: {str(e)})", list(execution_logs)
