import express from "express";
import { DateTime, Info } from "luxon";

import { capitalizeFirstLetter } from '#scripts/utils.shared';
import PlaceRouter from "#server/router/admin/place";
import EventRouter from "#server/router/admin/event";
import UserRouter from "#server/router/admin/user";
import VisitRouter from "#server/router/admin/visit";
import type { EventRaw, PlaceRaw } from "#types";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel, Event as EventModel } from "#models/index";
import { Op } from "sequelize";
import { getUser, requireRoleMiddleware } from "#server/middlewares";

import { DEFAULT_CLOSED_DAYS } from "#scripts/utils.shared";
import { computedPlaces } from "#server/utils.server";

const router = express.Router();

router.use("/", PlaceRouter);
router.use("/", EventRouter);
router.use("/", UserRouter);
router.use("/", VisitRouter);

router.get(["/", "/dashboard", "/tableau-de-bord"], getUser, requireRoleMiddleware("NUMIXS_LAB"), async (req, res) => {
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
    const listPlacesComputed = await computedPlaces(listPlaces);
    const placeSelected = req.query?.lieu || "tous";
    let place = undefined;

    if (placeSelected !== "tous") {
        place = (listPlaces.find((item) => item.slug === placeSelected))?.toJSON() as unknown as PlaceRaw
    }

    const listDaysClosed = place ? (place.regularOpening!.jours_fermeture || []) : DEFAULT_CLOSED_DAYS;

    let globalPlace = {}
    if (!place) {
        const openingHoursLimitsReq = await fetch(`${req.protocol}://${req.get('host')}/api/lieux`);
        const openingHoursLimitsRes = (await openingHoursLimitsReq.json()).data;

        globalPlace = {
            regularOpening: {
                heure_ouverture: openingHoursLimitsRes.heure_ouverture,
                heure_fermeture: openingHoursLimitsRes.heure_fermeture,
            },
            jours_fermeture: openingHoursLimitsRes.jours_fermeture,
            minutes_fermeture: openingHoursLimitsRes.heure_fermeture.split(":")[1],
        };
    }

    const listAllEvents = listPlaces.map((item) => item.listEvents).flat().map((item) => item.toJSON())

    const listEventsComputed: EventRaw[] = (placeSelected === "tous" ? listAllEvents : place!.listEvents).map((item) => {
        return {
            ...item,
            aujourdhui: String(item.date) === daySelected.toFormat("yyyy-LL-dd")
        } as EventRaw
    });

    res.render("pages/admin/dashboard.njk", {
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": listDaysClosed.includes(String(daySelected.weekday)),
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "list_places": listPlacesComputed,
        "list_events": listEventsComputed,
        "query_params": req.query,
        "place": {
            ...(place ? {
                ...place,
                jours_fermeture: listDaysClosed,
                minutes_fermeture: place.regularOpening!.heure_fermeture.split(":")[1],
            } : globalPlace)
        },
    });
})




export default router;
