# Cart My Recipe

Turn any online recipe into an Instacart cart in one click.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fbnbcmkopjplpopnjmohjfnphlaaldph?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/cart-my-recipe/fbnbcmkopjplpopnjmohjfnphlaaldph)

1. Open a recipe page in Chrome.
2. Click the Cart My Recipe icon.
3. The extension finds the page's ingredients, normalizes them into Instacart
   line items, and opens a ready-to-shop Instacart shopping list.

Recipes you've ordered are saved in the side panel, so you can reorder them anytime.

![Cart My Recipe demo](docs/demo.gif)

## Technologies Used 

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
