import axios from "axios";
import {
    Recipe,
    InstacartProductLinkUrl,
    InstacartIngredients,
    InstacartInstructions,
} from "@/types";

console.log("Background script running!");

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "PARSE_RECIPE") {
        const tab = await getCurrentTab();
        if (!tab || !tab.id) {
            console.error("No active tab found or tab ID is undefined.");
            sendResponse({ data: null, error: true });
            return;
        }

        const tabId = tab.id;
        const tabUrl = tab.url;

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

        try {
            const res = await axios.post(`${BACKEND_API_URL}/parse-recipe`, {
                html: htmlContent,
                url: tabUrl,
            });

            const data: Recipe = res.data;

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
    if (request.action === "INSTACART_INSTRUCTIONS") {
        const instructions: string = request.instructions;

        try {
            const res = await axios.post(
                `${BACKEND_API_URL}/instacart-instructions`,
                {
                    instructions: instructions,
                },
            );

            const data: InstacartInstructions = res.data;

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
                    instructions: shoppingList.instructions,
                    ingredients: shoppingList.ingredients,
                    image_url: shoppingList.image_url || "",
                },
            );

            const data: InstacartProductLinkUrl = res.data;

            shoppingList.instacart_products_link_url = data.products_link_url;

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
            const recipes = await chrome.storage.local.get();
            const pastRecipes = Object.values(recipes).filter(
                (item) => item && typeof item === "object",
            );
            sendResponse({ data: pastRecipes, error: false });
        } catch (err) {
            console.error("Error retrieving past recipes:", err);
            sendResponse({ data: null, error: true });
        }
    }
    return true;
});
