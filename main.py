from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from recipe_scrapers import scrape_html
from fastapi.middleware.cors import CORSMiddleware

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
