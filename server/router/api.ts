import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize from "#models/index.ts";
import VisitorModel from "#models/visitor.ts";
import config from "#config" with { type: "json" };

import { Visit } from "#types";

const router = express.Router();

router.get("/", async (req, res) => {
    let daySelected = DateTime.now();

    if (req.query.jour) {
        const tmpDate = DateTime.fromISO(req.query.jour as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const filtreParam = (req.query?.filtre || "jour") as string;

    const dictGroupType = {
        "jour": {
            "substitution": "%k",
            "luxon": "day",
            "property": "hour",
        },
        "semaine": {
            "substitution": "%u",
            "luxon": "week",
            "property": "weekday",
        },
        "mois": {
            "substitution": "%W",
            "luxon": "month",
            "property": "weekNumber",
        },
        "annee": {
            "substitution": "%m",
            "luxon": "year",
            "property": "month",
        },
    }

    const [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);
    const startTime = daySelected.startOf((dictGroupType as any)[filtreParam]?.luxon || "day").set({ hour: openHours });
    const endTime = daySelected.endOf((dictGroupType as any)[filtreParam]?.luxon || "day").set({ hour: closeHours });

    const listClosedDaysIndex = config.CLOSED_DAYS_INDEX.split(",").filter(Boolean).map(String);

    const listVisitors = await VisitorModel.findAll({
        raw: true,
        attributes: {
            include: [
                [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                [sequelize.fn("strftime", "%u", sequelize.col("date_passage"), "localtime"), "jour"],
                [sequelize.fn("strftime", (dictGroupType as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime"), "groupe"],
            ],
        },
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: startTime.toString(),
                    [Op.lte]: endTime.toString(),
                },
            },

        },
        order: [
            ['date_passage', 'DESC'],
        ]
    });

    const filteredVisits = listVisitors
        .filter((item) => {
            const visitHour = new Date(item.date_passage).getHours();

            return visitHour >= openHours && visitHour <= closeHours && !listClosedDaysIndex.includes(item.jour);
        })
        .map((item) => {
            delete item.jour;

            return item;
        });

    res.status(200).json({
        data: filteredVisits.map((item) => {
            return {
                ...item,
                groupe: filtreParam === "semaine" ? Number(item.groupe) : item.groupe.trim(),
            }
        })
    });
});

export default router;
