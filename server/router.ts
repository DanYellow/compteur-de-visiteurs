import fs from "fs";

import express from "express";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";

import { listBusinessSector } from "#scripts/utils.ts"

const router = express.Router();

router.get("/", (req, res) => {
    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
    });
});

router.post("/", async (req, res) => {
    if (fs.existsSync("./message.tmp.csv")) {
        const payload = stringify([Object.values(req.body)]);
        fs.appendFileSync("./message.tmp.csv", payload);
    } else {
        const payload = stringify([Object.keys(req.body), Object.values(req.body)]);
        fs.writeFileSync("./message.tmp.csv", payload);
    }

    console.log(
        "output",
        // file: req.file,
    )
    res.send('hello world')
});

router.get("/membres", (req, res) => {
    const content = fs.readFileSync(`./message.tmp.csv`);

    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
    });
    console.log(records)

    res.render("pages/members-list.njk", {
        "members_list": records,
        "list_business_sector": listBusinessSector,
    });
});


export default router;
