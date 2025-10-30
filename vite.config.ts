import { defineConfig, loadEnv, type UserConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            tailwindcss(),
        ],
        appType: "custom",
        define: {
            'import.meta.env.FORM_RESULT_TIMEOUT': JSON.stringify(env.FORM_RESULT_TIMEOUT),
        },
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
    } satisfies UserConfig
});

