export type Recipe = {
    title: string;
    instructions: string[] | string;
    ingredients: string[];
    image_url?: string;
    instacart_products_link_url?: string;
};

export type ListenerError = {
    error: string;
};

export type InstacartIngredients = {
    ingredients: string[];
};

export type InstacartInstructions = {
    instructions: string[];
};

export type InstacartProductLinkUrl = {
    products_link_url: string;
};

export type ChromeListener = {
    data:
        | Recipe
        | string[]
        | string
        | InstacartProductLinkUrl
        | InstacartIngredients
        | InstacartInstructions
        | null;
    error: boolean;
};
