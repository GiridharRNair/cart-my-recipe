import type { PlasmoMessaging } from "@plasmohq/messaging";
import type { Recipe } from "@/types";

/** Returns previously generated recipes from local storage, newest first. */
const handler: PlasmoMessaging.MessageHandler = async (_req, res) => {
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

        res.send({ data: pastRecipes, error: false });
    } catch (err) {
        console.error("Error retrieving past recipes:", err);
        res.send({ data: null, error: true });
    }
};

export default handler;
