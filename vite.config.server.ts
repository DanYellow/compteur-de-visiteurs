import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import fs from "fs";
import { builtinModules } from "module";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const dependencies = Object.keys(pkg.dependencies || {});
const devDependencies = Object.keys(pkg.devDependencies || {});

export default defineConfig({
    root: ".",
    build: {
        outDir: "dist",
        emptyOutDir: false,
        target: "ES2022",
        ssr: "server/index.ts",
        rollupOptions: {
            external: [
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
                ...dependencies,
                ...devDependencies
            ],
            output: {
                format: "es",
                preserveModules: true,
                preserveModulesRoot: ".",
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js"
            }
        }
    },
    // plugins: [
    //     tsconfigPaths({
    //         projects: ["./tsconfig.server.json"]
    //     })
    // ],
    // resolve: {
    //     alias: {
    //         "#server": path.resolve(__dirname, "./server"),
    //         "#scripts": path.resolve(__dirname, "./src/assets/scripts"),
    //         "#models": path.resolve(__dirname, "./models"),
    //         "#schemas": path.resolve(__dirname, "./src/assets/scripts/schemas"),
    //         "#types": path.resolve(__dirname, "./types.ts"),
    //     }
    // }
});
