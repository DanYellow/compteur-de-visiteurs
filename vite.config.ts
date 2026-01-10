import { defineConfig, loadEnv, type UserConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isDocker = process.env.IS_DOCKER === 'true';

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
            port: 5173,
            hmr: {
                host: isDocker ? 'localhost' : undefined,
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
        build: {
            emptyOutDir: false,
            manifest: "manifest.json",
            target: 'esnext',
            lib: {
                entry: [
                    path.resolve(__dirname, "src/assets/scripts/main.ts"),
                    path.resolve(__dirname, "src/assets/scripts/forms/register-form.ts"),
                    path.resolve(__dirname, "src/assets/scripts/forms/place-form.ts"),
                    path.resolve(__dirname, "src/assets/scripts/forms/event-form.ts"),
                    path.resolve(__dirname, "src/assets/scripts/dashboard.ts"),
                    path.resolve(__dirname, "src/assets/scripts/download-chart.ts"),
                    path.resolve(__dirname, "src/assets/scripts/dialogs/details-event-dialog.ts"),
                    path.resolve(__dirname, "src/assets/scripts/forms/sign-in-form.ts"),
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

