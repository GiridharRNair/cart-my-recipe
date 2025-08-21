
Chrome extension that lets you order ingredients from online recipes directly through Instacart.

🎥 [Demo Video](https://www.youtube.com/watch?v=CmE-I-yH8jo)

https://chromewebstore.google.com/detail/cart-my-recipe/fbnbcmkopjplpopnjmohjfnphlaaldph?authuser=0&hl=en

## Quick Start

### Prerequisites

* Node.js
* Python

### Setup

```bash
# Clone the repo
git clone GiridharRNair/cart-my-recipe
cd cart-my-recipe

# Python setup
python -m venv venv
source venv/bin/activate

# Install dependencies
npm install   # installs for API + extension
```

### Development

```bash
# Start extension dev server
npm run dev

# Start API server
npm run api
```

* Open Chrome → `chrome://extensions/`
* Enable **Developer Mode**
* Load unpacked extension from the `dist` folder

### Build for Production

```bash
npm run build
```

## Project Structure

- `src/popup/` - Extension popup UI
- `src/content/` - Content scripts
- `manifest.config.ts` - Chrome extension manifest configuration

## Documentation

- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Documentation](https://crxjs.dev/vite-plugin)

## Chrome Extension Development Notes

- Use `manifest.config.ts` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Content scripts should be placed in `src/content/`
- Popup UI should be placed in `src/popup/`

## Acknowledgements

- [Python Recipe Scraper Package](https://github.com/hhursev/recipe-scrapers)
- [Ben Awad’s Recipe Scraping Article](https://www.benawad.com/scraping-recipe-websites/)
- [CRXJS](https://crxjs.dev/)
