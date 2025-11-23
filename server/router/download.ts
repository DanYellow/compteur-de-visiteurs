import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, URLSearchParams } from "url";
import { stringify } from "csv-stringify/sync";
import { DateTime, DateTimeUnit } from "luxon";
import sequelize from "#models/index.ts";
import { configData, getLinearCSV, getPivotTable } from "#scripts/utils.shared.ts";
import { slugify } from "#scripts/utils.ts";
import { Visit } from "#types";

const { place: PlaceModel } = sequelize.models;
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

    const extraParams = new URLSearchParams({ jour: req.query[configKey], lieu: req.query.lieu } as Record<string, string>);

    const request = await fetch(`http://${req.get('host')}/api?filtre=${configKey}&${extraParams.toString()}`);
    const requestRes = await request.json();

    let placeName = "tous";
    if (req.query.lieu && req.query.lieu !== "tous") {
        placeName = req.query.lieu.toString() || "tous";
    }

    const fileTimestamp = `_${slugify(placeName)}_${String(Date.now()).slice(-6)}.csv`;
    let csvFilename = "";

    if (isGrouped) {
        const config = configData[configKey];
        if (req.query.lieu && req.query.lieu !== "tous" && configKey === "jour") {
            const place = await PlaceModel.findOne({ where: { slug: req.query.lieu }})
            if (place) {
                const rangeOpeningHours = Math.abs(Number(place.heure_fermeture) - Number(place.heure_ouverture) + 1);
                const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + place.heure_ouverture).map((item) => String(item));

                config.listColumns = listTimeSlots;
            }
        }

        csvFilename = `liste-visites-detaillee_${configKey}`;
        const pivotPayload = Object.groupBy(requestRes.data, (item) => {
            return (item as Visit).groupe;
        });
        csvPayload = getPivotTable(pivotPayload, config.listColumns, { columnSuffix: config?.xValuesSuffix || "" });
    } else {
        csvFilename = `liste-visites_${configKey}`;
        const filterPredicate: DateTimeUnit = predicatesDict[configKey] as DateTimeUnit;
        const daySelected = DateTime.fromISO(Object.values(req.query)[0] as string);
        const periodLabel = `${daySelected.startOf(filterPredicate).toFormat("dd/LL/yyyy")} ➜ ${daySelected.endOf(filterPredicate).toFormat("dd/LL/yyyy")}`;

        csvPayload = getLinearCSV(requestRes.data, { periodLabel, lieu: String(req.query.lieu) });
    }

    csvFilename += fileTimestamp;

    const tempCsvFile = path.join(__dirname, "..", "liste-visites.tmp.csv");

    fs.writeFileSync(tempCsvFile, stringify(csvPayload));
    res.download(tempCsvFile, csvFilename, () => {
        fs.unlinkSync(tempCsvFile);
    });
});

export default router;
