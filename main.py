from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from recipe_scrapers import scrape_html
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI()

origins = [
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
    "http://localhost",
    "http://localhost:8080",
]

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

    with open("llm_prompt.txt", "r") as f:
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
