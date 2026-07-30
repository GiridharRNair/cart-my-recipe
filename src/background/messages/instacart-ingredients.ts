import type { PlasmoMessaging } from "@plasmohq/messaging";
import { api, logError } from "@/lib/api";
import type { InstacartIngredients } from "@/types";

/** Converts raw ingredient strings into structured Instacart line items. */
const handler: PlasmoMessaging.MessageHandler<{
    ingredients: string[];
}> = async (req, res) => {
    const ingredients = req.body?.ingredients ?? [];

    try {
        const { data } = await api.post<InstacartIngredients>(
            "/instacart-ingredients",
            { ingredients },
        );
        res.send({ data, error: false });
    } catch (err) {
        logError("instacart-ingredients failed:", err);
        res.send({ data: null, error: true });
    }
};

export default handler;
