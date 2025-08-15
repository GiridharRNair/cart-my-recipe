import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Recipe, ChromeListener, InstacartProductLinkUrl } from "@/types";
import InstacartLogo from "@/assets/instacart-logo.png";

async function sendChromeMessage<T>(message: any): Promise<T> {
    return new Promise<T>((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

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

            recipe = {
                ...recipe,
                ingredients: ingredientsRes.data as string[],
            };

            setStatus("processing instructions");
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

    const handleButtonClick = () => {
        getInstacartShoppingList();
    };

    return (
        <div className="w-72 p-4 space-y-3">
            <h1 className="text-xl text-center font-light">cart my recipe</h1>

            {error && (
                <div className="text-sm text-red-600 text-center">{error}</div>
            )}

            <Button
                onClick={handleButtonClick}
                disabled={loading}
                variant={"outline"}
                className="w-full cursor-pointer font-light"
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
                            className="w-4"
                        />
                        order ingredients
                    </>
                )}
            </Button>
        </div>
    );
}
