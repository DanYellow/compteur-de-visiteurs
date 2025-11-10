import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, URLSearchParams } from "url";
import { stringify } from "csv-stringify/sync";

import { configData, getLinearCSV, getPivotTable } from "#scripts/utils.shared.ts";
import { DateTime, DateTimeUnit } from "luxon";

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

    const extraParams = new URLSearchParams({ jour: req.query[configKey] } as Record<string, string>);

    const request = await fetch(`http://${req.get('host')}/api?filtre=${configKey}&${extraParams.toString()}`);
    const requestRes = await request.json();

    let csvFilename = `liste-visites_${String(Date.now()).slice(-6)}.csv`;

    if (isGrouped) {
        const config = configData[configKey];

        csvFilename = `liste-visites-detaillee_${String(Date.now()).slice(-6)}.csv`;
        const pivotPayload = Object.groupBy(requestRes.data, (item: { item: Record<string, string | number> }) => {
            return item.groupe;
        });
        csvPayload = getPivotTable(pivotPayload, config.listColumns, { columnSuffix: config?.xValuesSuffix || "" });
    } else {
        const filterPredicate: DateTimeUnit = predicatesDict[configKey] as DateTimeUnit;
        const daySelected = DateTime.fromISO(Object.values(req.query)[0] as string);
        const totalPeriodCell = `${daySelected.startOf(filterPredicate).toFormat("dd/LL/yyyy")} ➜ ${daySelected.endOf(filterPredicate).toFormat("dd/LL/yyyy")}`;
        csvPayload = getLinearCSV(requestRes.data, totalPeriodCell);
    }

    const tempCsvFile = path.join(__dirname, "..", "liste-visites.tmp.csv");

    fs.writeFileSync(tempCsvFile, stringify(csvPayload));
    res.download(tempCsvFile, csvFilename, () => {
        fs.unlinkSync(tempCsvFile);
    });
});


export default router;
