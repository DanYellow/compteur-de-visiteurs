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
        hmr: {
            port: 24678,
        },
        middlewareMode: true,
        // origin: "http://0.0.0.0:8080",
        // ...(process.env.VITE_USE_POLLING === "true" ? {
        //     watch: {
        //         usePolling: true,
        //     }
        // } : {})
    },
} satisfies UserConfig;
