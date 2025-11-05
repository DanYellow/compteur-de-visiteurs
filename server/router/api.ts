import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize from "#models/index.ts";
import VisitorModel from "#models/visitor.ts";

import { Visit } from "#types";

const router = express.Router();

router.get("/", async (req, res) => {
    const today = DateTime.now();

    const dictGroupType = {
        "heure": {
            "substitution": "%k",
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

    const [openHours, closeHours] = (process.env.OPENING_HOURS || "10-19").split("-").map(Number);
    const startTime = today.startOf((dictGroupType as any)[queryStringParam]?.luxon || "day").set({ hour: openHours });
    const endTime = today.endOf((dictGroupType as any)[queryStringParam]?.luxon || "day").set({ hour: closeHours });
    // if (queryStringParam === "heure") {
    //     startTime = startTime;
    //     endTime = endTime;
    // }

    const listVisitors = await VisitorModel.findAll({
        raw: true,
        attributes: {
            include: [
                [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                [sequelize.fn("strftime", (dictGroupType as any)[queryStringParam]?.substitution, sequelize.col("date_passage"), "localtime"), "groupe"],
            ],
        },
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: startTime.toString(),
                    [Op.lte]: endTime.toString(),
                }
            }
        }
    });

    res.status(200).json({
        data: listVisitors.map((item) => {
            return {
                ...item,
                groupe: item.groupe.trim(),
            }
        })
    });
});

export default router;
