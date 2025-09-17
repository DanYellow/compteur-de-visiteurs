import type { UserConfig } from "vite";

import vituum from "vituum";
import nunjucks from "@vituum/vite-plugin-nunjucks";
import tailwindcss from "@tailwindcss/vite";

export default {
    plugins: [
        vituum(),
        nunjucks({
            root: "./src",
        }),
        tailwindcss(),
    ],
} satisfies UserConfig;
