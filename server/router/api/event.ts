import express from "express";
import sequelize, { Place as PlaceModel, Visit as VisitModel, Event as EventModel } from "#models/index";
import { DateTime, Info } from "luxon";
import { Op } from 'sequelize';

import { PERIOD_PREDICATE } from "#server/router/api/index";
import type { EventRaw } from "#types";
import { capitalizeFirstLetter } from "#scripts/utils.shared";

const router = express.Router();

router.get("/evenements", async (req, res) => {
    try {
        let daySelected = DateTime.now();

        if (req.query.jour) {
            const tmpDate = DateTime.fromISO(req.query.jour as string);
            if (tmpDate.isValid) {
                daySelected = tmpDate;
            }
        }

        const filtreParam = (req.query?.filtre || "jour") as string;

        let groupQuery = [sequelize.fn("trim",
            sequelize.fn("strftime", (PERIOD_PREDICATE as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime")
        ), "groupe"]
        if (req.query.filtre === "mois") {
            groupQuery = [
                sequelize.literal("(strftime('%j', date(date_passage, '-3 days', 'weekday 4')) - 1) / 7 + 1") as any, 'groupe'
            ]
        }

        const startTime = daySelected.startOf((PERIOD_PREDICATE as any)[filtreParam]?.luxon || "day");
        const endTime = daySelected.endOf((PERIOD_PREDICATE as any)[filtreParam]?.luxon || "day");
        const table = EventModel.getTableName();
        const listEvents = await EventModel.findAll({
            attributes: {
                include: [
                    groupQuery,
                    [
                        sequelize.fn("strftime", "%H:%M", sequelize.fn('MIN', sequelize.col(`${table}.heure_ouverture`))),
                        'heure_ouverture'
                    ],
                    [
                        sequelize.fn("strftime", "%H:%M", sequelize.fn('MAX', sequelize.col(`${table}.heure_fermeture`))),
                        'heure_fermeture'
                    ],
                ],
                exclude: [
                    "id",
                    "date_creation",
                    "description",
                    "ouvert",
                    "groupe",
                ]
            },
            include: [
                {
                    model: PlaceModel,
                    as: 'listPlaces',
                    attributes: [],
                    required: true,
                    ...("lieu" in req.query && req.query.lieu !== "tous" ? {
                        where: {
                            slug: req.query.lieu,
                        }
                    } : {}),
                    through: {
                        attributes: [],
                    },
                    include: [{
                        model: VisitModel,
                        required: true,
                        as: 'listVisits',
                        attributes: [],
                    }]
                },
            ],
            where: {
                date: {
                    [Op.between]: [startTime.toString(), endTime.toString()],
                },
            },
            // group: [
            //     sequelize.fn('strftime', (PERIOD_PREDICATE as any)[filtreParam]?.substitution, sequelize.col(`${table}.date`)),
            // ],
            raw: true,
        });

        if (listEvents) {
            return res.status(200).json({
                data: listEvents
                    .filter((item) => {
                        return item.nom !== null
                    })
                    .map((item) => {
                        const listWeekDays = Info.weekdays('long', { locale: 'fr' });

                        return {
                            ...item,
                            jour: {
                                id: Number((item as unknown as EventRaw).groupe),
                                name: capitalizeFirstLetter(listWeekDays[Number((item as unknown as EventRaw).groupe) - 1] || ""),
                            }
                        }
                    })
            })
        }
        return res.status(404).json([])
    } catch (e) {
        console.log(e)
        return res.status(500).json([])
    }
});

router.get("/evenements/:event{/:place}", async (req, res) => {
    try {
        const table = EventModel.getTableName();
        const place = String(req.params.place || "");
        const event = await EventModel.findByPk(String(req.params.event), {
            include: [{
                model: PlaceModel,
                as: "listPlaces",
                attributes: {
                    exclude: ["adresse", "slug", "ouvert", "id", "description", "date_creation", "place_event.date_creation"]
                },
                through: {
                    attributes: [],
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
                            sequelize.fn('strftime', '%k', sequelize.col('date_passage'), "localtime")), 'groupe']]
                    }
                }]
            }]
        })

        if (event) {
            return res.status(200).json({
                data: event.toJSON()
            })
        }
        return res.status(404).json({})

    } catch (error) {
        console.log(error)
    }

    res.status(200).json({})
});

export default router;
