import os
from os.path import join
from typing import List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from recipe_scrapers import scrape_html

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-2024-08-06")
instacart_server = os.getenv("INSTACART_SERVER")
instacart_api_key = os.getenv("INSTACART_API_KEY")
instacart_partner_url = os.getenv("INSTACART_PARTNER_URL")

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


def _safe(fn, default=None):
    """Call a scraper accessor that may raise on partial/wild-mode pages."""
    try:
        return fn()
    except Exception:
        return default


def _get_scraper(html: str, url: str):
    """
    Parse the page with recipe-scrapers.

    Tries the site-specific scraper first; if the site is unsupported, falls
    back to wild mode, which extracts recipes from schema.org / OpenGraph
    metadata on arbitrary pages. This meaningfully widens the set of sites
    we can recognize ingredients from.
    """
    try:
        return scrape_html(html=html, org_url=url)
    except Exception:
        return scrape_html(html=html, org_url=url, wild_mode=True)


def _extract_ingredients(scraper) -> List[str]:
    """
    Prefer structured ingredient groups (dedupes headers/notes cleanly), and
    fall back to the flat ingredient list.
    """
    groups = _safe(scraper.ingredient_groups, default=[]) or []
    grouped = [item for group in groups for item in (group.ingredients or [])]
    if grouped:
        return grouped
    return _safe(scraper.ingredients, default=[]) or []


@app.post("/parse-recipe")
async def parse_recipe(request: RecipeRequest):
    try:
        scraper = _get_scraper(request.html, request.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing recipe: {str(e)}")

    ingredients = _extract_ingredients(scraper)
    if not ingredients:
        raise HTTPException(status_code=400, detail="No ingredients found.")

    return {
        "title": _safe(scraper.title, default=""),
        "canonical_url": _safe(scraper.canonical_url, default=request.url),
        "ingredients": ingredients,
        "image_url": _safe(scraper.image, default=""),
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
            model=openai_model,
            temperature=0,
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

    data = request.model_dump(exclude_none=True)

    payload = {
        "title": data["title"],
        "line_items": data["ingredients"],
        "image_url": data.get("image_url"),
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
        response = response.json()
        if response["products_link_url"] and instacart_partner_url:
            response["products_link_url"] += instacart_partner_url
        return response
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))
