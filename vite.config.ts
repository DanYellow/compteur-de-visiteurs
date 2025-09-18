import type { UserConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";

export default {
    plugins: [
        tailwindcss(),
    ],
    appType: "custom",
    server: {
        // Expose the server to the network allowing access from ip address
        host: true,
        hmr: true,
        middlewareMode: true,
    },
} satisfies UserConfig;
