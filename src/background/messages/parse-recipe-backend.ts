import type { PlasmoMessaging } from "@plasmohq/messaging";
import { api, getCurrentTab, logError } from "@/lib/api";
import type { Recipe } from "@/types";

/**
 * Parses the active page's recipe by shipping its full HTML to the backend,
 * which runs the `recipe-scrapers` package (with a wild-mode fallback).
 */
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
            func: () => document.documentElement.outerHTML,
        });

        const html = result.result;
        if (typeof html !== "string") {
            console.error("HTML content is not a string.");
            return res.send({ data: null, error: true });
        }

        const { data } = await api.post<Recipe>("/parse-recipe", {
            html,
            url: tab.url,
        });

        console.log("Recipe (backend recipe-scrapers method):", data);
        res.send({ data, error: false });
    } catch (err) {
        logError("parse-recipe-backend failed:", err);
        res.send({ data: null, error: true });
    }
};

export default handler;
