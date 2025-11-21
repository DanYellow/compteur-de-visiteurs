import { fileURLToPath } from "url";
import path from "path";
import nunjucks from "nunjucks";
import express from "express";
import cors from "cors";
import { WebSocketServer } from 'ws';
import { DateTime } from "luxon";
import ip from "ip";
import cookieParser from "cookie-parser";

import config from "#config" with { type: "json" };

import router from "./router/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverip = ip.address();

const app = express();
if (process.env.NODE_ENV === "development") {
    const viteConfig = await import("../vite.config.ts");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer(viteConfig);
    app.use(vite.middlewares);
}

let publicPath = path.join(path.resolve(), "public");
if (process.env.NODE_ENV === "production") {
    publicPath = path.join(path.resolve(), "dist");
}

app.set("view engine", "nunjucks");
app.set("views", path.join(__dirname, "..", "/src"));

app.use(express.static(publicPath));
app.use(cors());
app.use(express.urlencoded())
app.use(cookieParser())
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
        OPENING_HOURS: config.OPENING_HOURS,
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

app.use(function (req, res, next) {
    res.status(404);

    if (req.accepts('html')) {
        return res.render('pages/error.njk', { code: 404, message: "Page non trouvée" });
    }

    if (req.accepts('json')) {
        return res.json({ error: "Page non trouvée" });
    }

    res.type('txt').send("Page non trouvée");
});

const nunjucksConfig = nunjucks.configure(app.get("views"), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV === "development",
    web: {
        useCache: process.env.NODE_ENV !== "development",
    },
});

nunjucksConfig.addFilter("date", (value, format) => {
    if (!DateTime.fromISO(value).isValid) {
        return DateTime.fromJSDate(new Date(value)).setLocale('fr').toFormat(format);
    }

    return DateTime.fromISO(value).setLocale('fr').toFormat(format);
});

nunjucksConfig.addFilter("add_days", (value, days) => {
    return DateTime.fromISO(value).plus({ days });
});

nunjucksConfig.addGlobal("formatQueryParams", (obj: Record<string, string>, removeIfEmpty: boolean = false) => {
    const params = new URLSearchParams(obj);
    if (removeIfEmpty) {
        Object.keys(obj).forEach((item) => {
            if (!params.get(item)) {
                params.delete(item);
            }
        })
    }

    return `?${params.toString()}`;
});

const listDomains: string[] = (process.env.IS_DOCKER?.toLowerCase() === "true" && process.env.NODE_ENV === "production") ? ["faclab.localhost"] : ["localhost", "0.0.0.0"];
const port = Number(process.env.VITE_PORT || 3900);
const server = app.listen(port, () => {
    console.log("---------------------------");
    console.log(
        "Express server running at (ctrl/cmd + click to open in your browser):"
    );
    [serverip, ...listDomains]
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
    server,
})

wss.on('connection', (ws) => {
    ws.on('error', console.error);

    // ws.on('message', function message(data) {
    //     console.log('received: %s', data);
    // });

    // ws.send('something');
});
