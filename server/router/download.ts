import express from "express";
import fs from "fs";
import path from "path";
import { ProjectionAlias } from 'sequelize';
import { fileURLToPath, URLSearchParams } from "url";
import { stringify } from "csv-stringify/sync";
import { DateTime, DateTimeUnit } from "luxon";
import sequelize, { RegularOpening as RegularOpeningModel, Visit as VisitModel } from "#models/index.ts";
import { baseConfigData, DEFAULT_CLOSE_HOURS, DEFAULT_OPEN_HOURS, getLinearCSV, getPivotTable, getWeeksRangeMonth, listAgeGroups, listDepartments, listGenders, listGroups } from "#scripts/utils.shared.ts";
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

    const request = await fetch(`http://${req.get('host')}/api/visites?filtre=${configKey}&${extraParams.toString()}&pivot`);
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
        } else if ("jour" in req.query) {
            const closedHours = Number(req.query?.fermeture || DEFAULT_CLOSE_HOURS.split(":")[0]);
            const openHours = Number(req.query?.ouverture || DEFAULT_OPEN_HOURS.split(":")[0]);
            const rangeOpeningHours = Math.abs(closedHours - openHours + 1);

            config.listColumns = Array.from(new Array(rangeOpeningHours), (_, i) => i + openHours).map((item) => String(item));
        }
        csvPayload = getPivotTable(pivotPayload, config.listColumns, { columnSuffix: config?.xValuesSuffix || "", simplified: true });
    } else {
        csvFilename = `liste-visites_${configKey}`;
        const filterPredicate: DateTimeUnit = predicatesDict[configKey] as DateTimeUnit;
        const daySelected = DateTime.fromISO(Object.values(req.query)[0] as string);
        const periodLabel = `${daySelected.startOf(filterPredicate).toFormat("dd/LL/yyyy")} ➜ ${daySelected.endOf(filterPredicate).toFormat("dd/LL/yyyy")}`;

        csvPayload = getLinearCSV(requestRes.data)
    }

    csvFilename += fileTimestamp;

    const tempCsvFile = path.join(__dirname, "..", "liste-visites.tmp.csv");

    fs.writeFileSync(tempCsvFile, stringify(csvPayload));
    res.download(tempCsvFile, csvFilename, () => {
        fs.unlinkSync(tempCsvFile);
    });
});

router.get('/test', async (req, res) => {
    const listGroupsFiltered = listGroups.filter((item) => (!("listInDb" in item) || item.listInDb));

    const totalAttributes: ProjectionAlias[] = [
        [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"] as ProjectionAlias,
        ...listGroupsFiltered.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'SUM',
                    sequelize.literal(`CASE WHEN ${String(item.value)} = 'oui' THEN 1 ELSE 0 END`)
                ),
                item.label
            ]
        }),
        ...listGenders.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'SUM',
                    sequelize.literal(`CASE WHEN genre = '${String(item.value)}' THEN 1 ELSE 0 END`)
                ),
                `genre_${item.label}`
            ]
        }),
        ...listDepartments.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'SUM',
                    sequelize.literal(`CASE WHEN departement = '${String(item.value)}' THEN 1 ELSE 0 END`)
                ),
                `departement_${item.label}`
            ]
        }),
        ...listAgeGroups.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'SUM',
                    sequelize.literal(`CASE WHEN tranche_age = '${String(item.value)}' THEN 1 ELSE 0 END`)
                ),
                `age_${item.label}`
            ]
        }),
    ];

    const totalVisits = await VisitModel.findAll({
        attributes: [
            ...totalAttributes,
        ],
        raw: true,
    });

    const allAttributes: string[] = [
        [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"] as ProjectionAlias,
        ...listGroupsFiltered.map((c) => c.value),
        ...listGenders.map(() => "genre"),
        ...listAgeGroups.map(() => "tranche_age"),
        ...listDepartments.map(() => "departement"),
    ];

    // Fetch all rows
    const allVisits = await VisitModel.findAll({
        attributes: [
            ...allAttributes
        ],
        raw: true
    });

    const pivotedRows = allVisits.map(row => {
        const pivoted: Record<string, number | string> = {};

        pivoted.date_passage = (row as any).date_passage;

        listGroups.forEach(item => {
            pivoted[item.label] = row[item.value] === 'oui' ? "oui" : "non";
        });

        listGenders.forEach(item => {
            pivoted[`genre_${item.label}`] = row.genre === item.value ? "oui" : "non";
        });

        listDepartments.forEach(item => {
            pivoted[`departement_${item.label}`] = row.departement === item.value ? "oui" : "non";
        });

        listAgeGroups.forEach(item => {
            pivoted[`age_${item.label}`] = String(row.tranche_age) === String(item.value) ? "oui" : "non";
        });

        return pivoted;
    });

    const listVisits = [
        ...totalVisits,
        ...pivotedRows,
    ]

    res.status(200).json({
        data: listVisits
    });
});

export default router;
