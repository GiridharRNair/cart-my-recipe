import type { PlasmoMessaging } from "@plasmohq/messaging";
import { api, logError } from "@/lib/api";
import type { InstacartProductLinkUrl, Recipe } from "@/types";

/**
 * Creates an Instacart products link for the recipe and persists the recipe
 * (keyed by title) to local storage so it shows up under "past recipes".
 */
const handler: PlasmoMessaging.MessageHandler<{ shoppingList: Recipe }> =
    async (req, res) => {
        const shoppingList = req.body?.shoppingList;
        if (!shoppingList) {
            return res.send({ data: null, error: true });
        }

        try {
            const { data } = await api.post<InstacartProductLinkUrl>(
                "/instacart-shopping-list",
                {
                    title: shoppingList.title,
                    ingredients: shoppingList.ingredients,
                    image_url: shoppingList.image_url || "",
                },
            );

            shoppingList.instacart_products_link_url = data.products_link_url;
            shoppingList.date_created = new Date().toISOString();

            await chrome.storage.local.set({
                [shoppingList.title]: shoppingList,
            });

            res.send({ data, error: false });
        } catch (err) {
            logError("instacart-shopping-list failed:", err);
            res.send({ data: null, error: true });
        }
    };

export default handler;
