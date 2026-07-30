import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { sendToBackground } from "@plasmohq/messaging";
import type { MessageResponse } from "@/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Thin, typed wrapper around Plasmo's `sendToBackground`. Every background
 * message handler resolves to a `{ data, error }` envelope.
 */
export async function send<T>(
    name: string,
    body?: Record<string, unknown>,
): Promise<MessageResponse<T>> {
    return sendToBackground({ name: name as never, body });
}

/** Opens a URL in a new browser tab. */
export function openTab(url: string) {
    if (!url) {
        console.error("openTab called without a URL.");
        return;
    }
    chrome.tabs.create({ url });
}

export const ISSUE_FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSfcuOVlwI4DRcpZGJZqZ9lzro29Mx09PqpnpzsLrevSfY051g/viewform?usp=dialog";
