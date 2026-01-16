
import express from "express";
import { DateTime } from "luxon";
import { Op, type ProjectionAlias, type WhereOptions } from 'sequelize';

import sequelize, { Place as PlaceModel, RegularOpening as RegularOpeningModel, Visit as VisitModel, Event as EventModel, VisitRegistered as VisitRegisteredModel } from "#models/index";
import { PERIOD_PREDICATE } from "#server/router/api/index";
import { listAgeGroups, listDepartments, listGenders, listGroups, NB_ITEMS_PER_PAGE } from "#scripts/utils.shared";
import { VisitCodeSchema } from "#scripts/schemas/index";

const router = express.Router();

const getLinearVisits = async (query: ProjectionAlias, place: PlaceModel | null, period: { startTime: DateTime, endTime: DateTime }, page?: number) => {
    const eventTable = EventModel.getTableName();
    const visitTable = VisitModel.getTableName();
    const placeTable = PlaceModel.getTableName();

    const whereConditions: WhereOptions<VisitModel>[] = [
        {
            date_passage: {
                [Op.between]: [period.startTime.toString(), period.endTime.toString()]
            }
        },
        sequelize.literal(`
        (
            (
            -- REGULAR OPENING RULES
            (
                json_array_length("place->regularOpening"."jours_fermeture") = 0
                OR NOT EXISTS (
                SELECT 1
                FROM json_each("place->regularOpening"."jours_fermeture")
                WHERE json_each.value = CAST(strftime('%u', ${visitTable}.date_passage, 'localtime') AS text)
                )
            )
            AND EXISTS (
                SELECT 1
                FROM regular_opening AS p
                WHERE p.place_id = ${visitTable}.lieu_id
                AND p.heure_ouverture <= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                AND p.heure_fermeture >= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
            )
            )
            OR
            (
            -- EVENT OVERRIDE
                EXISTS (
                    SELECT 1
                    FROM ${eventTable} AS so
                    INNER JOIN place_event pe ON pe.event_id = so.id
                    WHERE pe.place_id = ${visitTable}.lieu_id
                    AND so.date = strftime('%Y-%m-%d', ${visitTable}.date_passage, 'localtime')
                    AND so.heure_ouverture <= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                    AND so.heure_fermeture >= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                )
            )
        )
    `)
    ];
    if (place) {
        whereConditions.push({ lieu_id: place.id });
    }

    const listVisits = await VisitModel.findAndCountAll({
        raw: true,
        attributes: {
            include: [
                [sequelize.literal("ROW_NUMBER() OVER (ORDER by date_passage ASC)"), "order"] as ProjectionAlias,
                // [sequelize.literal(`strftime('%u', ${visitTable}.date_passage, 'localtime')`), "ff"],
                [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"] as ProjectionAlias,
                query,
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
                ] as ProjectionAlias,
                [sequelize.literal(`${placeTable}.nom`), 'lieu'],
            ],
            exclude: ["lieu_id"]
        },
        ...(page ? {
            offset: NB_ITEMS_PER_PAGE * Math.max(0, page - 1),
            limit: NB_ITEMS_PER_PAGE
        }: {}),
        where: {
            [Op.and]: whereConditions,
        },
        include: [{
            model: PlaceModel,
            as: "place",
            required: true,
            attributes: [],
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

    return listVisits;
}

const getPivotVisits = async (place: PlaceModel | null, period: { startTime: DateTime, endTime: DateTime }, eventId?: string) => {
    const eventTable = EventModel.getTableName();
    const visitTable = VisitModel.getTableName();
    const placeTable = PlaceModel.getTableName();
    const listGroupsFiltered = listGroups.filter((item) => (!("listInDb" in item) || item.listInDb));

    const totalAttributes: ProjectionAlias[] = [
        [
            sequelize.literal(`'Total: ' || COUNT(*)`),
            "id"
        ],
        [sequelize.literal(`'${period.startTime.toFormat("dd/LL/yyyy")} ➜ ${period.endTime.toFormat("dd/LL/yyyy")}'`), 'date_passage'],
        [sequelize.literal(place ? `${placeTable}.nom` : `'Tous'`), 'lieu'],
        [
            sequelize.literal(eventId ? `(SELECT nom FROM ${eventTable} LIMIT 1)` : `'Tous'`),
            "Évènement(s)"
        ],
        ...listGroupsFiltered.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'COALESCE',
                    sequelize.fn(
                        'SUM',
                        sequelize.literal(`CASE WHEN ${String(item.value)} = 'oui' THEN 1 ELSE 0 END`)
                    ),
                    0
                ),
                item.label
            ]
        }),
        ...listGenders.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'COALESCE',
                    sequelize.fn(
                        'SUM',
                        sequelize.literal(`CASE WHEN genre = '${String(item.value)}' THEN 1 ELSE 0 END`)
                    ),
                    0
                ),
                `genre_${item.label}`
            ]
        }),
        ...listDepartments.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'COALESCE',
                    sequelize.fn(
                        'SUM',
                        sequelize.literal(`CASE WHEN departement = '${String(item.value)}' THEN 1 ELSE 0 END`)
                    ),
                    0
                ),
                `departement_${item.label}`
            ]
        }),
        ...listAgeGroups.map((item): ProjectionAlias => {
            return [
                sequelize.fn(
                    'COALESCE',
                    sequelize.fn(
                        'SUM',
                        sequelize.literal(`CASE WHEN tranche_age = '${String(item.value)}' THEN 1 ELSE 0 END`)
                    ),
                    0
                ),
                `age_${item.label}`
            ]
        }),
    ];

    let subQuery = `
        (
            (
            -- REGULAR OPENING RULES
            (
                json_array_length("place->regularOpening"."jours_fermeture") = 0
                OR NOT EXISTS (
                SELECT 1
                FROM json_each("place->regularOpening"."jours_fermeture")
                WHERE json_each.value = CAST(strftime('%u', ${visitTable}.date_passage, 'localtime') AS text)
                )
            )
            AND EXISTS (
                SELECT 1
                FROM regular_opening AS p
                WHERE p.place_id = ${visitTable}.lieu_id
                AND p.heure_ouverture <= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                AND p.heure_fermeture >= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
            )
            )
            OR
            (
            -- EVENT OVERRIDE
                EXISTS (
                    SELECT 1
                    FROM ${eventTable} AS so
                    INNER JOIN place_event pe ON pe.event_id = so.id
                    WHERE pe.place_id = ${visitTable}.lieu_id
                    AND so.date = strftime('%Y-%m-%d', ${visitTable}.date_passage, 'localtime')
                    AND so.heure_ouverture <= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                    AND so.heure_fermeture >= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                )
            )
        )
    `

    if (eventId) {
        subQuery = ` (
            SELECT 1
                FROM ${eventTable} AS evt
                JOIN place_event pe
                    ON pe.event_id = evt.id
                WHERE evt.id = ${eventId}
                    AND evt.date = strftime('%Y-%m-%d', ${visitTable}.date_passage, 'localtime')
                    AND evt.heure_ouverture <= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
                    AND evt.heure_fermeture >= strftime('%H:%M', ${visitTable}.date_passage, 'localtime')
        )
    `
    }

    const whereConditions: WhereOptions<VisitModel>[] = [sequelize.literal(subQuery)];
    if (place) {
        whereConditions.push({ lieu_id: place.id });
    }

    if (!eventId) {
        whereConditions.push({
            date_passage: {
                [Op.between]: [
                    period.startTime.toString(),
                    period.endTime.toString(),
                ],
            },
        });
    }

    const totalVisits = await VisitModel.findAll({
        attributes: [
            ...totalAttributes,
        ],
        where: {
            [Op.and]: whereConditions
        },
        include: [{
            model: PlaceModel,
            as: "place",
            required: true,
            attributes: [],
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
        raw: true,
        order: [
            ['date_passage', 'DESC'],
        ]
    });

    const allAttributes: (string | [string, string] | ProjectionAlias)[] = [
        [sequelize.fn("datetime", sequelize.col("date_passage"), "localtime"), "date_passage"] as ProjectionAlias,
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
            "Évènement(s)"
        ],
        ...listGroupsFiltered.map((c) => c.value),
        ...listGenders.map(() => "genre"),
        ...listAgeGroups.map(() => "tranche_age"),
        ...listDepartments.map(() => "departement"),
    ];

    const allVisits = await VisitModel.findAll({
        attributes: [
            ...allAttributes,
            [sequelize.literal(`${placeTable}.nom`), 'lieu'],
        ],
        where: {
            [Op.and]: whereConditions
        },
        include: [{
            model: PlaceModel,
            as: "place",
            required: true,
            attributes: [],
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
        ],
        raw: true
    }) as VisitModel[];

    const pivotedRows = allVisits.map((row, idx) => {
        const pivoted: Record<string, number | string> = {};

        pivoted.id = idx + 1;
        pivoted.date_passage = (row as any).date_passage;
        pivoted.lieu = (row as any).lieu;
        pivoted["Évènement(s)"] = (row as any)["Évènement(s)"];

        listGroupsFiltered.forEach((item) => {
            pivoted[item.label] = (row as any)[item.value] === 'oui' ? "oui" : "non";
        });

        listGenders.forEach(item => {
            pivoted[`genre_${item.label}`] = row.genre === item.value ? "oui" : "non";
        });

        listDepartments.forEach(item => {
            pivoted[`departement_${item.label}`] = row.departement === item.value ? "oui" : "non";
        });

        listAgeGroups.forEach(item => {
            pivoted[`age_${item.label}`] = String(row.tranche_age) === String(item.value) ? "oui" : "non";
        });

        return pivoted;
    });

    const listVisits = [
        ...totalVisits,
        ...pivotedRows,
    ]

    return listVisits;
}

router.get("/visites", async (req, res) => {
    let daySelected = DateTime.now();

    if (req.query.jour) {
        const tmpDate = DateTime.fromISO(String(req.query.jour));
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    } else if (!("jour" in req.query) && "evenement" in req.query) {
        const event = await EventModel.findByPk(String(req.query.evenement));
        const tmpDate = DateTime.fromISO(String(event?.date));
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const filtreParam = (req.query?.filtre || "jour") as string;

    const startTime = daySelected.startOf((PERIOD_PREDICATE as any)[filtreParam]?.luxon || "day");
    const endTime = daySelected.endOf((PERIOD_PREDICATE as any)[filtreParam]?.luxon || "day");

    let place: PlaceModel | null = null;
    if (req.query.lieu && req.query.lieu !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: String(req.query.lieu) } })
    }

    let groupQuery: ProjectionAlias | undefined = [sequelize.fn("trim",
        sequelize.fn("strftime", (PERIOD_PREDICATE as any)[filtreParam]?.substitution, sequelize.col("date_passage"), "localtime")
    ), "groupe"]
    if (req.query.filtre === "mois") {
        groupQuery = [
            sequelize.literal("(strftime('%j', date(date_passage, '-3 days', 'weekday 4')) - 1) / 7 + 1") as any, 'groupe'
        ]
    }

    try {
        let listVisits = [];
        type PaginationType = {
            total?: number;
            total_pages?: number;
            current_page?: number;
            per_page?: number;
            has_prev?: boolean;
            has_next?: boolean;
        }
        const pagination: PaginationType = {};

        if ("pivot" in req.query) {
            listVisits = await getPivotVisits(place, { startTime, endTime })
        } else if ("evenement" in req.query) {
            listVisits = await getPivotVisits(place, { startTime, endTime }, String(req.query.evenement))
        } else {
            const currentPage = req.query?.page ? Number(req.query.page) : undefined;
            const {rows, count} = await getLinearVisits(groupQuery, place, { startTime, endTime }, currentPage)
            listVisits = rows;

            pagination.total = count;
            pagination.total_pages = Math.ceil(count / NB_ITEMS_PER_PAGE);
            if (currentPage) {
                pagination.current_page = currentPage;
                pagination.per_page = NB_ITEMS_PER_PAGE;
                pagination.has_prev = currentPage > 1;
                pagination.has_next = currentPage * NB_ITEMS_PER_PAGE < count;
            }
        }

        res.status(200).json({
            data: listVisits,
            pagination,
        });
    } catch (e) {
        console.log("error", e)
        res.status(500).json({
            data: []
        });
    }
});

router.get("/visite{/:code}", async (req, res) => {
    const validator = VisitCodeSchema.safeParse(req.params);
    if (!validator.success) {
        return res.status(500).json({ error: "Invalid code" });
    }

    const entry = await VisitRegisteredModel.findByPk(req.params.code!.toUpperCase());
    if (!entry) {
        return res.status(404).json({ error: "Invalid code" });
    }

    return res.json(entry.toJSON());
})

export default router;
