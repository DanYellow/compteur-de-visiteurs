import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize from "#models/index.ts";

import { Place as PlaceModel, RegularOpening as RegularOpeningModel, Visit as VisitModel } from "#models/index.ts";

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

    const startTime = daySelected.startOf((dictGroupType as any)[filtreParam]?.luxon || "day");
    const endTime = daySelected.endOf((dictGroupType as any)[filtreParam]?.luxon || "day");

    let place = undefined;
    if (req.query.lieu && req.query.lieu !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: req.query.lieu } })
    }

    try {
        const listVisits = await VisitModel.findAll({
            raw: true,
            logging: console.log,
            attributes: {
                include: [
                    [sequelize.literal("ROW_NUMBER() OVER (ORDER by date_passage ASC)"), "order"],
                    [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                    [sequelize.fn("trim",
                        sequelize.fn("strftime", (dictGroupType as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime")
                    ), "groupe"],
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
                                FROM json_each("place->regularOpening"."jours_fermeture")
                                WHERE json_each.value != CAST( strftime('%u', visit.date_passage, 'localtime') AS text)
                            )
                        `),
                    sequelize.where(
                        sequelize.fn("strftime", "%H:%M", sequelize.col("date_passage"), "localtime"), {
                        [Op.between]: [sequelize.col("place.regularOpening.heure_ouverture"), sequelize.col("place.regularOpening.heure_fermeture")]
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
                required: true,
                attributes: {
                    exclude: ["adresse", "slug", "ouvert", "id", "jours_fermeture", "heure_ouverture", "heure_fermeture", "date_creation"]
                },
                include: [
                    {
                        model: RegularOpeningModel,
                        as: "regularOpening",
                        required: true,
                        // attributes: {
                        //     exclude: ["adresse", "slug", "ouvert", "id", "jours_fermeture", "heure_ouverture", "heure_fermeture", "date_creation"]
                        // },
                    }
                ]
            }],
            order: [
                ['date_passage', 'DESC'],
            ]
        });

        res.status(200).json({
            data: listVisits
        });
    } catch (e) {
        console.log("e", e)
    }

});

router.get("/lieux", async (req, res) => {
    try {
        const [listPlaces] = await sequelize.query(
            `
        SELECT
            json_group_array(value) AS jours_fermeture,
            (
                SELECT MIN(rh.heure_ouverture)
                FROM place p
                JOIN regular_opening rh ON rh.place_id = p.id
                WHERE p.ouvert = 1
            ) AS heure_ouverture,
            (
                SELECT MAX(rh.heure_fermeture)
                FROM place p
                JOIN regular_opening rh ON rh.place_id = p.id
                WHERE p.ouvert = 1
            ) AS heure_fermeture
        FROM (
            SELECT json_each.value
            FROM place
            JOIN regular_opening ON regular_opening.place_id = place.id,
                json_each(regular_opening.jours_fermeture)
            WHERE place.ouvert = 1
            GROUP BY json_each.value
            HAVING COUNT(DISTINCT place.id) = (
                SELECT COUNT(*)
                FROM place
                JOIN regular_opening ON regular_opening.place_id = place.id
                WHERE place.ouvert = 1
            )
        )
    `,
            {
                raw: true,
            })

        res.status(200).json({
            data: listPlaces[0]
        });
    } catch (e) {
        console.log("e", e)
        res.status(500).json({
            data: []
        });
    }
});



export default router;
