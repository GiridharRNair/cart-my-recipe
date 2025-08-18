import { useState, useEffect } from "react";
import { Recipe, ChromeListener } from "@/types";
import { sendChromeMessage, ISSUE_FORM_URL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ExternalLink, Utensils } from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import InstacartLogo from "@/assets/instacart-logo.png";

export default function App() {
    const [pastRecipes, setPastRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPastRecipes();
    }, []);

    async function fetchPastRecipes() {
        setLoading(true);
        setError(null);
        try {
            const response = await sendChromeMessage<ChromeListener>({
                action: "GET_PAST_RECIPES",
            });

            if (response.error) {
                throw new Error("Failed to fetch past recipes");
            }

            const recipes = response.data as Recipe[];

            setPastRecipes(recipes);
        } catch (err) {
            setError(
                "Something went wrong while fetching past recipes. If the issue persists, please report it using the link below.",
            );
        } finally {
            setLoading(false);
        }
    }

    async function openInstacartLink(instacartUrl: string) {
        try {
            await sendChromeMessage<ChromeListener>({
                action: "OPEN_INSTACART_PAGE",
                url: instacartUrl,
            });
        } catch (error) {
            console.error("Error opening Instacart link:", error);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen text-center px-12 space-y-2 text-sm font-light">
                <p className="text-red-500">{error}</p>
                <Button
                    variant="link"
                    className="h-5 font-light"
                    onClick={() =>
                        window.open(
                            ISSUE_FORM_URL,
                            "_blank",
                            "noopener,noreferrer",
                        )
                    }
                >
                    <ExternalLink />
                    Report Issue?
                </Button>
            </div>
        );
    }

    if (pastRecipes.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <span className="text-muted-foreground text-base font-light">
                    No recipes yet
                </span>
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr">
                {pastRecipes.map((recipe, index) => (
                    <Card
                        key={index}
                        className="hover:shadow-md transition-shadow w-full mx-auto flex flex-col max-w-lg"
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <CardTitle className="text-base font-medium leading-tight">
                                        {recipe.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        {recipe.date_created
                                            ? new Date(
                                                  recipe.date_created,
                                              ).toLocaleDateString()
                                            : "Unknown date"}
                                    </CardDescription>
                                </div>
                                {recipe.image_url && (
                                    <img
                                        src={recipe.image_url}
                                        alt={recipe.title}
                                        className="w-18 h-18 rounded-md object-cover flex-shrink-0"
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Utensils className="h-3 w-3" />
                                <span>
                                    {recipe.ingredients.length} ingredients
                                </span>
                            </div>

                            <Separator />

                            <Button
                                onClick={() =>
                                    openInstacartLink(
                                        recipe.instacart_products_link_url!,
                                    )
                                }
                                size="sm"
                                className="w-full h-8 text-xs font-light cursor-pointer"
                                variant={"outline"}
                            >
                                <img
                                    src={InstacartLogo}
                                    alt="Instacart Logo"
                                    className="w-[13px] mr-1"
                                />
                                Shop on Instacart
                            </Button>

                            <Button
                                onClick={() =>
                                    window.open(
                                        recipe.canonical_url,
                                        "_blank",
                                        "noopener,noreferrer",
                                    )
                                }
                                size="sm"
                                className="w-full h-8 text-xs font-light cursor-pointer"
                                variant={"outline"}
                            >
                                <>
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Go to recipe
                                </>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
