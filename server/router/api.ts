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

    let [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);
    const startTime = daySelected.startOf((dictGroupType as any)[filtreParam]?.luxon || "day").set({ hour: openHours });
    const endTime = daySelected.endOf((dictGroupType as any)[filtreParam]?.luxon || "day").set({ hour: closeHours });

    let place = undefined;
    if (req.query.lieu && req.query.lieu !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: req.query.lieu } })
    }

    const listVisits = await VisitModel.findAll({
        raw: true,
        attributes: {
            include: [
                [sequelize.literal("ROW_NUMBER() OVER (ORDER by date_passage ASC)"), "order"],
                [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                [sequelize.fn("strftime", (dictGroupType as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime"), "groupe"],
            ],
            exclude: ["groupe", "lieu_id"]
        },
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: startTime.toString(),
                    [Op.lte]: endTime.toString(),
                }
            },
            [Op.and]: [
                sequelize.literal(`
                            EXISTS (
                                SELECT 1
                                FROM json_each(place.jours_fermeture)
                                WHERE json_each.value != CAST( strftime('%u', visit.date_passage, 'localtime') AS text)
                            )
                        `),
                sequelize.where(
                    sequelize.fn("strftime", "%H", sequelize.col("date_passage"), "localtime"), {
                        [Op.between]: [sequelize.col("place.heure_ouverture"), sequelize.col("place.heure_fermeture")]
                    }
                ),
                sequelize.where(
                    sequelize.col("place.ouvert"), {
                        [Op.eq]: 1
                    }
                )
            ],
            ...(place ? { lieu_id: place.id } : {}),
        },
        include: [{
            model: PlaceModel,
            as: "place",
            attributes: {
                exclude: ["adresse", "slug", "id", "jours_fermeture", "heure_ouverture", "heure_fermeture", "date_creation"]
            },
        }],
        order: [
            ['date_passage', 'DESC'],
        ]
    });

    res.status(200).json({
        data: listVisits
    });
});

router.get("/lieux", async (req, res) => {
    const [listPlaces] = await sequelize.query(
    `
        SELECT
            json_group_array(value) as jours_fermeture,
            (SELECT MIN(heure_ouverture) FROM place WHERE ouvert = 1) as heure_ouverture,
            (SELECT MAX(heure_fermeture) FROM place WHERE ouvert = 1) as heure_fermeture
        FROM (
            SELECT json_each.value
            FROM place, json_each(place.jours_fermeture)
            GROUP BY json_each.value
            HAVING COUNT(DISTINCT place.id) = (SELECT COUNT(*) FROM place WHERE ouvert = 1)
        )
    `,
    {
        raw: true,
    })

    res.status(200).json({
        data: listPlaces[0]
    });
});

export default router;
