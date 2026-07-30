Chrome extension that lets you order ingredients from online recipes directly through Instacart.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fbnbcmkopjplpopnjmohjfnphlaaldph?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/cart-my-recipe/fbnbcmkopjplpopnjmohjfnphlaaldph)

## Quick Start

### Prerequisites

- Node.js
- Python

### Setup

```bash
# Clone the repo
git clone GiridharRNair/cart-my-recipe
cd cart-my-recipe

# Python virtual environment
python -m venv venv
source venv/bin/activate

# Install the extension (Node) dependencies
npm install

# Install the backend (Python) dependencies
npm run install-python-dependencies
```

Copy `.env.example` to `.env` and fill in your `OPENAI_API_KEY` and Instacart credentials.

### Development

```bash
# Start extension dev server (Plasmo)
npm run dev

# Start API server
npm run api
```

- Open Chrome → `chrome://extensions/`
- Enable **Developer Mode**
- Load unpacked extension from `build/chrome-mv3-dev`

### Build for Production

```bash
# Bundle the extension into build/chrome-mv3-prod
npm run build

# Zip it for the Chrome Web Store (build/chrome-mv3-prod.zip)
npm run package
```

### Formatting & Linting

```bash
npm run format       # Prettier over the extension source
npm run format-api   # Ruff formatter over the backend
npm run lint-api     # Ruff lint over the backend
```

### Publishing to the Chrome Web Store

Publishing is automated with Plasmo's [BPP](https://github.com/PlasmoHQ/bpp) GitHub
Action (`.github/workflows/submit.yml`). It runs on `workflow_dispatch` or when a
GitHub Release is published. Add these repository secrets:

- `SUBMIT_KEYS` — BPP keys JSON (Chrome Web Store `clientId` / `clientSecret` /
  `refreshToken` and `extId`). See the [BPP docs](https://docs.plasmo.com/framework/workflows/submit).
- `PLASMO_PUBLIC_BACKEND_API_URL` — production backend URL baked into the build.

## License

Released under the [MIT License](LICENSE).

## Acknowledgements

- [Python Recipe Scraper Package](https://github.com/hhursev/recipe-scrapers)
- [Ben Awad’s Recipe Scraping Article](https://www.benawad.com/scraping-recipe-websites/)
- [Plasmo](https://www.plasmo.com/)
