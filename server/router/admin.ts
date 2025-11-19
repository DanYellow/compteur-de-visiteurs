import express from "express";
import { DateTime, Info } from "luxon";
import { Op, literal } from 'sequelize';

import { capitalizeFirstLetter, listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import VisitorModel from "#models/visitor.ts";
import PlaceModel from "#models/place.ts";
import config from "#config" with { type: "json" };
import sequelize from "#models/index.ts";
import { PlaceSchema } from "#scripts/schemas.ts";
import { slugify } from "#scripts/utils.ts";

const router = express.Router();

router.get(["/dashboard"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    res.render("pages/dashboard.njk", {
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": config.CLOSED_DAYS_INDEX.split(",").includes(String(daySelected.weekday)),
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
    });
})

router.get(["/visiteurs", "/liste-visiteurs", "/visites"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const isClosedDay = config.CLOSED_DAYS_INDEX.split(",").includes(String(daySelected.weekday));

    const openingDaysSelector = sequelize.where(
        sequelize.fn("strftime", "%u", sequelize.col("date_passage"), "localtime"), {
            [Op.notIn]: config.CLOSED_DAYS_INDEX.split(",")
        }
    );

    const [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);
    const records = await VisitorModel.findAll({
        attributes: {
            include: [
                [sequelize.literal('ROW_NUMBER() OVER (ORDER by date_passage ASC)'), 'order']
            ],
            exclude: ["placeId"],
        },
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").set({ hour: openHours }).toString(),
                    [Op.lte]: daySelected.endOf("day").set({ hour: closeHours }).toString(),
                }
            },
            [Op.and]: [openingDaysSelector],
        },
        order: [['date_passage', 'DESC']]
    });

    const visitorsSummary = await VisitorModel.findAll({
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
        },
    });

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
    });
});

router.get(['/lieu', '/lieu/:placeId'], async (req, res) => {
    let place = {}
    if (req.params.placeId) {
        place = await PlaceModel.findByPk(req.params.placeId, {raw: true});
    }

    res.render("pages/add_edit-place.njk", {
        place,
        is_edit: Object.keys(place || {}).length > 0,
    });
}).post(['/lieu', '/lieu/:placeId'], async (req, res) => {
    const validator = PlaceSchema.safeParse(req.body);
    if (!validator.success) {
        return res.render("pages/add_edit-place.njk", {
        });
    }

    try {
        const payload = req.body;
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
    } catch (e) {
        console.log(e)
    }

    res.redirect('/lieux');
})

router.get(['/lieux'], async (req, res) => {
    const listPlaces = await PlaceModel.findAll({
        raw: true,
    })
    console.log(listPlaces)
    res.render("pages/places-list.njk", {
        places_list: listPlaces,
    });
})

export default router;
