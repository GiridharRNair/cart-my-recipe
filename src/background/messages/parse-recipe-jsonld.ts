import type { PlasmoMessaging } from "@plasmohq/messaging";
import { getCurrentTab } from "@/lib/api";
import type { Recipe } from "@/types";

/** Extracts a recipe from the page's schema.org JSON-LD metadata. */
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
            return res.send({ data: null, error: true });
        }

        // JSON-LD is schema-less external data; treat nodes as untyped.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            return res.send({ data: null, error: true });
        }

        const ingredients: string[] =
            recipeObj.recipeIngredient || recipeObj.ingredients;

        if (!recipeObj.name || !ingredients) {
            console.error("Invalid Recipe object.");
            return res.send({ data: null, error: true });
        }

        const image = Array.isArray(recipeObj.image)
            ? recipeObj.image[0]
            : recipeObj.image?.url || recipeObj.image;

        const recipe: Recipe = {
            title: recipeObj.name,
            canonical_url: recipeObj.mainEntityOfPage || tab.url || "",
            ingredients,
            image_url: typeof image === "string" ? image : "",
        };

        console.log("Recipe (JSON-LD method):", recipe);
        res.send({ data: recipe, error: false });
    } catch (err) {
        console.error("Error parsing JSON-LD:", err);
        res.send({ data: null, error: true });
    }
};

export default handler;
