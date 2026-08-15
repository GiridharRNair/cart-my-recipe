# Cart My Recipe

Turn any online recipe into an Instacart cart in one click.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fbnbcmkopjplpopnjmohjfnphlaaldph?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/cart-my-recipe/fbnbcmkopjplpopnjmohjfnphlaaldph)

![Cart My Recipe demo](docs/demo.gif)

## How it works

1. Open a recipe page in Chrome.
2. Click the Cart My Recipe icon.
3. The extension finds the page's ingredients, normalizes them into Instacart
   line items, and opens a ready-to-shop Instacart shopping list.

Recipes you've ordered are saved in the side panel, so you can reorder them anytime.

## Under the hood

Cart My Recipe is split into a Chrome extension and a small FastAPI backend.
When you click the popup, the extension parses the active tab, sends raw
ingredients to the API, gets back Instacart-ready line items, creates a shopping
list link, opens it in a new tab, and saves the recipe in `chrome.storage.local`
for the side panel.

### Recipe parsing fallbacks

The app tries these parsing fallbacks in order:

1. **`recipe-scrapers` site parser:** the backend parses the page HTML with the
   scraper for known recipe sites.
2. **`recipe-scrapers` wild mode:** if the site parser fails, the backend tries
   wild mode for Schema.org, JSON-LD, Microdata, RDFa, and OpenGraph metadata.
3. **Client JSON-LD:** if the backend cannot parse the page, the extension
   reads `script[type="application/ld+json"]` and looks for a `Recipe` object.
4. **Client HTML heuristics:** as a last resort, the extension scans common
   ingredient selectors and list items that look like ingredient lines.

On the backend path, grouped ingredients are preferred and the flat ingredient
list is used as a fallback. These fallbacks help with unsupported recipe sites,
but they do not bypass paywalls, bot protection, login walls, or inaccessible
page content.

### Ingredient normalization

`/instacart-ingredients` uses OpenAI structured outputs with a Pydantic schema
to turn noisy recipe lines into validated Instacart line items. The prompt asks
the model to remove preparation notes, drop section headers and water, convert
fractions and ranges, combine duplicates, choose grocery-searchable names, use
Instacart-supported units, and only add brand or health filters when required.
UPCs are intentionally not invented.

### Instacart shopping list schema

`/instacart-shopping-list` sends Instacart a `title`, optional `image_url`, and
`line_items`. Each line item includes a required `name` plus optional fields
such as `quantity`, `unit`, `display_text`, `line_item_measurements`, `filters`,
and `upcs`. Successful responses return `products_link_url`; if
`INSTACART_PARTNER_URL` is set, the backend appends that suffix before returning
the URL.

Built with:

- **Extension:** [Plasmo](https://www.plasmo.com/), React, TypeScript, Tailwind CSS, shadcn/ui
- **API:** FastAPI (Python), deployed on Vercel
- **Services:** OpenAI (structured ingredient parsing), [recipe-scrapers](https://github.com/hhursev/recipe-scrapers), and the Instacart Developer Platform

## Quick Start

### Prerequisites

- Node.js
- Python

### Setup

```bash
# Clone the repo
git clone https://github.com/GiridharRNair/cart-my-recipe.git
cd cart-my-recipe

# Python virtual environment
python -m venv venv
source venv/bin/activate

# Install the extension (Node) dependencies
npm install

# Install the backend (Python) dependencies
npm run install-api-dependencies
```

Copy `.env.example` to `.env` and add your `OPENAI_API_KEY` and Instacart credentials.

### Environment variables

Only variables prefixed with `PLASMO_PUBLIC_` are bundled into the browser
extension. Keep backend secrets in unprefixed variables.

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `PLASMO_PUBLIC_BACKEND_API_URL` | Yes | Extension | Base URL for the FastAPI backend. Use `http://localhost:8000` locally and the deployed API URL in production builds. |
| `OPENAI_API_KEY` | Yes | Backend | OpenAI API key used by `/instacart-ingredients`. |
| `OPENAI_MODEL` | No | Backend | Model used for structured ingredient parsing. Defaults to `gpt-4o-2024-08-06`. |
| `OPENAI_TEMPERATURE` | No | Backend | Optional model temperature. Leave blank for model defaults, especially for models that reject custom temperature values. |
| `INSTACART_SERVER` | Yes | Backend | Instacart API base URL. Development keys use `https://connect.dev.instacart.tools`; production keys use `https://connect.instacart.com`. |
| `INSTACART_API_KEY` | Yes | Backend | Instacart Developer Platform key sent as the bearer token to the products link endpoint. |
| `INSTACART_PARTNER_URL` | No | Backend | Optional affiliate or UTM suffix appended to generated Instacart URLs. |
| `INSTACART_TIMEOUT` | No | Backend | Outbound Instacart request timeout in seconds. Defaults to `15`. |
| `ALLOWED_ORIGINS` | No | Backend | Comma-separated CORS allowlist for extension origins, or `*` for local development. |

### Developer credential resources

- [Instacart API keys](https://docs.instacart.com/developer_platform_api/get_started/api-keys):
  create development or production keys in the Instacart Developer Dashboard.
- [Instacart Create shopping list page](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page):
  request and response schema for `POST /idp/v1/products/products_link`.
- [Instacart units of measurement](https://docs.instacart.com/developer_platform_api/api/units_of_measurement):
  valid measurement units for `quantity`, `unit`, and `line_item_measurements`.
- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart):
  create and export an `OPENAI_API_KEY`.
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs):
  background on schema-constrained model responses used by the backend parser.
- [recipe-scrapers documentation](https://docs.recipe-scrapers.com/):
  supported-site behavior and metadata parsing expectations.
- [Vercel environment variables](https://vercel.com/docs/environment-variables):
  configure backend secrets for deployed FastAPI functions.

### Development

```bash
npm run dev   # extension dev server (Plasmo)
npm run api   # backend API server
```

Then load the extension in Chrome:

1. Go to `chrome://extensions/`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select the `build/chrome-mv3-dev` folder

### Build

```bash
npm run build     # bundle to build/chrome-mv3-prod
npm run package   # zip it for the Chrome Web Store
```

### Format & lint

```bash
npm run format       # format the extension code
npm run lint         # lint the extension code
npm run format-api   # format the backend
npm run lint-api     # lint the backend
```

## License

[MIT](LICENSE)
