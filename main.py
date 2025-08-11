import json
from fastapi import FastAPI, Request
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

@app.post("/parse")
async def parse(request: Request):
    body = await request.body()
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON"}
    html = data.get("html")
    url = data.get("url")

    scraper = scrape_html(html, org_url=url)
    return {
        "title": scraper.title(),
        "ingredients": scraper.ingredients(),
        "instructions": scraper.instructions()
    }

@app.post("/valid-recipe")
async def valid_recipe(request: Request):
    pass
