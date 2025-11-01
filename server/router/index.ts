import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { stringify } from "csv-stringify/sync";
import { DateTime, DateTimeUnit } from "luxon";
import { Op, literal } from 'sequelize';

import { listBusinessSector } from "#scripts/utils.ts"
import { VisitorSchema } from "#scripts/schemas.ts";
import { wss } from "../index.ts";
import VisitorModel from "#models/visitor.ts";

import ApiRouter from "./api.ts";

const router = express.Router();

router.use("/api", ApiRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
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
            ...(listBusinessSector.map((item) => [literal(`COUNT (distinct "id") FILTER ( WHERE "${item.value}" = 'oui' )` ), item.value]))
        ]
    });

    res.render("pages/members-list.njk", {
        visitors_summary: visitorsSummary[0],
        "visitors_list": records,
        "list_business_sector": listBusinessSector,
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
    });
});

router.get('/visiteurs/telecharger', async (req, res) => {
    // let downloadedFileSuffix = "";

    // switch (Object.keys(req.query)[0]) {
    //     case "jour":

    //         break;

    //     default:
    //         break;
    // }

    const predicatesDict = {
        "jour": "day",
        "mois": "month",
        "annee": "year",
    }

    let filterPredicate:DateTimeUnit | undefined = undefined;
    let dateValue = null;
    const queryParam = Object.keys(predicatesDict).filter(value => Object.keys(req.query).includes(value));
    if (queryParam.length > 0) {
        filterPredicate = predicatesDict[queryParam[0]];
        dateValue = DateTime.fromISO(new Date(req.query[queryParam[0]]).toISOString())
    }

    const records = await VisitorModel.findAll({
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

    const values: (string|number)[][] = [Object.keys(VisitorModel.getAttributes())];
    const countVisitorType:Record<string, string | number> = {}
    values[0].forEach((key) => {
        countVisitorType[key] = 0;
    })

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
            date_passage: DateTime.fromISO(new Date(item.date_passage).toISOString()).toFormat("dd/LL/yyyy à HH:mm"),
        }

        listBusinessSector.map((business) => business.value).forEach((business) => {
            countVisitorType[business] += ((item[business] === "oui") ? 1 : 0) as number
        });

        values.push(Object.values(formattedItem));
    });

    const filePayload = values.toSpliced(1, 0, Object.values(countVisitorType));

    const timestamp = DateTime.now().toFormat("dd-LL-yyyy-HH'h'mm");
    const csvFile = path.join(__dirname, "..", "liste-membres.tmp.csv");

    fs.writeFileSync(csvFile, stringify(filePayload));
    res.download(csvFile, `${timestamp}-liste-membres.csv`, () => {
        fs.unlinkSync(csvFile);
    });
});

export default router;
