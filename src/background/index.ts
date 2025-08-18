import axios from "axios";
import { Recipe, InstacartProductLinkUrl, InstacartIngredients } from "@/types";

console.log("Background script running!");

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "PARSE_RECIPE_BACKEND") {
        const tab = await getCurrentTab();
        if (!tab || !tab.id) {
            console.error("No active tab found or tab ID is undefined.");
            sendResponse({ data: null, error: true });
            return;
        }

        const tabId = tab.id;
        const tabUrl = tab.url;

        try {
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: "MAIN",
                func: () => document.documentElement.outerHTML,
            });

            const htmlContent = result.result;
            if (typeof htmlContent !== "string") {
                console.error("HTML content is not a string.");
                sendResponse({ data: null, error: true });
                return;
            }

            const res = await axios.post(`${BACKEND_API_URL}/parse-recipe`, {
                html: htmlContent,
                url: tabUrl,
            });

            const data: Recipe = res.data;

            console.log("Recipe:", data);

            sendResponse({ data: data, error: false });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "Axios error:",
                    err.response?.data || err.message,
                );
            } else {
                console.error("Unexpected error:", err);
            }
            sendResponse({ data: null, error: true });
        }
    }

    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "PARSE_RECIPE_JSONLD") {
        const tab = await getCurrentTab();
        if (!tab?.id) {
            console.error("No active tab found or tab ID is undefined.");
            sendResponse({ data: null, error: true });
            return;
        }

        try {
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: "MAIN",
                func: () => {
                    const scripts = Array.from(
                        document.querySelectorAll<HTMLScriptElement>(
                            'script[type="application/ld+json"]',
                        ),
                    );
                    return scripts
                        .map((s) => {
                            try {
                                return JSON.parse(s.textContent || "null");
                            } catch {
                                return null;
                            }
                        })
                        .filter(Boolean);
                },
            });

            if (!result?.result) {
                console.error("No JSON-LD found.");
                sendResponse({ data: null, error: true });
                return;
            }

            const jsons: any[] = result.result;

            const flattened = jsons.flatMap((obj) =>
                obj["@graph"] ? obj["@graph"] : [obj],
            );

            const recipeObj = flattened.find(
                (obj) =>
                    obj["@type"] === "Recipe" ||
                    (Array.isArray(obj["@type"]) &&
                        obj["@type"].includes("Recipe")),
            );

            if (!recipeObj) {
                console.error("No Recipe found in JSON-LD.");
                sendResponse({ data: null, error: true });
                return;
            }

            if (
                !recipeObj.name ||
                !recipeObj.recipeIngredient ||
                recipeObj.ingredients
            ) {
                console.error("Invalid Recipe object.");
                sendResponse({ data: null, error: true });
                return;
            }

            const recipe: Recipe = {
                title: recipeObj.name,
                canonical_url: recipeObj.mainEntityOfPage || "",
                ingredients:
                    recipeObj.recipeIngredient || recipeObj.ingredients,
                image_url: recipeObj.image[0] || "",
            };

            console.log("Recipe:", recipe);

            sendResponse({ data: recipe, error: false });
        } catch (err) {
            console.error("Error parsing JSON-LD:", err);
            sendResponse({ data: null, error: true });
        }
    }

    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "PARSE_RECIPE_HTML") {
        const tab = await getCurrentTab();
        if (!tab?.id) {
            console.error("No active tab found or tab ID is undefined.");
            sendResponse({ data: null, error: true });
            return;
        }

        try {
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: "MAIN",
                func: () => {
                    // Get OG title
                    const ogTitle =
                        document
                            .querySelector('meta[property="og:title"]')
                            ?.getAttribute("content") ||
                        document
                            .querySelector('meta[name="og:title"]')
                            ?.getAttribute("content") ||
                        document.title;

                    // Get OG image
                    const ogImage =
                        document
                            .querySelector('meta[property="og:image"]')
                            ?.getAttribute("content") ||
                        document
                            .querySelector('meta[name="og:image"]')
                            ?.getAttribute("content");

                    // Get ingredients using common selectors
                    const ingredientSelectors = [
                        '[itemprop="recipeIngredient"]',
                        ".recipe-ingredient",
                        ".ingredient",
                        ".recipe-ingredients li",
                        ".ingredients li",
                        ".recipe-card-ingredient",
                        ".structured-ingredients li",
                        ".ingredient-list li",
                    ];

                    let ingredients: string[] = [];

                    // Try each selector until we find ingredients
                    for (const selector of ingredientSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            ingredients = Array.from(elements)
                                .map((el) => el.textContent.trim())
                                .filter((text) => text.length > 0);
                            break;
                        }
                    }

                    // Fallback: look for lists that might be ingredients
                    if (ingredients.length === 0) {
                        const lists = document.querySelectorAll("ul li, ol li");
                        const potentialIngredients = Array.from(lists)
                            .map((li) => li.textContent.trim())
                            .filter((text) => {
                                // Simple check for ingredient-like text
                                return (
                                    text.length > 3 &&
                                    text.length < 200 &&
                                    (text.match(/\d+/) || // has numbers
                                        text.match(
                                            /\b(cup|tbsp|tsp|oz|lb|gram|ml)\b/i,
                                        ) || // has measurements
                                        text.match(
                                            /\b(salt|pepper|oil|butter|flour|sugar)\b/i,
                                        ))
                                ); // common ingredients
                            });

                        if (potentialIngredients.length >= 3) {
                            ingredients = potentialIngredients.slice(0, 20); // limit to 20 ingredients
                        }
                    }

                    return {
                        title: ogTitle,
                        image: ogImage,
                        ingredients: ingredients,
                        url: window.location.href,
                    };
                },
            });

            const scraped = result.result;

            if (
                !scraped ||
                (!scraped.title && scraped.ingredients.length === 0)
            ) {
                console.error("Could not scrape recipe data.");
                sendResponse({ data: null, error: true });
                return;
            }

            // Format as Recipe object
            const recipe = {
                title: scraped.title || "",
                canonical_url: scraped.url,
                ingredients: scraped.ingredients,
                image_url: scraped.image || "",
            };

            console.log("Recipe:", recipe);

            sendResponse({ data: recipe, error: false });
        } catch (err) {
            console.error("Error scraping HTML recipe:", err);
            sendResponse({ data: null, error: true });
        }
    }

    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "INSTACART_INGREDIENTS") {
        const ingredients: string[] = request.ingredients;

        try {
            const res = await axios.post(
                `${BACKEND_API_URL}/instacart-ingredients`,
                {
                    ingredients: ingredients,
                },
            );

            const data: InstacartIngredients = res.data;

            sendResponse({ data: data, error: false });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "Axios error:",
                    err.response?.data || err.message,
                );
            } else {
                console.error("Unexpected error:", err);
            }
            sendResponse({ data: null, error: true });
        }
    }

    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "INSTACART_SHOPPING_LIST") {
        const shoppingList: Recipe = request.shoppingList;
        try {
            const res = await axios.post(
                `${BACKEND_API_URL}/instacart-shopping-list`,
                {
                    title: shoppingList.title,
                    ingredients: shoppingList.ingredients,
                    image_url: shoppingList.image_url || "",
                },
            );

            const data: InstacartProductLinkUrl = res.data;

            shoppingList.instacart_products_link_url = data.products_link_url;
            shoppingList.date_created = new Date().toISOString();

            await chrome.storage.local.set({
                [shoppingList.title]: shoppingList,
            });

            sendResponse({ data: data, error: false });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "Axios error:",
                    err.response?.data || err.message,
                );
            } else {
                console.error("Unexpected error:", err);
            }
            sendResponse({ data: null, error: true });
        }
    }
    return true;
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "OPEN_INSTACART_PAGE") {
        const url = request.url;
        if (url) {
            chrome.tabs.create({ url: url });
            console.log("Opening Instacart page:", url);
        } else {
            console.error("No URL provided to open Instacart page.");
        }
    }
    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "GET_PAST_RECIPES") {
        try {
            const recipesObj = await chrome.storage.local.get();
            const pastRecipes = Object.values(recipesObj)
                .filter(
                    (item): item is Recipe =>
                        item &&
                        typeof item === "object" &&
                        "title" in item &&
                        "ingredients" in item,
                )
                .sort((a, b) => {
                    const dateA = new Date(a.date_created ?? 0).getTime();
                    const dateB = new Date(b.date_created ?? 0).getTime();
                    return dateB - dateA;
                });

            sendResponse({ data: pastRecipes, error: false });
        } catch (err) {
            console.error("Error retrieving past recipes:", err);
            sendResponse({ data: null, error: true });
        }

        return true;
    }
    return false;
});
