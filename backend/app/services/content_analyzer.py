import os
import json
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from app.core.config import settings

# Mock top posts dataset (could be moved to DB later)
TOP_LINKEDIN_POSTS = [
    {
        "content": "I built a startup to $1M ARR in 12 months. Here are the 5 brutal truths nobody tells you about bootstrapping...",
        "likes": 12500,
        "reason": "Strong hook, clear numbers, lists, relatable struggles."
    },
    {
        "content": "Stop overcomplicating your sales process. 1. Find a painful problem. 2. Build a simple solution. 3. Talk to 100 people who have that problem. That's it. That's the secret.",
        "likes": 8900,
        "reason": "Actionable, contrarian simplicity, easy to read."
    },
    {
        "content": "I failed 4 times before my first successful exit. The biggest lesson? Resilience isn't about not falling, it's about how fast you get back up.",
        "likes": 15200,
        "reason": "Vulnerable story, clear takeaway, emotional resonance."
    }
]

class ContentAnalysisRequest(BaseModel):
    content: str
    persona_context: str | None = None

class ContentAnalysisResponse(BaseModel):
    score: int
    verdict: str
    suggestions: list[str]
    hooks: list[str] = []

SYSTEM_PROMPT = (
    "You are an expert LinkedIn Content Strategist. Your job is to analyze draft LinkedIn posts "
    "and provide:\n"
    "1. An overall quality score (0-100)\n"
    "2. A verdict (e.g., 'Excellent', 'Good', 'Needs Work', 'Poor')\n"
    "3. 3-5 specific, actionable suggestions for improvement\n"
    "4. 3 alternative, high-converting opening hook ideas (catchy 1-2 sentence intros) tailored specifically for this draft.\n\n"
    "{persona_instructions}"
    "Use the following examples of highly successful LinkedIn posts as a baseline for what works "
    "(strong hooks, clear value, storytelling, readability):\n{top_posts}\n\n{format_instructions}"
)

USER_PROMPT = "Analyze this draft:\n\n{draft_content}"

def analyze_linkedin_content(request: ContentAnalysisRequest) -> ContentAnalysisResponse:
    # Check for OpenRouter / OpenAI API key
    api_key = os.environ.get("OPENROUTER_API_KEY") or getattr(settings, "OPENROUTER_API_KEY", "") or os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("OPENROUTER_BASE_URL") or getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    model_name = os.environ.get("CONTENT_STRATEGIST_MODEL") or getattr(settings, "CONTENT_STRATEGIST_MODEL", "openai/gpt-3.5-turbo")

    if not api_key:
        # Fallback/Mock mode if no API key is provided
        score = 50
        suggestions = ["Add an OPENROUTER_API_KEY to your .env to enable real AI scoring via OpenRouter!"]
        
        if request.persona_context:
            suggestions.append(f"Noted Persona Context: {request.persona_context[:50]}...")

        words = len(request.content.split())
        if words < 10:
            suggestions.append("Your post is very short. Try adding more detail or a story.")
            score = 30
        elif "\n" not in request.content:
            suggestions.append("Add line breaks to make your post easier to read.")
            score = 40
        else:
            score = 75
            suggestions.append("Good length and spacing. Consider starting with a stronger hook.")
            
        verdict = "Needs Work" if score < 60 else "Good"
        
        return ContentAnalysisResponse(
            score=score,
            verdict=verdict,
            suggestions=suggestions,
            hooks=[
                "Most people get this completely wrong. Here's why:",
                "The $3.9B industry secret nobody in banking wants to discuss:",
                "3 brutal truths about build vs buy that took me 5 years to learn:"
            ]
        )
    
    # Initialize ChatOpenAI pointing to OpenRouter API endpoint
    llm = ChatOpenAI(
        api_key=api_key,
        base_url=base_url,
        model=model_name,
        temperature=0.7,
        default_headers={
            "HTTP-Referer": getattr(settings, "FRONTEND_URL", "http://localhost:3000"),
            "X-Title": getattr(settings, "APP_NAME", "Growpido CRM"),
        }
    )
    
    # Set up the Pydantic parser
    parser = PydanticOutputParser(pydantic_object=ContentAnalysisResponse)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user", USER_PROMPT)
    ])
    
    chain = prompt | llm | parser
    
    persona_instructions = ""
    if request.persona_context and request.persona_context.strip():
        persona_instructions = (
            f"IMPORTANT: The user has provided the following specific PERSONA/SKILL context for this post:\n"
            f"'''\n{request.persona_context}\n'''\n"
            f"You MUST adopt this persona, mimic their style, and tailor all your suggestions and hooks to match this context.\n\n"
        )

    try:
        response = chain.invoke({
            "top_posts": json.dumps(TOP_LINKEDIN_POSTS, indent=2),
            "format_instructions": parser.get_format_instructions(),
            "draft_content": request.content,
            "persona_instructions": persona_instructions
        })
        return response
    except Exception as e:
        return ContentAnalysisResponse(
            score=0,
            verdict="Error",
            suggestions=[f"An error occurred while analyzing the content via OpenRouter: {str(e)}"],
            hooks=[]
        )


