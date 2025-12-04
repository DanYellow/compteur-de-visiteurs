import express from "express";
import { DateTime, Info } from "luxon";

import { capitalizeFirstLetter, listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import PlaceRouter from "#server/router/admin/place.ts";
import EventRouter from "#server/router/admin/event.ts";
import { CommonRegularOpening, EventRaw, PlaceRaw, VisitRaw } from "#types";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel, Event as EventModel } from "#models/index.ts";
import { Op } from "sequelize";
import { authenticateMiddleware } from "#server/middlewares.ts";

import { DEFAULT_CLOSED_DAYS, DEFAULT_OPEN_HOURS, DEFAULT_CLOSE_HOURS } from "#scripts/utils.shared.ts";

const router = express.Router();

router.use("/", PlaceRouter);
router.use("/", EventRouter);

router.get(["/dashboard"], authenticateMiddleware, async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.date) {
        const tmpDate = DateTime.fromISO(req.query.date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const startTime = daySelected.startOf("month").minus({ week: 1 });
    const endTime = daySelected.endOf("month").plus({ week: 1 });

    const listPlaces = await PlaceModel.findAll({
        nest: true,
        include: [
            {
                model: RegularOpeningModel,
                as: "regularOpening",
                required: true
            },
            {
                model: EventModel,
                as: "listEvents",
                attributes: {
                    include: ["nom", "heure_ouverture", "heure_fermeture"]
                },
                required: false,
                where: {
                    date: {
                        [Op.between]: [startTime.toString(), endTime.toString()],
                    }
                },
                through: {
                    attributes: [],
                },
            }
        ],
        order: [
            ['nom', 'ASC'],
        ],
    })
    const placeSelected = req.query?.lieu || "tous";
    let place = undefined;

    if (placeSelected !== "tous") {
        place = (listPlaces.find((item) => item.slug === placeSelected))?.toJSON() as unknown as PlaceRaw
    }

    const listDaysClosed = place ? (place.regularOpening!.jours_fermeture || []) : DEFAULT_CLOSED_DAYS;

    let globalPlace = {}
    if (!place) {
        const openingHoursLimitsReq = await fetch(`${req.protocol}://${req.get('host')}/api/lieux`);
        const openingHoursLimitsRes = (await openingHoursLimitsReq.json()).data
        globalPlace = {
            regularOpening: {
                heure_ouverture: openingHoursLimitsRes.heure_ouverture,
                heure_fermeture: openingHoursLimitsRes.heure_fermeture,
            },
            jours_fermeture: openingHoursLimitsRes.jours_fermeture,
            minutes_fermeture: openingHoursLimitsRes.heure_fermeture.split(":")[1],
        };
    }

    const listAllEvents = listPlaces.map((item) => (item as PlaceRaw).listEvents).flat().map((item) => item.toJSON())

    const listEventsComputed: EventRaw[] = (placeSelected === "tous" ? listAllEvents : place!.listEvents).map((item) => {
        return {
            ...item,
            aujourdhui: String(item.date) === daySelected.toFormat("yyyy-LL-dd")
        } as EventRaw
    });

    res.render("pages/dashboard.njk", {
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": listDaysClosed.includes(String(daySelected.weekday)),
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "list_places": listPlaces,
        "list_events": listEventsComputed,
        "place": {
            ...(place ? {
                ...place,
                jours_fermeture: listDaysClosed,
                minutes_fermeture: place.regularOpening!.heure_fermeture.split(":")[1],
            } : globalPlace)
        },
    });
})

router.get(["/visiteurs", "/visites"], authenticateMiddleware, async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.date) {
        const tmpDate = DateTime.fromISO(req.query.date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    let closedDays: string[] = DEFAULT_CLOSED_DAYS;

    const placeSelected = String(req.query?.lieu || "tous");
    let place = null;
    let regularOpening = {};
    let listAllEvents: EventModel[] = []

    const startTime = daySelected.startOf("month").minus({ week: 1 });
    const endTime = daySelected.endOf("month").plus({ week: 1 });

    if (placeSelected !== "tous") {
        place = await PlaceModel.findOne({
            where: { slug: placeSelected },
            include: [
                {
                    model: EventModel,
                    as: "listEvents",
                    attributes: {
                        include: ["nom", "heure_ouverture", "heure_fermeture"]
                    },
                    required: false,
                    where: {
                        date: {
                            [Op.between]: [startTime.toString(), endTime.toString()],
                        }
                    },
                    through: {
                        attributes: [],
                    },
                    include: [{
                        model: PlaceModel,
                        as: "listPlaces",
                        through: {
                            attributes: [],
                        },
                    }]
                }
            ],
            attributes: {
                exclude: ["date_creation", "place_id"]
            }
        })

        if (place) {
            let _regularOpening = await place.getRegularOpening();
            closedDays = (_regularOpening.jours_fermeture as string[]) || [];
            regularOpening = {
                ..._regularOpening.toJSON(),
                jours_fermeture: closedDays,
                jours_fermeture_litteral: Info.weekdays('long', { locale: 'fr' }).filter((_, idx) => closedDays.includes(String(idx + 1))),
            }
            place = place.toJSON() as PlaceRaw;
        }
    } else {
        const openingHoursLimitsReq = await fetch(`${req.protocol}://${req.get('host')}/api/lieux`);
        regularOpening = (await openingHoursLimitsReq.json()).data || { heure_ouverture: DEFAULT_OPEN_HOURS, heure_fermeture: DEFAULT_CLOSE_HOURS, jours_fermeture: DEFAULT_CLOSED_DAYS };
        closedDays = ((regularOpening as CommonRegularOpening).jours_fermeture as string[]) || [];

        listAllEvents = await EventModel.findAll({
            nest: true,
            where: {
                date: {
                    [Op.between]: [startTime.toString(), endTime.toString()],
                }
            },
            include: [{
                model: PlaceModel,
                as: "listPlaces",
                required: true,
                through: {
                    attributes: [],
                },
            }]
        });
    }

    const isClosedDay = closedDays.includes(String(daySelected.weekday));

    const listVisitsReq = await fetch(`${req.protocol}://${req.get('host')}/api?filtre=jour&jour=${daySelected.toFormat("yyyy-LL-dd")}&lieu=${placeSelected}`);
    const listVisits = (await listVisitsReq.json()).data || [];

    const listBusinessSectorSelectable = listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb));
    const listBusinessSectorKeys = listBusinessSectorSelectable.map((item) => item.value)

    const visitsSummary = Object.fromEntries(listBusinessSectorKeys.map((item) => [item, 0]))

    listVisits.forEach((visit: VisitRaw) => {
        listBusinessSectorKeys.forEach((business) => {
            visitsSummary[business] += visit[business] === "oui" ? 1 : 0
        });
    });

    const listPlaces = await PlaceModel.findAll({
        raw: true,
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        order: [
            ['nom', 'ASC'],
        ],
    })

    const listEventsComputed: EventRaw[] = (placeSelected === "tous" ? listAllEvents : place!.listEvents).map((item) => {
        return {
            ...(placeSelected === "tous" ? (item as EventModel).toJSON() : item),
            aujourdhui: String(item.date) === daySelected.toFormat("yyyy-LL-dd")
        } as EventRaw
    });

    res.render("pages/visits-list.njk", {
        visits_summary: visitsSummary,
        "visits_list": listVisits,
        "list_business_sector": listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)),
        "header_list": listVisits?.[0] ? Object.keys(listVisits[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": isClosedDay,
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "list_places": listPlaces,
        "list_events": listEventsComputed,
        "place": {
            jours_fermeture: DEFAULT_CLOSED_DAYS,
            ...(placeSelected !== "tous" ? { ...place!, ...regularOpening } : regularOpening),
        }
    });
});


export default router;
