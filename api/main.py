from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from recipe_scrapers import scrape_html
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv
import requests

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
instacart_server = os.getenv("INSTACART_SERVER")
instacart_api_key = os.getenv("INSTACART_API_KEY")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecipeRequest(BaseModel):
    html: str
    url: str


class LineItemMeasurement(BaseModel):
    quantity: Optional[float] = Field(default=1.0)
    unit: Optional[str] = Field(default="each")


class Filters(BaseModel):
    brand_filters: Optional[List[str]] = None
    health_filters: Optional[List[str]] = None


class LineItem(BaseModel):
    name: str
    quantity: Optional[float] = Field(default=1.0)
    unit: Optional[str] = Field(default="each")
    display_text: Optional[str] = None
    upcs: Optional[List[str]] = None
    line_item_measurements: Optional[List[LineItemMeasurement]] = None
    filters: Optional[Filters] = None


class InstacartIngredients(BaseModel):
    ingredients: List[LineItem]


class InstacartInstructions(BaseModel):
    instructions: List[str]


class RawIngredients(BaseModel):
    ingredients: List[str]


class RawInstructions(BaseModel):
    instructions: str


class InstacartShoppingList(BaseModel):
    title: str
    instructions: List[str]
    ingredients: List[LineItem]


@app.post("/parse-recipe")
async def parse_recipe(request: RecipeRequest):
    scraper = scrape_html(html=request.html, org_url=request.url)

    if not scraper.ingredients():
        raise HTTPException(status_code=400, detail="No ingredients found.")

    return {
        "title": scraper.title(),
        "ingredients": scraper.ingredients(),
        "instructions": scraper.instructions(),
    }


@app.post("/instacart-ingredients")
async def instacart_ingredients(request: RawIngredients):
    if not request.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    with open("instacart_ingredients_llm_prompt.txt", "r") as f:
        system_prompt = f.read()
    user_prompt = f"Input:\n{request.ingredients}"

    response = client.responses.parse(
        model="gpt-4o-mini-2024-07-18",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=InstacartIngredients,
    )

    return response.output_parsed


@app.post("/instacart-instructions")
async def instacart_instructions(request: RawInstructions):
    if not request.instructions:
        raise HTTPException(status_code=400, detail="No instructions provided.")

    system_prompt = """
    Format these instructions to an array of string values.
    Modify them to be comprehendable and complete. 
    Try to limit guessing.
    """
    user_prompt = f"Input:\n{request.instructions}"

    response = client.responses.parse(
        model="gpt-5-nano-2025-08-07",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=InstacartInstructions,
    )

    return response.output_parsed


@app.post("/instacart-shopping-list")
async def instacart_shopping_list(request: InstacartShoppingList):
    if not request.title:
        raise HTTPException(status_code=400, detail="No title provided.")

    if not request.instructions:
        raise HTTPException(status_code=400, detail="No instructions provided.")

    if not request.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    request = request.model_dump(exclude_none=True)

    payload = {
        "title": request["title"],
        "instructions": request["instructions"],
        "line_items": request["ingredients"],
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {instacart_api_key}",
    }

    response = requests.post(
        f"{instacart_server}/idp/v1/products/products_link",
        json=payload,
        headers=headers,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()
