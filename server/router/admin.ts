import express from "express";
import { DateTime, Info } from "luxon";
import { Op, literal } from 'sequelize';

import { capitalizeFirstLetter, listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import sequelize from "#models/index.ts";
import config from "#config" with { type: "json" };
import { PlaceSchema } from "#scripts/schemas.ts";
import { slugify } from "#scripts/utils.ts";

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

    res.render("pages/dashboard.njk", {
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": config.CLOSED_DAYS_INDEX.split(",").includes(String(daySelected.weekday)),
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

    const isClosedDay = config.CLOSED_DAYS_INDEX.split(",").includes(String(daySelected.weekday));
    let [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);

    const openingDaysSelector = sequelize.where(
        sequelize.fn("strftime", "%u", sequelize.col("date_passage"), "localtime"), {
            [Op.notIn]: config.CLOSED_DAYS_INDEX.split(",")
        }
    );

    const placeSelected = req.query?.lieu || "tous";
    let place = null;

    if (placeSelected !== "tous") {
        place = await PlaceModel.findOne({ where: { slug: placeSelected } })
        if (place) {
            openHours = Number(place.heure_ouverture);
            closeHours = Number(place.heure_fermeture);
        }
    }

    const records = await VisitModel.findAll({
        raw: true,
        attributes: {
            include: [
                [sequelize.literal('ROW_NUMBER() OVER (ORDER by date_passage ASC)'), 'order'],
            ],
        },
        include: 'place',
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").set({ hour: openHours }).toString(),
                    [Op.lte]: daySelected.endOf("day").set({ hour: closeHours }).toString(),
                }
            },
            [Op.and]: [openingDaysSelector],
            ...(place ? { lieu_id: place.id } : {}),
        },
        order: [['date_passage', 'DESC']]
    });

    const visitorsSummary = await VisitModel.findAll({
        raw: true,
        attributes: {
            include: [
                ...(listBusinessSector.map((item) => [literal(`COUNT (distinct "id") FILTER (WHERE "${item.value}" = 'oui')`), item.value]))
            ],
            exclude: ["placeId"],
        },
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").set({ hour: openHours }).toString(),
                    [Op.lte]: daySelected.endOf("day").set({ hour: closeHours }).toString(),
                },
            },
            [Op.and]: [openingDaysSelector],
            ...(place ? { lieu_id: place.id } : {}),
        },
    });

    const listPlaces = await PlaceModel.findAll({
        raw: true,
    })

    res.render("pages/members-list.njk", {
        visitors_summary: visitorsSummary[0],
        "visitors_list": records,
        "list_business_sector": listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)),
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": isClosedDay,
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "places_list": listPlaces,
        "place": place
    });
});

router.get(['/lieu', '/lieu/:placeId'], async (req, res) => {
    let place = null
    if (req.params.placeId) {
        place = await PlaceModel.findByPk(req.params.placeId, { raw: true });
    }

    res.render("pages/add_edit-place.njk", {
        place: {
            ...place,
            jours_fermeture: place ? (place.jours_fermeture || "").split(",") : ["6", "7"]
        },
        is_edit: Object.keys(place || {}).length > 0,
        flash_message: req.cookies.flash_message,
        not_found: req.params.placeId && !place,
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
}).post(['/lieu', '/lieu/:placeId'], async (req, res) => {
    const payload = {
        ...req.body,
        jours_fermeture: (req.body.jours_fermeture || []).join(",")
    };

    const validator = PlaceSchema.safeParse(payload);
    if (!validator.success) {
        return res.render("pages/add_edit-place.njk");
    }

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
    })

    const listPlacesComputed = listPlaces.map((place) => {
        const listClosedDays = (place.jours_fermeture || "").split(",")
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
