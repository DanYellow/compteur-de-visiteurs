import { defineConfig, loadEnv, type UserConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            tailwindcss(),
        ],
        appType: "custom",
        define: {
            'import.meta.env.FORM_RESULT_TIMEOUT': JSON.stringify(env.FORM_RESULT_TIMEOUT),
            'import.meta.env.OPENING_HOURS': JSON.stringify(env.OPENING_HOURS),
            'import.meta.env.CHART_EXPORT_SIZE': JSON.stringify(env.CHART_EXPORT_SIZE),
            'import.meta.env.PLACE': JSON.stringify(env.PLACE),
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
        build: {
            emptyOutDir: false,
            manifest: "manifest.json",
            target: 'esnext',
            lib: {
                entry: [
                    path.resolve(__dirname, "src/assets/scripts/main.ts"),
                    path.resolve(__dirname, "src/assets/scripts/register-form.ts"),
                    path.resolve(__dirname, "src/assets/scripts/place-form.ts"),
                    path.resolve(__dirname, "src/assets/scripts/dashboard.ts"),
                    path.resolve(__dirname, "src/assets/scripts/download-chart.ts"),
                ],
                formats: ["es"],
            },
            rollupOptions: {
                output: {
                    assetFileNames: "[name].[ext]",
                },
            },
        }
    } satisfies UserConfig
});

