import { useState } from "react";
import instacartLogo from "data-base64:~assets/instacart-logo.png";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
    Recipe,
    InstacartProductLinkUrl,
    InstacartIngredients,
} from "@/types";
import { send, openTab } from "@/lib/utils";
import "@/style.gen.css";

const PARSE_METHODS = [
    "parse-recipe-backend",
    "parse-recipe-jsonld",
    "parse-recipe-html",
];

export default function Popup() {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleError(message: string) {
        setError(message);
        setLoading(false);
    }

    async function getInstacartShoppingList() {
        setLoading(true);
        setError(null);

        try {
            setStatus("processing recipe");
            let recipe: Recipe | null = null;

            for (const method of PARSE_METHODS) {
                const parseRecipeRes = await send<Recipe>(method);
                if (!parseRecipeRes.error && parseRecipeRes.data) {
                    recipe = parseRecipeRes.data;
                    break;
                }
            }

            if (!recipe) {
                return handleError("Recipe not found or supported");
            }

            setStatus("processing ingredients");
            const ingredientsRes = await send<InstacartIngredients>(
                "instacart-ingredients",
                { ingredients: recipe.ingredients },
            );

            if (ingredientsRes.error || !ingredientsRes.data) {
                return handleError("Failed to process ingredients");
            }

            recipe = {
                ...recipe,
                ingredients: ingredientsRes.data.ingredients,
            };

            setStatus("generating shopping list");
            const shoppingListRes = await send<InstacartProductLinkUrl>(
                "instacart-shopping-list",
                { shoppingList: recipe },
            );

            if (shoppingListRes.error || !shoppingListRes.data) {
                return handleError("Failed to create shopping list");
            }

            setStatus("redirecting to Instacart");
            openTab(shoppingListRes.data.products_link_url);
        } catch {
            handleError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    async function openSidePanel() {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (tab?.windowId !== undefined) {
                await chrome.sidePanel.open({ windowId: tab.windowId });
            } else {
                console.error("No active tab or window found.");
            }
        } catch (error) {
            console.error("Error opening side panel:", error);
        }
    }

    return (
        <div className="w-72 p-4 space-y-3">
            <h1 className="text-xl text-center font-light">cart my recipe</h1>

            {error && (
                <div className="text-sm text-red-600 text-center">{error}</div>
            )}

            <Button
                onClick={getInstacartShoppingList}
                disabled={loading}
                variant={"outline"}
                className="w-full cursor-pointer font-light h-[46px] rounded-3xl"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {status}
                    </>
                ) : (
                    <>
                        <img
                            src={instacartLogo}
                            alt="Instacart Logo"
                            className="w-[22px]"
                        />
                        Get Recipe Ingredients
                    </>
                )}
            </Button>

            <Button
                onClick={openSidePanel}
                variant={"outline"}
                className="w-full cursor-pointer font-light h-[46px] rounded-3xl"
            >
                get past recipes
            </Button>
        </div>
    );
}
