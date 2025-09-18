import fs from "fs";

import express from "express";
import { stringify } from "csv-stringify/sync";

import { listBusinessSector } from "#scripts/utils.ts"

const router = express.Router();

router.get("/", (req, res) => {
    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
    });
});

router.post("/", async (req, res) => {
    const output = stringify([Object.keys(req.body), Object.values(req.body)]);
    fs.writeFileSync("./message.tmp.csv", output);

    console.log(
        output,
            // file: req.file,
    )
    res.send('hello world')
});


export default router;
