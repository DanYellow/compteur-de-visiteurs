import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DateTime, DateTimeUnit } from "luxon";
import { stringify } from "csv-stringify/sync";

import { configData, getLinearCSV, getPivotTable } from "#scripts/utils.shared.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();


router.get('/', async (req, res) => {
    const predicatesDict: Record<string, string> = {
        "heure": "day",
        "jour": "week",
        "semaine": "month",
        "mois": "year",
    }

    let filterPredicate: DateTimeUnit | undefined = undefined;
    let dateValue = DateTime.now();

    const apiKey = Object.keys(predicatesDict).filter(value => Object.keys(req.query).includes(value));
    const isGrouped = "groupe" in req.query;

    let csvPayload = [];

    const request = await fetch(`http://${req.get('host')}/api?filtre=${apiKey}`);
    const requestRes = await request.json();

    if (isGrouped) {
        const config = configData[apiKey];
        const pivotPayload = Object.groupBy(requestRes.data, (item: { item: Record<string, string | number> }) => {
            return item.groupe;
        });

        csvPayload = getPivotTable(pivotPayload, config.listColumns, {columnSuffix: config?.xValuesSuffix });
        console.log(csvPayload.at(-1))
    } else {
        csvPayload = getLinearCSV(requestRes.data);
    }

    // const csvFile = path.join(__dirname, "..", "liste-membres.tmp.csv");

    // fs.writeFileSync(csvFile, stringify(csvPayload));
    // res.download(csvFile, `liste-membres_${String(Date.now()).slice(-6)}.csv`, () => {
    //     fs.unlinkSync(csvFile);
    // });
});


export default router;
