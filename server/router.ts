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
import VisitorModel from "#models/visitor.ts"

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFile = path.join(__dirname, "..", "liste-membres.tmp.csv");

router.get("/", (req, res) => {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log("ip", ip)
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
        const payload = {
            ...req.body,
            place: res.locals.PLACE,
        }

        await VisitorModel.create(payload);
        await new Promise(r => setTimeout(r, 1500));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: "VISITOR_REGISTERED", payload: req.body }));
            }
        });

        res.status(200).json({ "success": true })
    } catch (err) {
        console.log(err)
        res.status(500).json({ "success": false })
    }
});

interface IVisitor {
    date_passage: string;
    day: string;
}

router.get(["/visiteurs", "/liste-visiteurs"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    let records: IVisitor[] = await VisitorModel.findAll();
    console.log(JSON.stringify(records))

    res.render("pages/members-list.njk", {
        "visitors_list": records,
        "list_business_sector": listBusinessSector,
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
    });
});

router.get('/visiteurs/telecharger', (req, res) => {
    // req.query.current_date
    let fileFormatted = [] as IVisitor[];
    if (fs.existsSync(csvFile)) {
        const fileContent = fs.readFileSync(csvFile);
        fileFormatted = (parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
        }) as IVisitor[]).map((item) => (
            {
                ...item,
                date_passage: DateTime.fromISO(item.date_passage).toFormat("dd-LL-yyyy à HH:mm")
            }
        ))
    }

    const timestamp = DateTime.now().toFormat("dd-LL-yyyy-HH'h'mm");

    const payload = [
        Object.keys(fileFormatted?.[0] || []),
        ...fileFormatted.map((item) => Object.values(item))
    ];

    const csvFileFormatted = path.join(__dirname, "..", "liste-membres-formatted.tmp.csv");

    fs.writeFileSync(csvFileFormatted, stringify(payload));
    res.download(csvFileFormatted, `${timestamp}-liste-membres.csv`);
});


export default router;
