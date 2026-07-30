import type { PlasmoMessaging } from "@plasmohq/messaging";
import { getCurrentTab } from "@/lib/api";
import type { Recipe } from "@/types";

/** Last-resort DOM scrape using common ingredient selectors + heuristics. */
const handler: PlasmoMessaging.MessageHandler = async (_req, res) => {
    const tab = await getCurrentTab();
    if (!tab?.id) {
        console.error("No active tab found or tab ID is undefined.");
        return res.send({ data: null, error: true });
    }

    try {
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: () => {
                const ogTitle =
                    document
                        .querySelector('meta[property="og:title"]')
                        ?.getAttribute("content") ||
                    document
                        .querySelector('meta[name="og:title"]')
                        ?.getAttribute("content") ||
                    document.title;

                const ogImage =
                    document
                        .querySelector('meta[property="og:image"]')
                        ?.getAttribute("content") ||
                    document
                        .querySelector('meta[name="og:image"]')
                        ?.getAttribute("content");

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

                for (const selector of ingredientSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        ingredients = Array.from(elements)
                            .map((el) => el?.textContent?.trim() ?? "")
                            .filter((text) => text.length > 0);
                        break;
                    }
                }

                if (ingredients.length === 0) {
                    const lists = document.querySelectorAll("ul li, ol li");
                    const potentialIngredients = Array.from(lists)
                        .map((li) => li?.textContent?.trim() ?? "")
                        .filter(
                            (text) =>
                                text.length > 3 &&
                                text.length < 200 &&
                                (/\d+/.test(text) ||
                                    /\b(cup|tbsp|tsp|oz|lb|gram|ml)\b/i.test(
                                        text,
                                    ) ||
                                    /\b(salt|pepper|oil|butter|flour|sugar)\b/i.test(
                                        text,
                                    )),
                        );

                    if (potentialIngredients.length >= 3) {
                        ingredients = potentialIngredients.slice(0, 20);
                    }
                }

                return {
                    title: ogTitle,
                    image: ogImage,
                    ingredients,
                    url: window.location.href,
                };
            },
        });

        const scraped = result.result;

        if (!scraped || (!scraped.title && scraped.ingredients.length === 0)) {
            console.error("Could not scrape recipe data.");
            return res.send({ data: null, error: true });
        }

        const recipe: Recipe = {
            title: scraped.title || "",
            canonical_url: scraped.url,
            ingredients: scraped.ingredients,
            image_url: scraped.image || "",
        };

        console.log("Recipe (HTML fallback method):", recipe);
        res.send({ data: recipe, error: false });
    } catch (err) {
        console.error("Error scraping HTML recipe:", err);
        res.send({ data: null, error: true });
    }
};

export default handler;
