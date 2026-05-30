import { defineConfig, type UserConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";

import path from "path";

const isDocker = process.env.IS_DOCKER === 'true';

export default defineConfig(() => {
    return {
        plugins: [
            tailwindcss(),
        ],
        appType: "custom",
        server: {
            // Expose the server to the network allowing access from ip address
            host: true,
            port: 5173,
            hmr: {
                host: 'localhost',
                port: 5173,
                protocol: 'ws',
            },
            middlewareMode: true,
            ...(isDocker ? {
                watch: {
                    usePolling: true,
                    interval: 100,
                }
            } : {}),
            fs: {
                strict: true,
                allow: [
                    'public',
                    'src',
                    'node_modules',
                ]
            },
        },
        base: '/assets/',
        build: {
            emptyOutDir: false,
            outDir: "dist",
            manifest: "manifest.json",
            target: 'esnext',
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, "src/assets/scripts/main.ts"),
                    "register-form": path.resolve(__dirname, "src/assets/scripts/forms/register-form.ts"),
                    "place-form": path.resolve(__dirname, "src/assets/scripts/forms/place-form.ts"),
                    "event-form": path.resolve(__dirname, "src/assets/scripts/forms/event-form.ts"),
                    "login-form": path.resolve(__dirname, "src/assets/scripts/forms/login-form.ts"),
                    "import-csv-visits-form": path.resolve(__dirname, "src/assets/scripts/forms/import-csv-visits-form.ts"),
                    "dashboard": path.resolve(__dirname, "src/assets/scripts/dashboard.ts"),
                    "download-char": path.resolve(__dirname, "src/assets/scripts/download-chart.ts"),
                    "details-event-dialog": path.resolve(__dirname, "src/assets/scripts/dialogs/details-event-dialog.ts"),
                    "details-visit-dialog": path.resolve(__dirname, "src/assets/scripts/dialogs/details-visit-dialog.ts"),
                    "sign-in-form": path.resolve(__dirname, "src/assets/scripts/forms/sign-in-form.ts"),
                    "toggle-input-visibility": path.resolve(__dirname, "src/assets/scripts/toggle-input-visibility.ts"),
                },
                output: {
                    assetFileNames: "[name].[ext]",
                },
            },
        }
    } satisfies UserConfig
});

