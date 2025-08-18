export type Recipe = {
    title: string;
    canonical_url: string;
    ingredients: string[];
    image_url?: string;
    instacart_products_link_url?: string;
    date_created?: string;
};

export type InstacartIngredients = {
    ingredients: string[];
};

export type InstacartProductLinkUrl = {
    products_link_url: string;
};

export type ChromeListener = {
    data:
        | Recipe
        | Recipe[]
        | InstacartProductLinkUrl
        | InstacartIngredients
        | null;
    error: boolean;
};
