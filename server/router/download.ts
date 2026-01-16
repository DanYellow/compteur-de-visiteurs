import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, URLSearchParams } from "url";
import { stringify } from "csv-stringify/sync";
import { getLinearCSV, slugify } from "#scripts/utils.shared";

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

    let csvPayload = [];

    const extraParams = new URLSearchParams(Object.entries(
        {
            jour: req.query[configKey],
            lieu: req.query.lieu,
            ...("evenement" in req.query ? { evenement: encodeURIComponent(req.query.evenement as string) } : { pivot: "" }),
        } as Record<string, string>).filter(([_, value]) => value !== undefined && value !== null)
    );

    const request = await fetch(`http://${req.get('host')}/api/visites?filtre=${configKey}&${extraParams.toString()}`);
    const requestRes = await request.json();

    let placeName = "tous";
    if (req.query.lieu && req.query.lieu !== "tous") {
        placeName = req.query.lieu.toString() || "tous";
    } else if ("evenement" in req.query) {
        placeName = (req.query.nom_evenement || "evenement").toString();
    }

    const fileTimestamp = `${slugify(placeName)}_${String(Date.now()).slice(-6)}.csv`;
    const csvFilename = `liste-visites_${configKey}_${fileTimestamp}`;

    csvPayload = getLinearCSV(requestRes.data)

    const tempCsvFile = path.join(__dirname, "..", "liste-visites.tmp.csv");

    fs.writeFileSync(tempCsvFile, stringify(csvPayload));
    res.download(tempCsvFile, csvFilename, () => {
        fs.unlinkSync(tempCsvFile);
    });
});

export default router;
