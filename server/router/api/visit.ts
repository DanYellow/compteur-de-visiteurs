
import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import sequelize, { Place as PlaceModel, RegularOpening as RegularOpeningModel, Visit as VisitModel, Event as EventModel } from "#models/index.ts";
import { PERIOD_PREDICATE } from "#server/router/api/index.ts";

const router = express.Router();

router.get("/visites", async (req, res) => {
    let daySelected = DateTime.now();

    if (req.query.jour) {
        const tmpDate = DateTime.fromISO(req.query.jour as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const filtreParam = (req.query?.filtre || "jour") as string;

    const startTime = daySelected.startOf((PERIOD_PREDICATE as any)[filtreParam]?.luxon || "day");
    const endTime = daySelected.endOf((PERIOD_PREDICATE as any)[filtreParam]?.luxon || "day");

    let place = undefined;
    if (req.query.lieu && req.query.lieu !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: String(req.query.lieu) } })
    }

    let groupQuery = [sequelize.fn("trim",
        sequelize.fn("strftime", (PERIOD_PREDICATE as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime")
    ), "groupe"]
    if (req.query.filtre === "mois") {
        groupQuery = [
            sequelize.literal("(strftime('%j', date(date_passage, '-3 days', 'weekday 4')) - 1) / 7 + 1") as any, 'groupe'
        ]
    }

    try {
        const eventTable = EventModel.getTableName();
        const visitTable = VisitModel.getTableName();

        const listVisits = await VisitModel.findAll({
            raw: true,
            attributes: {
                include: [
                    [sequelize.literal("ROW_NUMBER() OVER (ORDER by date_passage ASC)"), "order"],
                    [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"],
                    groupQuery,
                    [
                        sequelize.literal(`
                        COALESCE(
                            (
                                SELECT COALESCE(GROUP_CONCAT(DISTINCT so.nom), '')
                                FROM ${eventTable} AS so
                                INNER JOIN "place_event" f
                                    ON f.place_id = ${visitTable}.lieu_id
                                    AND f.event_id = so.id
                                WHERE strftime("%Y-%m-%d", so.date, 'localtime') = strftime("%Y-%m-%d", ${visitTable}.date_passage, 'localtime')
                                AND so.heure_ouverture <= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                                AND so.heure_fermeture >= strftime("%H:%M", ${visitTable}.date_passage, 'localtime')
                            ),
                            "/"
                        )`
                        ),
                        "liste_evenements"
                    ]
                ],
                exclude: ["lieu_id"]
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
                                            FROM ${eventTable} AS so
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
        res.status(500).json({
            data: []
        });
    }
});

export default router;
