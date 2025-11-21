import express from "express";
import { DateTime, Info } from "luxon";
import { Op, literal } from 'sequelize';

import { capitalizeFirstLetter, listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import sequelize from "#models/index.ts";
import config from "#config" with { type: "json" };
import { PlaceSchema } from "#scripts/schemas.ts";
import { slugify } from "#scripts/utils.ts";
import { Visit } from "#types";

const { visit: VisitModel, place: PlaceModel } = sequelize.models;

const router = express.Router();

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

    const listDaysClosed = place ? (place.jours_fermeture || "").split(",") : config.CLOSED_DAYS_INDEX.split(",");

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

    let closedDays = [];

    const placeSelected = req.query?.lieu || "tous";
    let place = null;

    if (placeSelected !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: placeSelected } })
        if (place) {
            closedDays = place.jours_fermeture || [];
        }
    }

    const isClosedDay = closedDays.includes(String(daySelected.weekday));

    const request = await fetch(`http://${req.get('host')}/api?filtre=jour&jour=${daySelected.toFormat("yyyy-LL-dd")}&lieu=${placeSelected}`);
    const listVisits = (await request.json()).data || [];

    const listBusinessSectorSelectable = listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb));
    const listBusinessSectorKeys = listBusinessSectorSelectable.map((item) => item.value)

    const visitorsSummary = Object.fromEntries(listBusinessSectorKeys.map((item) => [item, 0]))

    listVisits.forEach((visit: Visit) => {
        listBusinessSectorKeys.forEach((business) => {
            visitorsSummary[business] = visit[business] === "oui" ? (visitorsSummary[business] + 1) : visitorsSummary[business]
        });
    });

    const listPlaces = await PlaceModel.findAll({
        raw: true,
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
        "place": place || {}
    });
});

router.get(['/lieu', '/lieu/:placeId'], async (req, res) => {
    let place = null
    if (req.params.placeId) {
        place = await PlaceModel.findByPk(req.params.placeId, { raw: true });
        place = {
            ...place,
            jours_fermeture: JSON.parse(place.jours_fermeture)
        }
    }

    res.render("pages/add_edit-place.njk", {
        place: {
            ...place,
            jours_fermeture: place ? place.jours_fermeture : ["6", "7"]
        },
        is_edit: Object.keys(place || {}).length > 0,
        flash_message: req.cookies.flash_message,
        not_found: req.params.placeId && !place,
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
}).post(['/lieu', '/lieu/:placeId'], async (req, res) => {
    let payload = {
        ...req.body,
        jours_fermeture: JSON.stringify(req.body.jours_fermeture || [])
    };

    const validator = PlaceSchema.safeParse(payload);
    if (!validator.success) {
        return res.render("pages/add_edit-place.njk");
    }

    payload = {
        ...req.body,
        jours_fermeture: req.body.jours_fermeture
    };

    try {
        if (req.params.placeId) {
            await PlaceModel.update(payload, {
                where: {
                    id: Number(req.params.placeId)
                }
            })
        } else {
            payload.slug = slugify(req.body.nom)
            await PlaceModel.create(payload);
        }
        res.redirect('/lieux');
    } catch (e) {
        console.log(e)
        return res.render("pages/add_edit-place.njk");
    }
})

router.get(['/lieux'], async (req, res) => {
    const listDays = Info.weekdays('long', { locale: 'fr' }).map(capitalizeFirstLetter);
    const listPlaces = await PlaceModel.findAll({
        raw: true,
        order: [
            ['nom', 'ASC'],
        ],
    })

    const listPlacesComputed = listPlaces.map((place) => {
        const listClosedDays = JSON.parse(place.jours_fermeture)
        return {
            ...place,
            jours_fermeture: listClosedDays.map((idxDay: number) => listDays[idxDay - 1]).map(capitalizeFirstLetter).join(', ')
        }
    })

    res.render("pages/places-list.njk", {
        places_list: listPlacesComputed,
    });
})

export default router;
