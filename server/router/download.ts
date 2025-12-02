import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, URLSearchParams } from "url";
import { stringify } from "csv-stringify/sync";
import { DateTime, DateTimeUnit } from "luxon";
import sequelize, { RegularOpening as RegularOpeningModel } from "#models/index.ts";
import { baseConfigData, getLinearCSV, getPivotTable, getWeeksRangeMonth } from "#scripts/utils.shared.ts";
import { slugify } from "#scripts/utils.ts";
import { PlaceRaw, VisitRaw } from "#types";

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
        const config = baseConfigData[configKey];
        if (req.query.lieu && req.query.lieu !== "tous" && configKey === "jour") {
            const place = await PlaceModel.findOne({
                where: { slug: req.query.lieu },
                include: [
                    {
                        model: RegularOpeningModel,
                        as: "regularOpening",
                        required: true,
                    }
                ],
                raw: true,
                nest: true,
            }) as unknown as PlaceRaw | null;

            if (place) {
                const closedHour = parseInt(place.regularOpening!.heure_fermeture.split(":")[0]);

                const openHour = parseInt(place.regularOpening!.heure_ouverture.split(":")[0]);

                const rangeOpeningHours = Math.abs(Number(closedHour) - Number(openHour) + 1);
                const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + openHour).map((item) => String(item));

                config.listColumns = listTimeSlots;
            }
        }

        csvFilename = `liste-visites-detaillee_${configKey}`;
        const pivotPayload = Object.groupBy(requestRes.data, (item: VisitRaw) => {
            return item.groupe;
        }) as Record<string, VisitRaw[]>;

        if ("mois" in req.query) {
            config.listColumns = getWeeksRangeMonth(DateTime.fromISO(req.query.mois as string));
        }
        csvPayload = getPivotTable(pivotPayload, config.listColumns, { columnSuffix: config?.xValuesSuffix || "", simplified: true });
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
