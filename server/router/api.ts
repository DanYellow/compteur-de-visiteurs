import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize, { Place as PlaceModel, RegularOpening as RegularOpeningModel, Visit as VisitModel, SpecialOpening as SpecialOpeningModel } from "#models/index.ts";
import { CommonRegularOpening } from "#types";
import { DEFAULT_CLOSED_DAYS } from "./admin";

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
        place = await PlaceModel.findOne({ where: { slug: String(req.query.lieu) } })
    }

    try {
        const specialOpeningTable = SpecialOpeningModel.getTableName();
        const visitTable = VisitModel.getTableName();
        const listVisits = await VisitModel.findAll({
            raw: true,
            attributes: {
                include: [
                    [sequelize.literal("ROW_NUMBER() OVER (ORDER by date_passage ASC)"), "order"],
                    [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                    [sequelize.fn("trim",
                        sequelize.fn("strftime", (dictGroupType as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime")
                    ), "groupe"],
                    [
                        sequelize.literal(`
                        COALESCE(
                            (
                                SELECT GROUP_CONCAT(so.nom)
                                FROM ${specialOpeningTable} AS so
                                WHERE strftime("%Y-%m-%d", so.date, 'localtime') = "${daySelected.toFormat("yyyy-LL-dd")}"
                                AND so.heure_ouverture <= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                                AND so.heure_fermeture >= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                            ),
                            "/"
                        )`
                        ),
                        "liste_evenements"
                    ]
                ],
                exclude: ["groupe", "lieu_id"]
            },
            where: {
                [Op.and]: [
                    sequelize.literal(`
                        json_array_length("place->regularOpening"."jours_fermeture") = 0
                        OR EXISTS (
                            SELECT 1
                            FROM json_each("place->regularOpening"."jours_fermeture")
                            WHERE json_each.value != CAST( strftime('%u', visit.date_passage, 'localtime') AS text)
                        )
                    `),
                    sequelize.where(
                        sequelize.col("place.ouvert"), {
                        [Op.eq]: 1
                    })
                    ,
                    {
                        date_passage: {
                            [Op.and]: [
                                {
                                    [Op.between]: [startTime.toString(), endTime.toString()]
                                }, {
                                    [Op.or]: [
                                        sequelize.literal(`(
                                            SELECT 1
                                            FROM regular_opening AS p
                                            WHERE p.heure_ouverture <= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                                            AND p.heure_fermeture >= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                                        )`),
                                        sequelize.literal(`(
                                            SELECT 1
                                            FROM ${specialOpeningTable} AS so
                                            WHERE so.date = strftime("%Y-%m-%d", ${visitTable}.date_passage, 'localtime')
                                            AND so.heure_ouverture <= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                                            AND so.heure_fermeture >= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                                        )`)
                                    ]
                                }
                            ]
                        }
                    }
                ],
                ...(place ? { lieu_id: place.id } : {}),
            },
            include: [{
                model: PlaceModel,
                as: "place",
                required: true,
                attributes: {
                    exclude: ["adresse", "slug", "ouvert", "id", "description", "date_creation"]
                },
                include: [
                    {
                        model: RegularOpeningModel,
                        as: "regularOpening",
                        required: true,
                        attributes: {
                            exclude: [
                                "id",
                                "jours_fermeture",
                                "heure_fermeture",
                                "place_id",
                                "heure_ouverture",
                            ]
                        },
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
        console.log("error", e)
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

        const commonRegularOpening = listPlaces[0] as CommonRegularOpening;

        res.status(200).json({
            data: {
                heure_ouverture: commonRegularOpening.heure_ouverture || "10:00:00",
                heure_fermeture: commonRegularOpening.heure_fermeture || "19:30:00",
                jours_fermeture: JSON.parse(commonRegularOpening.jours_fermeture as string)
            }
        });
    } catch (e) {
        console.log("error 22", e)
        res.status(500).json({
            data: {
                heure_ouverture: "10:00:00",
                heure_fermeture: "19:30:00",
                jours_fermeture: DEFAULT_CLOSED_DAYS,
            }
        });
    }
});

router.get("/jour-exceptionnel/:special_opening{/:place}", async (req, res) => {
    try {
        const table = SpecialOpeningModel.getTableName();
        const place = String(req.params.place || "");
        const specialOpening = await SpecialOpeningModel.findByPk(String(req.params.special_opening), {
            include: [{
                model: PlaceModel,
                as: "listPlaces",
                attributes: {
                    exclude: ["adresse", "slug", "ouvert", "id", "description", "date_creation", "place_special-opening.date_creation"]
                },
                ...(place ? { where: { id: place } } : {}),
                include: [{
                    model: VisitModel,
                    as: "listVisits",
                    required: false,
                    where: {
                        [Op.and]: [
                            sequelize.where(
                                sequelize.fn("strftime", "%H:%M", sequelize.col("date_passage"), "localtime"), {
                                [Op.between]: [sequelize.col(`${table}.heure_ouverture`), sequelize.col(`${table}.heure_fermeture`)]
                            }
                            ),
                            sequelize.where(
                                sequelize.fn("strftime", "%Y-%m-%d", sequelize.col("date_passage"), "localtime"), {
                                [Op.eq]: sequelize.col(`${table}.date`)
                            }
                            )
                        ]
                    },
                    attributes: {
                        exclude: ["lieu_id"],
                        include: [[sequelize.fn("trim",
                            sequelize.fn('strftime', '%H', sequelize.col('date_passage'), "localtime")), 'groupe']]
                    }
                }]
            }]
        })

        if (specialOpening) {
            return res.status(200).json({
                data: specialOpening.toJSON()
            })
        }
        return res.status(404).json({})

    } catch (error) {
        console.log(error)
    }

    res.status(200).json({})
})

export default router;
