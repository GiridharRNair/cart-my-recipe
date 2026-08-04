# Cart My Recipe

Turn any online recipe into an Instacart cart in one click.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fbnbcmkopjplpopnjmohjfnphlaaldph?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/cart-my-recipe/fbnbcmkopjplpopnjmohjfnphlaaldph)

![Cart My Recipe demo](docs/demo.gif)

## How it works

1. Open a recipe page in Chrome.
2. Click the Cart My Recipe icon.
3. It reads the ingredients and opens a ready-to-shop Instacart cart.

Recipes you've ordered are saved in the side panel, so you can reorder them anytime.

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

## Publishing

New releases publish to the Chrome Web Store automatically through Plasmo's
[BPP](https://github.com/PlasmoHQ/bpp) action (`.github/workflows/submit.yml`),
which runs when a GitHub Release is published. It needs two repository secrets:

- `SUBMIT_KEYS` — Chrome Web Store API keys ([how to get them](https://docs.plasmo.com/framework/workflows/submit))
- `PLASMO_PUBLIC_BACKEND_API_URL` — the production backend URL

## License

[MIT](LICENSE)

## Acknowledgements

- [recipe-scrapers](https://github.com/hhursev/recipe-scrapers)
- [Ben Awad's recipe scraping article](https://www.benawad.com/scraping-recipe-websites/)
- [Plasmo](https://www.plasmo.com/)
