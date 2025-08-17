import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
    manifest_version: 3,
    name: pkg.name,
    version: pkg.version,
    description: "Turn any recipe into a grocery delivery!",
    icons: {
        16: "public/icon16.png",
        32: "public/icon32.png",
        48: "public/icon48.png",
        128: "public/icon128.png",
    },
    action: {
        default_icon: {
            48: "public/icon48.png",
        },
        default_popup: "src/popup/index.html",
    },
    permissions: ["sidePanel", "activeTab", "scripting", "storage"],
    side_panel: {
        default_path: "src/sidepanel/index.html",
    },
    background: {
        service_worker: "src/background/index.ts",
    }
});
