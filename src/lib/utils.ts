import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function sendChromeMessage<T>(message: any): Promise<T> {
    return new Promise<T>((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

export const ISSUE_FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSfcuOVlwI4DRcpZGJZqZ9lzro29Mx09PqpnpzsLrevSfY051g/viewform?usp=dialog";
