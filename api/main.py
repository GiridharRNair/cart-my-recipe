import logging
import os
from typing import Annotated, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from prompt import SYSTEM_PROMPT
from pydantic import BaseModel, Field
from recipe_scrapers import scrape_html

load_dotenv()

logger = logging.getLogger("cart-my-recipe")


def _optional_float(name: str) -> Optional[float]:
    """Parse an optional numeric env var, returning None when unset/blank."""
    raw = os.getenv(name)
    if not raw or not raw.strip():
        return None
    try:
        return float(raw)
    except ValueError:
        logger.warning("Ignoring invalid %s=%r (must be a number)", name, raw)
        return None


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-2024-08-06")
# Some models (e.g. reasoning models) reject a non-default temperature, so it is
# only sent when OPENAI_TEMPERATURE is explicitly set.
openai_temperature = _optional_float("OPENAI_TEMPERATURE")
instacart_server = os.getenv("INSTACART_SERVER")
instacart_api_key = os.getenv("INSTACART_API_KEY")
instacart_partner_url = os.getenv("INSTACART_PARTNER_URL")

# Comma-separated allowlist of browser origins, or "*" for any (default).
allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

# Outbound HTTP timeout (seconds) so a slow Instacart call can't hang the worker.
INSTACART_TIMEOUT = float(os.getenv("INSTACART_TIMEOUT", "15"))

# NOTE: Rate limiting is enforced at the edge by Vercel Firewall rules
# (configured in the Vercel dashboard), not in application code.

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # No cookies/auth are used; "*" origins with credentials is invalid + unsafe.
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


IngredientStr = Annotated[str, Field(max_length=500)]


class RecipeRequest(BaseModel):
    html: str = Field(max_length=5_000_000)
    url: str = Field(max_length=2048)


class LineItemMeasurement(BaseModel):
    quantity: Optional[float] = Field(default=1.0)
    unit: Optional[str] = Field(default="each", max_length=100)


class Filters(BaseModel):
    brand_filters: Optional[List[str]] = None
    health_filters: Optional[List[str]] = None


class LineItem(BaseModel):
    name: str = Field(max_length=500)
    quantity: Optional[float] = Field(default=1.0)
    unit: Optional[str] = Field(default="each", max_length=100)
    display_text: Optional[str] = Field(default=None, max_length=500)
    upcs: Optional[List[str]] = None
    line_item_measurements: Optional[List[LineItemMeasurement]] = None
    filters: Optional[Filters] = None


class InstacartIngredients(BaseModel):
    ingredients: List[LineItem]


class RawIngredients(BaseModel):
    ingredients: Annotated[List[IngredientStr], Field(max_length=300)]


class InstacartShoppingList(BaseModel):
    title: str = Field(max_length=500)
    ingredients: Annotated[List[LineItem], Field(max_length=300)]
    image_url: Optional[str] = Field(default=None, max_length=2048)


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


@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse-recipe")
async def parse_recipe(payload: RecipeRequest):
    try:
        scraper = _get_scraper(payload.html, payload.url)
    except Exception:
        logger.exception("Recipe parsing failed")
        raise HTTPException(status_code=422, detail="Could not parse this recipe.")

    ingredients = _extract_ingredients(scraper)
    if not ingredients:
        raise HTTPException(status_code=404, detail="No ingredients found.")

    return {
        "title": _safe(scraper.title, default=""),
        "canonical_url": _safe(scraper.canonical_url, default=payload.url),
        "ingredients": ingredients,
        "image_url": _safe(scraper.image, default=""),
    }


@app.post("/instacart-ingredients")
async def instacart_ingredients(payload: RawIngredients):
    if not payload.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    try:
        extra = {}
        if openai_temperature is not None:
            extra["temperature"] = openai_temperature

        response = client.responses.parse(
            model=openai_model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Input:\n{payload.ingredients}"},
            ],
            text_format=InstacartIngredients,
            **extra,
        )
        return response.output_parsed
    except Exception:
        logger.exception("Ingredient conversion failed")
        raise HTTPException(status_code=502, detail="Failed to process ingredients.")


@app.post("/instacart-shopping-list")
async def instacart_shopping_list(payload: InstacartShoppingList):
    if not payload.title:
        raise HTTPException(status_code=400, detail="No title provided.")

    if not payload.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    data = payload.model_dump(exclude_none=True)

    body = {
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
            json=body,
            headers=headers,
            timeout=INSTACART_TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()
    except requests.RequestException:
        logger.exception("Instacart shopping list creation failed")
        raise HTTPException(status_code=502, detail="Failed to create shopping list.")

    link = result.get("products_link_url")
    if link and instacart_partner_url:
        result["products_link_url"] = link + instacart_partner_url
    return result
