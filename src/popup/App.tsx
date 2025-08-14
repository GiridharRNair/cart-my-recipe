import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, ExternalLink } from "lucide-react";
import { Recipe, ChromeListener, InstacartProductLinkUrl } from "@/types";

async function sendChromeMessage<T>(message: any): Promise<T> {
    return new Promise<T>((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

const STATUS_MESSAGES = {
    PARSING_RECIPE: "parsing recipe",
    PROCESSING_INGREDIENTS: "processing ingredients",
    PROCESSING_INSTRUCTIONS: "processing instructions",
    CREATING_SHOPPING_LIST: "creating shopping list",
};

export default function App() {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [shoppingListUrl, setShoppingListUrl] =
        useState<InstacartProductLinkUrl | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleError(message: string) {
        setError(message);
        setLoading(false);
    }

    async function getInstacartShoppingList() {
        setLoading(true);
        setError(null);
        setShoppingListUrl(null);

        try {
            setStatus(STATUS_MESSAGES.PARSING_RECIPE);
            const parseRecipeRes = await sendChromeMessage<ChromeListener>({
                action: "PARSE_RECIPE",
            });

            if (parseRecipeRes.error) {
                return handleError("Recipe not supported on this page");
            }

            let recipe = parseRecipeRes.data as Recipe;

            setStatus(STATUS_MESSAGES.PROCESSING_INGREDIENTS);
            const ingredientsRes = await sendChromeMessage<ChromeListener>({
                action: "INSTACART_INGREDIENTS",
                ingredients: recipe.ingredients,
            });

            if (ingredientsRes.error) {
                return handleError("Failed to process ingredients");
            }

            recipe = {
                ...recipe,
                ingredients: ingredientsRes.data as string[],
            };

            setStatus(STATUS_MESSAGES.PROCESSING_INSTRUCTIONS);
            const instructionsRes = await sendChromeMessage<ChromeListener>({
                action: "INSTACART_INSTRUCTIONS",
                instructions: recipe.instructions,
            });

            if (instructionsRes.error) {
                return handleError("Failed to process instructions");
            }

            recipe = {
                ...recipe,
                instructions: instructionsRes.data as string,
            };

            setStatus(STATUS_MESSAGES.CREATING_SHOPPING_LIST);
            const shoppingListRes = await sendChromeMessage<ChromeListener>({
                action: "INSTACART_SHOPPING_LIST",
                shoppingList: recipe,
            });

            if (shoppingListRes.error) {
                return handleError("Failed to create shopping list");
            }

            setShoppingListUrl(shoppingListRes.data as InstacartProductLinkUrl);
        } catch (err) {
            handleError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    const handleButtonClick = () => {
        if (shoppingListUrl) {
            window.open(
                shoppingListUrl.products_link_url,
                "_blank",
                "noopener,noreferrer",
            );
        } else {
            getInstacartShoppingList();
        }
    };

    return (
        <div className="w-72 p-4 space-y-4">
            <h1 className="text-xl text-center">cart your recipe</h1>

            {error && (
                <div className="text-sm text-red-600 text-center">{error}</div>
            )}

            <Button
                onClick={handleButtonClick}
                disabled={loading}
                variant={"outline"}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {status}
                    </>
                ) : shoppingListUrl ? (
                    <>
                        <ExternalLink className="h-4 w-4" />
                        open in Instacart
                    </>
                ) : (
                    <>
                        <ShoppingCart className="h-4 w-4" />
                        order ingredients
                    </>
                )}
            </Button>
        </div>
    );
}
