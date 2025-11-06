import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stringify } from "csv-stringify/sync";

import { configData, getLinearCSV, getPivotTable } from "#scripts/utils.shared.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/', async (req, res) => {
    const predicatesDict: Record<string, string> = {
        "jour": "day",
        "semaine": "week",
        "mois": "month",
        "annee": "year",
    }

    const [configKey] = Object.entries(predicatesDict).filter(([key]) => Object.keys(req.query).includes(key)).at(0) || "jour"
    const isGrouped = "groupe" in req.query;

    let csvPayload = [];

    const request = await fetch(`http://${req.get('host')}/api?filtre=${configKey}`);
    const requestRes = await request.json();

    let csvFilename = `liste-visites_${String(Date.now()).slice(-6)}.csv`;

    if (isGrouped) {
        const config = configData[configKey];

        csvFilename = `liste-visites-detaillee_${String(Date.now()).slice(-6)}.csv`
        const pivotPayload = Object.groupBy(requestRes.data, (item: { item: Record<string, string | number> }) => {
            return item.groupe;
        });
        csvPayload = getPivotTable(pivotPayload, config.listColumns, { columnSuffix: config?.xValuesSuffix || "" });
    } else {
        csvPayload = getLinearCSV(requestRes.data);
    }

    const tempCsvFile = path.join(__dirname, "..", "liste-visites.tmp.csv");

    fs.writeFileSync(tempCsvFile, stringify(csvPayload));
    res.download(tempCsvFile, csvFilename, () => {
        fs.unlinkSync(tempCsvFile);
    });
});


export default router;
