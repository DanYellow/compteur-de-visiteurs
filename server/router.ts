import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import { DateTime } from "luxon";

import { listBusinessSector } from "#scripts/utils.ts"
import { VisitorSchema } from "#scripts/schemas.ts";
import { wss } from "./index.ts";
import { getCurrentDay, getCurrentTime } from "#scripts/utils.ts";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFile = path.join(__dirname, "..", "liste-membres.tmp.csv");

router.get("/", (req, res) => {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log(ip)
    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
    });
});

router.post("/", async (req, res) => {
    const validator = VisitorSchema.safeParse(req.body);
    if (!validator.success) {
        res.status(500).json({ "success": false })
    }

    try {
        if (fs.existsSync(csvFile)) {
            const payload = stringify([Object.values(req.body)]);
            fs.appendFileSync(csvFile, payload);
        } else {
            const payload = stringify([Object.keys(req.body), Object.values(req.body)]);
            fs.writeFileSync(csvFile, payload);
        }
        await new Promise(r => setTimeout(r, 2000));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: "VISITOR_REGISTERED", payload: req.body }));
            }
        });

        res.status(200).json({ "success": true })
    } catch (err) {
        res.status(500).json({ "success": false })
    }
});

router.get("/visiteurs", (req, res) => {
    let records: unknown[] = []

    if (fs.existsSync(csvFile)) {
        const content = fs.readFileSync(csvFile);
        records = parse(content, {
            columns: true,
            skip_empty_lines: true,
        });
    }

    var dt = DateTime.now();
    var f = { month: 'long', day: 'numeric' };
    const currentDate = dt.setLocale('fr').toLocaleString(f)

    res.render("pages/members-list.njk", {
        "members_list": records,
        "list_business_sector": listBusinessSector,
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": currentDate
    });
});

router.get('/membres/telecharger', (req, res) => {
    let timestamp = getCurrentDay().replaceAll("/", "-");
    timestamp = timestamp.split("-").reverse().join("-")
    res.download(csvFile, `${timestamp}-${getCurrentTime()}-liste-membres.csv`);
});

router.get("/reglement", (req, res) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=foo.pdf`);

    res.sendFile("file.tmp.pdf", { root: "public" });
});


export default router;
