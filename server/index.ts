import { fileURLToPath } from "url";
import path from "path";
import nunjucks from "nunjucks";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { DateTime } from "luxon";
import ip from "ip";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from 'dotenv';
import fs from "fs";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import base64url from "base64url";

import router from "#server/router/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverip = ip.address();

dotenv.config({ path: `${process.cwd()}/.env.local` })

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
app.use(cors({ origin: '*' }));
app.use(express.urlencoded());
app.use(cookieParser());
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
app.use(
    session({
        secret: "your_session_secret",
        resave: false,
        saveUninitialized: true,
    })
);

app.use((req, res, next) => {
    const context = {
        NODE_ENV: process.env.NODE_ENV,
        admin_prefix: `/admin${process.env?.ADMIN_SUFFIX ? `-${process.env.ADMIN_SUFFIX}` : ""}`,
        user_role: {},
    };

    res.locals = {
        ...res.locals,
        ...context,
    };

    next();
});

app.all("/", function (req, res, next) {
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
    if (!DateTime.fromISO(value).isValid) {
        const date = DateTime.fromJSDate(new Date(value));
        if (date.isValid) {
            return date.setLocale("fr").toFormat(format);
        }
        return "";
    }

    return DateTime.fromISO(value).setLocale("fr").toFormat(format);
});

nunjucksConfig.addFilter("add_days", (value, days) => {
    return DateTime.fromISO(value).plus({ days });
});

nunjucksConfig.addFilter("uppercase", (value = "") => {
    return String(value || "").toLocaleUpperCase();
});

nunjucksConfig.addFilter("pad", (value, char: string, nb: number) => {
    return String(value).padStart(nb, char);
});

nunjucksConfig.addFilter("split", (value, char = ",") => {
    return String(value)
        .split(char)
        .map((item) => `${item}<br />`)
        .join("");
});

nunjucksConfig.addFilter("filter", (array, predicate) => {
    return array.filter((item: Record<string, unknown>) => {
        return item[predicate.key] === predicate.value;
    });
});

nunjucksConfig.addFilter("find", (array, predicate) => {
    return array.find((item: Record<string, unknown>) => {
        return item[predicate.key] === predicate.value;
    });
});

nunjucksConfig.addFilter("oxford_comma", (string) => {
    return string.slice(0, -1).join(', ') + ' et ' + string.slice(-1)
});

nunjucksConfig.addFilter("json", (value, listKeysToDelete: string[] = []) => {
    if (!Array.isArray(listKeysToDelete)) {
        listKeysToDelete = [];
    }

    if (value instanceof nunjucks.runtime.SafeString) {
        value = value.toString();
    }

    const jsonString = JSON.stringify(value);
    return jsonString;
});

nunjucksConfig.addGlobal(
    "formatQueryParams",
    (obj: Record<string, string>, removeIfEmpty: boolean = false) => {
        const params = new URLSearchParams(obj);
        if (removeIfEmpty) {
            Object.keys(obj).forEach((item) => {
                if (!params.get(item)) {
                    params.delete(item);
                }
            });
        }

        const stringifiedParams = params.toString();

        return stringifiedParams.length ? `?${params.toString()}` : "";
    }
);


const listDomains: string[] =
    process.env.IS_DOCKER?.toLowerCase() === "true" &&
        process.env.NODE_ENV === "production"
        ? ["faclab.localhost"]
        : ["localhost", "0.0.0.0"];
const port = Number(process.env.VITE_PORT || 3900);

let users = {};
let challenges = {};
const rpId = 'localhost';
const expectedOrigin = [`http://localhost:${port}`];

let server = null;

if (process.env.NODE_ENV === 'development') {
    const https = await import("https");

    const options = {
        key: fs.readFileSync(path.join('localhost-key.pem')),
        cert: fs.readFileSync(path.join('localhost.pem'))
    };

    server = https.createServer(options, app).listen(port, () => {
        console.log("---------------------------");
        console.log(
            "HTTPS Express server running at (ctrl/cmd + click to open in your browser):"
        );
        [serverip, ...listDomains]
            .filter(Boolean)
            .filter((item) => item !== "::")
            .forEach((item) => {
                let prefix = "Network";
                if (item.includes("localhost")) {
                    prefix = "Local";
                }
                console.log(
                    `\x1b[35m➜\x1b[0m  ${prefix}: \x1b[35mhttps://${item}:${port}/\x1b[0m`
                );
            });
    });
} else {
    server = app.listen(port);
}

function getNewChallenge() {
    return Math.random().toString(36).substring(2);
}
function convertChallenge(challenge) {
    return btoa(challenge).replaceAll('=', '');
}

app.post('/register/start', (req, res) => {
    console.log("req.body", req.body)
    let username = req.body.username;
    let challenge = getNewChallenge();
    challenges[username] = convertChallenge(challenge);
    const pubKey = {
        challenge: challenge,
        rp: { id: rpId, name: 'webauthn-app' },
        user: { id: username, name: username, displayName: username },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
            requireResidentKey: false,
        }
    };
    res.json(pubKey);
});


app.post('/register/finish', async (req, res) => {
    const username = req.body.username;
    // Verify the attestation response
    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: req.body.data,
            expectedChallenge: challenges[username],
            expectedOrigin: expectedOrigin
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ error: error.message });
    }
    const { verified, registrationInfo } = verification;
    if (verified) {
        users[username] = registrationInfo;
        return res.status(200).send(true);
    }
    res.status(500).send(false);
});


app.use(function (req, res, next) {
    res.status(404);

    if (req.accepts("html")) {
        return res.render("pages/error.njk", {
            code: 404,
            message: "Page non trouvée",
        });
    }

    if (req.accepts("json")) {
        return res.json({ error: "Page non trouvée" });
    }

    res.type("txt").send("Page non trouvée");
});



export const wss = new WebSocketServer({
    server,
});

wss.on("connection", (ws) => {
    ws.on("error", console.error);

    // ws.on('message', function message(data) {
    //     console.log('received: %s', data);
    // });

    // ws.send('something');
});

export const flashMessageCookieOptions = {
    httpOnly: true,
    maxAge: 1000,
    // sameSite: 'strict',
};
