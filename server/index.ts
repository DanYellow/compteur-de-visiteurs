import { fileURLToPath } from "url";
import path from "path";
import dotenv from 'dotenv'
import nunjucks from "nunjucks";
import express from "express";
import cors from "cors";
import { WebSocketServer } from 'ws';
import { DateTime } from "luxon";

import router from "./router.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

if (process.env.NODE_ENV === "development") {
    dotenv.config({ path: './.env.dist' })

    const viteConfig = await import("../vite.config.ts");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer(viteConfig);
    app.use(vite.middlewares);
}

const publicPath = path.join(path.resolve(), "public");

app.set("view engine", "nunjucks");
app.set("views", path.join(__dirname, "..", "/src"));

app.use(express.static(publicPath));
app.use(cors());
app.use(
    express.json({
        type: [
            "application/json",
            "application/csp-report",
            "application/reports+json",
            "application/importmap+json",
        ],
    })
);

app.use((req, res, next) => {
    const context = {
        NODE_ENV: process.env.NODE_ENV,
    };

    res.locals = {
        ...context,
    };

    next();
});

app.all('/', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.use(router);

const nunjucksConfig = nunjucks.configure(app.get("views"), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV === "development",
    web: {
        useCache: process.env.NODE_ENV !== "development",
    },
});

nunjucksConfig.addFilter("date", (value, format) => {
    return DateTime.fromISO(value).toFormat(format);
});

const listDomains: string[] = ["0.0.0.0"]; // "192.168.0.169"
const port = Number(process.env.VITE_PORT || 3900);
const server = app.listen(port, ["::"], () => {
    console.log("---------------------------");
    console.log(
        "Express server running at (ctrl/cmd + click to open in your browser):"
    );
    ["localhost", ...listDomains]
        .filter(Boolean)
        .filter((item) => item !== "::")
        .forEach((item) => {
            let prefix = "Network";
            if (item.includes("localhost")) {
                prefix = "Local";
            }
            console.log(`\x1b[35m➜\x1b[0m  ${prefix}: \x1b[35mhttp://${item}:${port}/\x1b[0m`);
        });
});

export const wss = new WebSocketServer({
    // port: 8080,
    server,
})

wss.on('connection', (ws) => {
    ws.on('error', console.error);

    // ws.on('message', function message(data) {
    //     console.log('received: %s', data);
    // });

    // ws.send('something');
});
