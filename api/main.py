from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from recipe_scrapers import scrape_html
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from os.path import join
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


class RawIngredients(BaseModel):
    ingredients: List[str]


class InstacartShoppingList(BaseModel):
    title: str
    ingredients: List[LineItem]
    image_url: Optional[str] = None


@app.post("/parse-recipe")
async def parse_recipe(request: RecipeRequest):
    try:
        scraper = scrape_html(html=request.html, org_url=request.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing recipe: {str(e)}")

    if not scraper.ingredients():
        raise HTTPException(status_code=400, detail="No ingredients found.")

    return {
        "title": scraper.title(),
        "canonical_url": scraper.canonical_url(),
        "ingredients": scraper.ingredients(),
        "image_url": scraper.image(),
    }


@app.post("/instacart-ingredients")
async def instacart_ingredients(request: RawIngredients):
    if not request.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    try:
        with open(join("data", "instacart_ingredients_llm_prompt.txt"), "r") as f:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/instacart-shopping-list")
async def instacart_shopping_list(request: InstacartShoppingList):
    if not request.title:
        raise HTTPException(status_code=400, detail="No title provided.")

    if not request.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    request = request.model_dump(exclude_none=True)

    payload = {
        "title": request["title"],
        "line_items": request["ingredients"],
        "image_url": request["image_url"],
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {instacart_api_key}",
    }

    try:
        response = requests.post(
            f"{instacart_server}/idp/v1/products/products_link",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))
