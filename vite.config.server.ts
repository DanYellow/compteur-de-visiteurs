import fs from "fs";
import { defineConfig } from "vite";
import { viteStaticCopy } from 'vite-plugin-static-copy'

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

});
