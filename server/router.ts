import fs from "fs";

import express from "express";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";

import { listBusinessSector } from "#scripts/utils.ts"
import { NewMemberSchema } from "#scripts/schemas.ts";
import { wss } from "./index.ts";

const router = express.Router();

router.get("/", (req, res) => {
    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
    });
});


router.post("/", async (req, res) => {
    const validator = NewMemberSchema.safeParse(req.body);
    if (!validator.success) {
        return res.send('hello world')
    }

    try {
        if (fs.existsSync("./message.tmp.csv")) {
            const payload = stringify([Object.values(req.body)]);
            fs.appendFileSync("./message.tmp.csv", payload);
        } else {
            const payload = stringify([Object.keys(req.body), Object.values(req.body)]);
            fs.writeFileSync("./message.tmp.csv", payload);
        }
        await new Promise(r => setTimeout(r, 2000));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({type: "MEMBER_ADDED", payload: req.body}));
            }
        });

        res.json({ "success": true })
    } catch (err) {
        res.json({ "success": false })
    }
});

router.get("/membres", (req, res) => {
    const content = fs.readFileSync(`./message.tmp.csv`);

    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
    });

    res.render("pages/members-list.njk", {
        "members_list": records,
        "list_business_sector": listBusinessSector,
    });
});


export default router;
