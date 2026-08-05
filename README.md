# Cart My Recipe

Turn any online recipe into an Instacart cart in one click.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fbnbcmkopjplpopnjmohjfnphlaaldph?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/cart-my-recipe/fbnbcmkopjplpopnjmohjfnphlaaldph)

![Cart My Recipe demo](docs/demo.gif)

## How it works

1. Open a recipe page in Chrome.
2. Click the Cart My Recipe icon.
3. It reads the ingredients and opens a ready-to-shop Instacart cart.

Recipes you've ordered are saved in the side panel, so you can reorder them anytime.

## Under the hood

When you click the extension, it reads the recipe page's HTML and sends it to a
small API. The API pulls out the ingredient list, uses an LLM to turn each raw
line into a clean, shoppable item, and asks Instacart to build a cart. The cart
link then opens in a new tab.

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
