import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize from "#models/index.ts";
import VisitorModel from "#models/visitor.ts";
import config from "#config" with { type: "json" };

import { Visit } from "#types";

const router = express.Router();

router.get("/", async (req, res) => {
    const today = DateTime.now();

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

    const queryStringParam = (req.query?.filtre || "jour") as string;

    const [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);
    const startTime = today.startOf((dictGroupType as any)[queryStringParam]?.luxon || "day").set({ hour: openHours });
    const endTime = today.endOf((dictGroupType as any)[queryStringParam]?.luxon || "day").set({ hour: closeHours });

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
        },
        order: [
            ['date_passage', 'DESC'],
        ]
    });

    const filteredVisits = listVisitors
        .filter((item) => {
            const visitHour = new Date(item.date_passage).getHours();
            return visitHour >= openHours && visitHour <= closeHours;
        });

    res.status(200).json({
        data: filteredVisits.map((item) => {
            return {
                ...item,
                groupe: queryStringParam === "semaine" ? Number(item.groupe) + 0 : item.groupe.trim(),
            }
        })
    });
});

export default router;
