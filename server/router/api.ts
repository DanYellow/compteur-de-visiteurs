import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize from "#models/index.ts";
import config from "#config" with { type: "json" };

const { visit: VisitModel, place: PlaceModel } = sequelize.models;

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

    let place = undefined;
    if (req.query.lieu) {
        place = await PlaceModel.findOne({ where: { slug: req.query.lieu }})
    }

    const openingDaysSelector = sequelize.where(
        sequelize.fn("strftime", "%u", sequelize.col("date_passage"), "localtime"), {
            [Op.notIn]: config.CLOSED_DAYS_INDEX.split(",")
        }
    );

    const openingHoursSelector = sequelize.where(
        sequelize.cast(sequelize.fn("strftime", "%H", sequelize.col("date_passage"), "localtime"), "int"), {
            [Op.between]: [openHours, closeHours]
        }
    );

    const listVisitors = await VisitModel.findAll({
        raw: true,
        attributes: {
            include: [
                [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                [sequelize.fn("strftime", (dictGroupType as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime"), "groupe"],
            ],
            exclude: ["placeId"]
        },
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: startTime.toString(),
                    [Op.lte]: endTime.toString(),
                },
            },
            [Op.and]: [openingDaysSelector, openingHoursSelector],
            ...(place ? { lieu_id: place.id} : {})
        },
        order: [
            ['date_passage', 'DESC'],
        ]
    });

    res.status(200).json({
        data: listVisitors.map((item) => {
            return {
                ...item,
                // groupe: filtreParam === "semaine" ? Number(item.groupe) : item.groupe.trim(),
            }
        })
    });
});

export default router;
