import axios from "axios";

export const BACKEND_API_URL = process.env.PLASMO_PUBLIC_BACKEND_API_URL;

export const api = axios.create({ baseURL: BACKEND_API_URL });

/** Returns the tab the user is currently looking at, or undefined. */
export async function getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
    });
    return tab;
}

/** Normalizes an unknown error into a console log with useful context. */
export function logError(context: string, err: unknown) {
    if (axios.isAxiosError(err)) {
        console.error(context, err.response?.data ?? err.message);
    } else {
        console.error(context, err);
    }
}
