import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
    Recipe,
    ChromeListener,
    InstacartProductLinkUrl,
    InstacartIngredients,
    InstacartInstructions,
} from "@/types";
import InstacartLogo from "@/assets/instacart-logo.png";
import { sendChromeMessage } from "@/lib/utils";

export default function App() {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleError(message: string) {
        setError(message);
        setLoading(false);
    }

    async function getInstacartShoppingList() {
        setLoading(true);
        setError(null);

        try {
            setStatus("processing recipe");
            const parseRecipeRes = await sendChromeMessage<ChromeListener>({
                action: "PARSE_RECIPE",
            });

            if (parseRecipeRes.error) {
                return handleError("Recipe not found or invalid");
            }

            let recipe = parseRecipeRes.data as Recipe;

            setStatus("processing ingredients");
            const ingredientsRes = await sendChromeMessage<ChromeListener>({
                action: "INSTACART_INGREDIENTS",
                ingredients: recipe.ingredients,
            });

            if (ingredientsRes.error) {
                return handleError("Failed to process ingredients");
            }

            const instacartIngredients: InstacartIngredients =
                ingredientsRes.data as InstacartIngredients;

            recipe = {
                ...recipe,
                ingredients: instacartIngredients.ingredients,
            };

            setStatus("processing instructions");
            const instructionsRes = await sendChromeMessage<ChromeListener>({
                action: "INSTACART_INSTRUCTIONS",
                instructions: recipe.instructions,
            });

            if (instructionsRes.error) {
                return handleError("Failed to process instructions");
            }

            const instacartInstructions: InstacartInstructions =
                instructionsRes.data as InstacartInstructions;

            recipe = {
                ...recipe,
                instructions: instacartInstructions.instructions,
            };

            setStatus("generating shopping list");
            const shoppingListRes = await sendChromeMessage<ChromeListener>({
                action: "INSTACART_SHOPPING_LIST",
                shoppingList: recipe,
            });

            if (shoppingListRes.error) {
                return handleError("Failed to create shopping list");
            }

            setStatus("redirecting to Instacart");
            const shoppingList: InstacartProductLinkUrl =
                shoppingListRes.data as InstacartProductLinkUrl;

            await sendChromeMessage({
                action: "OPEN_INSTACART_PAGE",
                url: shoppingList.products_link_url,
            });
        } catch (err) {
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
                            src={InstacartLogo}
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
