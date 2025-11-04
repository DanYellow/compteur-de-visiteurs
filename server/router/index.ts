import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { stringify } from "csv-stringify/sync";
import { DateTime, DateTimeUnit, Info } from "luxon";
import { Op, literal, fn, col } from 'sequelize';

import { listBusinessSector } from "#scripts/utils.ts";
import { VisitorSchema } from "#scripts/schemas.ts";
import { wss } from "../index.ts";
import VisitorModel from "#models/visitor.ts";
import sequelize from "#models/index.ts";

import ApiRouter from "./api.ts";

const router = express.Router();

router.use("/api", ApiRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector.filter((item) => (!("listInChoices" in item) || item.listInChoices)),
    });
});

router.post("/", async (req, res) => {
    const validator = VisitorSchema.safeParse(req.body);
    if (!validator.success) {
        res.status(500).json({ "success": false })
    }

    try {
        const payload = {
            ...req.body,
            lieu: res.locals.PLACE,
        }

        await VisitorModel.create(payload);
        await new Promise(r => setTimeout(r, 1500));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: "VISITOR_REGISTERED", payload: req.body }));
            }
        });

        res.status(200).json({ "success": true })
    } catch (err) {
        console.log(err)
        res.status(500).json({ "success": false })
    }
});

router.get(["/dashboard"], async (req, res) => {
    res.render("pages/dashboard.njk");
})

router.get(["/visiteurs", "/liste-visiteurs", "/visites"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const records = await VisitorModel.findAll({
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").toString(),
                    [Op.lte]: daySelected.endOf("day").toString(),
                }
            }
        },
        order: [['date_passage', 'DESC']]
    });

    const visitorsSummary = await VisitorModel.findAll({
        raw: true,
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").toString(),
                    [Op.lte]: daySelected.endOf("day").toString(),
                }
            }
        },
        attributes: [
            ...(listBusinessSector.map((item) => [literal(`COUNT (distinct "id") FILTER (WHERE "${item.value}" = 'oui')`), item.value]))
        ]
    });

    res.render("pages/members-list.njk", {
        visitors_summary: visitorsSummary[0],
        "visitors_list": records,
        "list_business_sector": listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)),
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
    });
});

router.get('/visiteurs/telecharger', async (req, res) => {
    const predicatesDict: Record<string, string> = {
        "jour": "day",
        "semaine": "week",
        "mois": "month",
        "annee": "year",
    }

    let filterPredicate: DateTimeUnit | undefined = undefined;
    let dateValue = DateTime.now();

    const queryParam = Object.keys(predicatesDict).filter(value => Object.keys(req.query).includes(value));
    const isGrouped = "groupe" in req.query;

    if (queryParam.length > 0) {
        filterPredicate = predicatesDict[queryParam[0]] as DateTimeUnit;
        if (req.query[queryParam[0]]) {
            dateValue = DateTime.fromISO(new Date(req.query[queryParam[0]]).toISOString())
        }
    }

    let records = [];
    if ("groupe" in req.query) {
        const groupFilter: Record<string, string> = {
            "jour": "%H",
            "semaine": "%u",
            "mois": "%W",
            "annee": "%m",
        };

        records = await VisitorModel.findAll({
            raw: true,
            group: "groupe",
            attributes: [
                [sequelize.col("date_passage"), queryParam[0] || "date_passage"],
                // "date_passage",
                [sequelize.fn("strftime", groupFilter[queryParam[0]] || "%m", sequelize.col("date_passage"), "localtime"), "groupe"],
                ...(listBusinessSector.map((item) => [literal(`COUNT (distinct "id") FILTER (WHERE "${item.value}" = 'oui')`), item.value])),
                [literal(`COUNT (distinct "id")`), "total"],
            ],
            ...((filterPredicate !== undefined && dateValue !== null && dateValue.isValid) ? {
                where: {
                    date_passage: {
                        [Op.and]: {
                            [Op.gte]: dateValue.startOf(filterPredicate).toString(),
                            [Op.lte]: dateValue.endOf(filterPredicate).toString(),
                        }
                    }
                }
            } : {})
        });
    } else {
        records = await VisitorModel.findAll({
            raw: true,
            ...((filterPredicate !== undefined && dateValue !== null && dateValue.isValid) ? {
                where: {
                    date_passage: {
                        [Op.and]: {
                            [Op.gte]: dateValue.startOf(filterPredicate).toString(),
                            [Op.lte]: dateValue.endOf(filterPredicate).toString(),
                        }
                    }
                }
            } : {})
        });
    }

    console.log(records)
    return;

    const values: (string | number)[][] = "groupe" in req.query ? [Object.keys(records[0])] : [Object.keys(VisitorModel.getAttributes())];
    const countVisitorType: Record<string, string | number> = {}
    values[0].forEach((key) => {
        countVisitorType[key] = 0;
    })
    // console.log(countVisitorType)

    if ("groupe" in req.query) {
        countVisitorType.groupe = "Total";

        records.forEach((item, index) => {
            const formattedItem = {
                ...item,
                date_passage: Info.weekdays('long', {locale: 'fr' })[Number(item.groupe) - 1]
                // date_passage: DateTime.fromISO(new Date(item.date_passage).toISOString()).toFormat("dd/LL/yyyy à HH:mm"),
            }

            values.push(Object.values(formattedItem));
        });
    } else {
        countVisitorType.id = "Total";
        countVisitorType.date_passage = "Tout";
        if (filterPredicate !== undefined && dateValue !== null && dateValue.isValid) {
            countVisitorType.date_passage = `${dateValue.startOf(filterPredicate).toFormat("dd/LL/yyyy")} ➜ ${dateValue.endOf(filterPredicate).toFormat("dd/LL/yyyy")}`;
        } else {
            countVisitorType.date_passage = "Tous";
        }
        countVisitorType.lieu = res.locals.PLACE;

        records.forEach((item, index) => {
            const formattedItem = {
                ...item,
                id: index + 1,
                // date_passage: DateTime.fromISO(new Date(item.date_passage).toISOString()).toFormat("dd/LL/yyyy à HH:mm"),
            }

            listBusinessSector.map((business) => business.value).forEach((business) => {
                countVisitorType[business] += ((item[business] === "oui") ? 1 : 0) as number
            });

            values.push(Object.values(formattedItem));
        });
    }


    // console.log(records);
    // console.log(values);
    // return;

    const filePayload = values.toSpliced(1, 0, Object.values(countVisitorType));

    const timestamp = DateTime.now().toFormat("dd-LL-yyyy-HH'h'mm");
    const csvFile = path.join(__dirname, "..", "liste-membres.tmp.csv");

    fs.writeFileSync(csvFile, stringify(filePayload));
    res.download(csvFile, `${timestamp}-liste-membres.csv`, () => {
        fs.unlinkSync(csvFile);
    });

    // res.status(200).json({ "success": "Téléchargement réussi" })
});

export default router;
