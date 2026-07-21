import os
import json
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

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

class ContentAnalysisResponse(BaseModel):
    score: int
    verdict: str
    suggestions: list[str]

def analyze_linkedin_content(draft_content: str) -> ContentAnalysisResponse:
    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        # Fallback/Mock mode if no API key is provided
        score = 50
        suggestions = ["Add an OPENAI_API_KEY to your .env to enable real AI scoring!"]
        
        words = len(draft_content.split())
        if words < 10:
            suggestions.append("Your post is very short. Try adding more detail or a story.")
            score = 30
        elif "\n" not in draft_content:
            suggestions.append("Add line breaks to make your post easier to read.")
            score = 40
        else:
            score = 75
            suggestions.append("Good length and spacing. Consider starting with a stronger hook.")
            
        verdict = "Needs Work" if score < 60 else "Good"
        
        return ContentAnalysisResponse(
            score=score,
            verdict=verdict,
            suggestions=suggestions
        )
    
    llm = ChatOpenAI(api_key=api_key, model="gpt-3.5-turbo", temperature=0.7)
    
    # Set up the Pydantic parser
    parser = PydanticOutputParser(pydantic_object=ContentAnalysisResponse)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert LinkedIn Content Strategist. Your job is to analyze draft LinkedIn posts and provide a score (0-100), a verdict (e.g., 'Excellent', 'Good', 'Needs Work', 'Poor'), and 3-5 specific, actionable suggestions for improvement.\n\nUse the following examples of highly successful LinkedIn posts as a baseline for what works (strong hooks, clear value, storytelling, readability):\n{top_posts}\n\n{format_instructions}"),
        ("user", "Analyze this draft:\n\n{draft_content}")
    ])
    
    chain = prompt | llm | parser
    
    try:
        response = chain.invoke({
            "top_posts": json.dumps(TOP_LINKEDIN_POSTS, indent=2),
            "format_instructions": parser.get_format_instructions(),
            "draft_content": draft_content
        })
        return response
    except Exception as e:
        return ContentAnalysisResponse(
            score=0,
            verdict="Error",
            suggestions=[f"An error occurred while analyzing the content: {str(e)}"]
        )


