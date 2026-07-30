import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Annotated, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from recipe_scrapers import scrape_html
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

logger = logging.getLogger("cart-my-recipe")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-2024-08-06")
instacart_server = os.getenv("INSTACART_SERVER")
instacart_api_key = os.getenv("INSTACART_API_KEY")
instacart_partner_url = os.getenv("INSTACART_PARTNER_URL")

# Comma-separated allowlist of browser origins, or "*" for any (default).
allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

# Prompt lives next to the repo root regardless of the process working directory
# (important on Vercel, where the CWD is not guaranteed).
PROMPT_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "instacart_ingredients_llm_prompt.txt"
)


@lru_cache(maxsize=1)
def get_system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


# Outbound HTTP timeout (seconds) so a slow Instacart call can't hang the worker.
INSTACART_TIMEOUT = float(os.getenv("INSTACART_TIMEOUT", "15"))

# Per-endpoint rate limits (env-overridable). On serverless (Vercel) the default
# in-memory store is per-instance/best-effort; set RATE_LIMIT_STORAGE_URI to a
# shared store (e.g. Upstash Redis: redis://...) for durable, distributed limits.
PARSE_LIMIT = os.getenv("RATE_LIMIT_PARSE", "20/minute")
INGREDIENTS_LIMIT = os.getenv("RATE_LIMIT_INGREDIENTS", "20/minute")
SHOPPING_LIST_LIMIT = os.getenv("RATE_LIMIT_SHOPPING_LIST", "20/minute")


def get_client_ip(request: Request) -> str:
    """Real client IP, honoring Vercel's proxy X-Forwarded-For header."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=get_client_ip,
    storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI", "memory://"),
    headers_enabled=True,
)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
@limiter.limit(PARSE_LIMIT)
async def parse_recipe(request: Request, payload: RecipeRequest):
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
@limiter.limit(INGREDIENTS_LIMIT)
async def instacart_ingredients(request: Request, payload: RawIngredients):
    if not payload.ingredients:
        raise HTTPException(status_code=400, detail="No ingredients provided.")

    try:
        response = client.responses.parse(
            model=openai_model,
            temperature=0,
            input=[
                {"role": "system", "content": get_system_prompt()},
                {"role": "user", "content": f"Input:\n{payload.ingredients}"},
            ],
            text_format=InstacartIngredients,
        )
        return response.output_parsed
    except Exception:
        logger.exception("Ingredient conversion failed")
        raise HTTPException(status_code=502, detail="Failed to process ingredients.")


@app.post("/instacart-shopping-list")
@limiter.limit(SHOPPING_LIST_LIMIT)
async def instacart_shopping_list(request: Request, payload: InstacartShoppingList):
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
