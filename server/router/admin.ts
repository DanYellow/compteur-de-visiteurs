import express from "express";
import { DateTime, Info } from "luxon";

import { capitalizeFirstLetter, listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import PlaceRouter from "#server/router/admin/places.ts";
import { Visit } from "#types";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel } from "#models/index.ts";

export const DEFAULT_CLOSED_DAYS = ["1", "6", "7"];
const router = express.Router();

router.use("/", PlaceRouter);

router.get(["/dashboard"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.date) {
        const tmpDate = DateTime.fromISO(req.query.date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const listPlaces = await PlaceModel.findAll({
        raw: true,
    })

    const placeSelected = req.query?.lieu || "tous";
    let place = undefined;

    if (placeSelected !== "tous") {
        place = listPlaces.find((item) => item.slug === placeSelected)
    }

    const listDaysClosed = place ? (place.jours_fermeture || []) : DEFAULT_CLOSED_DAYS;

    res.render("pages/dashboard.njk", {
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": listDaysClosed.includes(String(daySelected.weekday)),
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "places_list": listPlaces,
        "place": place,
    });
})

router.get(["/visiteurs", "/liste-visiteurs", "/visites"], async (req, res) => {
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
    let regularOpening ={};

    if (placeSelected !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: placeSelected } })
        if (place) {
            let _regularOpening = await place.getRegularOpening();
            closedDays = (_regularOpening.jours_fermeture as string[]) || [];
            regularOpening = {
                ..._regularOpening.toJSON(),
                jours_fermeture: Info.weekdays('long', { locale: 'fr' }).filter((_, idx) => closedDays.includes(String(idx)))
            }
        }
    } else {
        const openingHoursLimitsReq = await fetch(`${req.protocol}://${req.get('host')}/api/lieux`);
        place = (await openingHoursLimitsReq.json()).data || { min: 8, max: 20, jours_fermeture: DEFAULT_CLOSED_DAYS };
        closedDays = place.jours_fermeture || [];
    }

    const isClosedDay = closedDays.includes(String(daySelected.weekday));

    const listVisitsReq = await fetch(`${req.protocol}://${req.get('host')}/api?filtre=jour&jour=${daySelected.toFormat("yyyy-LL-dd")}&lieu=${placeSelected}`);
    const listVisits = (await listVisitsReq.json()).data || [];

    const listBusinessSectorSelectable = listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb));
    const listBusinessSectorKeys = listBusinessSectorSelectable.map((item) => item.value)

    const visitorsSummary = Object.fromEntries(listBusinessSectorKeys.map((item) => [item, 0]))

    listVisits.forEach((visit: Visit) => {
        listBusinessSectorKeys.forEach((business) => {
            visitorsSummary[business] += visit[business] === "oui" ? 1 : 0
        });
    });

    const listPlaces = await PlaceModel.findAll({
        raw: true,
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        order: [
            ['nom', 'ASC'],
        ],
    })

    res.render("pages/members-list.njk", {
        visitors_summary: visitorsSummary,
        "visitors_list": listVisits,
        "list_business_sector": listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)),
        "header_list": listVisits?.[0] ? Object.keys(listVisits[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": isClosedDay,
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "places_list": listPlaces,
        "place": {
            jours_fermeture: DEFAULT_CLOSED_DAYS,
            ...(Object.keys(regularOpening).length ? {...place.toJSON(), ...regularOpening} : {}),
        }
    });
});


export default router;
