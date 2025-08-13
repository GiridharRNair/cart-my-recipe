import axios from "axios";

console.log("Background script running!");

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

type InstacartShoppingList = {
    title: string;
    instructions: string[];
    ingredients: string[];
    image_url?: string;
};

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.action === "parseRecipe") {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            async (tabs) => {
                const tabId = tabs[0].id;
                const tabUrl = tabs[0].url;

                if (typeof tabId === "undefined") {
                    console.error("Tab ID is undefined.");
                    sendResponse({ error: "Failed to get active tab ID." });
                    return;
                }

                const [result] = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    world: "MAIN",
                    func: () => document.documentElement.outerHTML,
                });

                const htmlContent = result.result;

                try {
                    const res = await axios.post(
                        `${BACKEND_API_URL}/parse-recipe`,
                        {
                            html: htmlContent,
                            url: tabUrl,
                        },
                    );

                    sendResponse({ data: res.data });
                } catch (err) {
                    if (axios.isAxiosError(err)) {
                        console.error(
                            "Axios error:",
                            err.response?.data || err.message,
                        );
                        sendResponse({
                            error: err.response?.data || err.message,
                        });
                    } else {
                        console.error("Unexpected error:", err);
                        sendResponse({
                            error: "An unexpected error occurred.",
                        });
                    }
                }
            },
        );

        return true;
    }
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "instacartIngredients") {
        const ingredients: string[] = request.ingredients;

        try {
            const res = await axios.post(
                `${BACKEND_API_URL}/instacart-ingredients`,
                {
                    ingredients: ingredients,
                },
            );

            sendResponse({ data: res.data });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "Axios error:",
                    err.response?.data || err.message,
                );
                sendResponse({
                    error: err.response?.data || err.message,
                });
            } else {
                console.error("Unexpected error:", err);
                sendResponse({
                    error: "An unexpected error occurred.",
                });
            }
        }
    }

    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "instacartInstructions") {
        const instructions: string = request.instructions;

        try {
            const res = await axios.post(
                `${BACKEND_API_URL}/instacart-instructions`,
                {
                    instructions: instructions,
                },
            );

            sendResponse({ data: res.data });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "Axios error:",
                    err.response?.data || err.message,
                );
                sendResponse({
                    error: err.response?.data || err.message,
                });
            } else {
                console.error("Unexpected error:", err);
                sendResponse({
                    error: "An unexpected error occurred.",
                });
            }
        }
    }

    return true;
});

chrome.runtime.onMessage.addListener(async (request, _, sendResponse) => {
    if (request.action === "instacartShoppingList") {
        const shoppingList: InstacartShoppingList = request.shoppingList;

        try {
            const res = await axios.post(
                `${BACKEND_API_URL}/instacart-shopping-list`,
                shoppingList,
            );

            sendResponse({ data: res.data });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "Axios error:",
                    err.response?.data || err.message,
                );
                sendResponse({
                    error: err.response?.data || err.message,
                });
            } else {
                console.error("Unexpected error:", err);
                sendResponse({
                    error: "An unexpected error occurred.",
                });
            }
        }
    }

    return true;
});
