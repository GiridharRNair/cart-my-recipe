/** A single structured Instacart line item returned by the backend. */
export type LineItem = {
    name: string;
    quantity?: number;
    unit?: string;
    display_text?: string;
};

export type Recipe = {
    title: string;
    canonical_url: string;
    ingredients: string[] | LineItem[];
    image_url?: string;
    instacart_products_link_url?: string;
    date_created?: string;
};

export type InstacartIngredients = {
    ingredients: LineItem[];
};

export type InstacartProductLinkUrl = {
    products_link_url: string;
};

/** Standard envelope every background message handler resolves to. */
export type MessageResponse<T> = {
    data: T | null;
    error: boolean;
};
