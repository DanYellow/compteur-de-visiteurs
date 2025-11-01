import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import VisitorModel from "#models/visitor.ts";

const router = express.Router();

router.get("/", async (req, res) => {
    const today = DateTime.now();

    const dictGroupType = {
        "heure": {
            "substitution": "%H",
            "luxon": "day",
            "property": "hour",
        },
        "jour": {
            "substitution": "%u",
            "luxon": "week",
            "property": "weekday",
        },
        "semaine": {
            "substitution": "%W",
            "luxon": "month",
            "property": "weekNumber",
        },
        "mois": {
            "substitution": "%m",
            "luxon": "year",
            "property": "month",
        },
    }

    const queryStringParam = (req.query?.filtre || "jour") as string;
    // const sqliteSubtitution = (dictGroupType as any)[queryStringParam]?.substitution || "%H";

    const listVisitors = await VisitorModel.findAll({
        raw: true,
        // attributes: [
        //     [literal(`*, STRFTIME('${sqliteSubtitution}', date_passage)`), queryStringParam]
        // ],
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: today.startOf((dictGroupType as any)[queryStringParam]?.luxon || "day").toString(),
                    [Op.lte]: today.endOf((dictGroupType as any)[queryStringParam]?.luxon || "day").toString(),
                }
            }
        }
    });

    res.status(200).json({
        data: listVisitors.map((item) => {
            const date = DateTime.fromISO(new Date(item.date_passage).toISOString());

            return {
                ...item,
                date_passage: date,
                [queryStringParam]: date[(dictGroupType as any)[queryStringParam]?.property],
            }
        })
    });
});

export default router;
