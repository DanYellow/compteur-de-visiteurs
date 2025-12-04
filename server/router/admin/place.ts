import express from "express";
import { Info } from "luxon";

import { capitalizeFirstLetter, DEFAULT_CLOSE_HOURS, DEFAULT_OPEN_HOURS, listPlaceTypes } from '#scripts/utils.shared.ts';
import { PlaceSchema } from "#scripts/schemas.ts";
import { slugify } from "#scripts/utils.ts";
import { DEFAULT_CLOSED_DAYS } from "#scripts/utils.shared.ts";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel } from "#models/index.ts";
import { PlaceRaw } from "#types";
import { authenticateMiddleware } from "#server/middlewares.ts";

const router = express.Router();

const NUMBER_REGEX = /^\d+$/;

router.get(['/lieu', '/lieu/:placeId'], authenticateMiddleware, async (req, res) => {
    let place = null
    if (req.params.placeId) {
        place = await PlaceModel.findByPk(req.params.placeId, {
            include: [{ model: RegularOpeningModel, as: "regularOpening", required: false }],
        });
        if (place) {
            const placeRegularOpening = await place.getRegularOpening()

            const [heure_ouverture_heure, heure_ouverture_minutes] = (placeRegularOpening?.heure_ouverture || DEFAULT_OPEN_HOURS).split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = (placeRegularOpening?.heure_fermeture || DEFAULT_CLOSE_HOURS).split(":");

            place = {
                ...place.toJSON(),
                jours_fermeture: (placeRegularOpening?.jours_fermeture || []),
                heure_ouverture_heure,
                heure_ouverture_minutes,
                heure_fermeture_heure,
                heure_fermeture_minutes,
            }
        }
    }

    res.render("pages/add_edit-place.njk", {
        place: {
            jours_fermeture: DEFAULT_CLOSED_DAYS,
            ouvert: 1,
            ...place,
        },
        is_edit: Object.keys(place || {}).length > 0,
        flash_message: req.cookies.flash_message,
        not_found: req.params.placeId && !place,
        list_place_types: listPlaceTypes.map((item) => ({
            ...item,
            logo: `${item.value}-numixs.svg`
        })).sort((itemA, itemB) => itemA.label.localeCompare(itemB.label)),
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
}).post(['/lieu', '/lieu/:placeId'], authenticateMiddleware, async (req, res, next) => {
    if ("placeId" in req.params && !NUMBER_REGEX.test(req.params.placeId)) {
        return next();
    }

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
        let listClosedDays = [];
        if (req.body.jours_fermeture) {
            if (Array.isArray(req.body.jours_fermeture)) {
                listClosedDays = req.body.jours_fermeture;
            } else {
                listClosedDays = req.body.jours_fermeture.split();
            }
        }

        if (req.params.placeId) {
            const { heure_ouverture_heure, heure_ouverture_minutes, heure_fermeture_heure, heure_fermeture_minutes } = req.body

            await PlaceModel.update(payload, {
                where: {
                    id: Number(req.params.placeId)
                }
            })
            await RegularOpeningModel.update({
                jours_fermeture: listClosedDays,
                heure_ouverture: `${heure_ouverture_heure}:${heure_ouverture_minutes}:00`,
                heure_fermeture: `${heure_fermeture_heure}:${heure_fermeture_minutes}:00`,
            }, {
                where: {
                    place_id: Number(req.params.placeId)
                }
            })
            res.cookie('flash_message', "update_success", { maxAge: 1000, httpOnly: true });
        } else {
            const place = await PlaceModel.create({
                nom: payload.nom,
                adresse: payload.adresse,
                slug: slugify(req.body.nom),
                description: payload.description,
                ouvert: payload.ouvert,
                type: payload.type,
            });

            const { heure_ouverture_heure, heure_ouverture_minutes, heure_fermeture_heure, heure_fermeture_minutes } = req.body

            await RegularOpeningModel.create({
                place_id: place.id,
                jours_fermeture: listClosedDays,
                heure_ouverture: `${heure_ouverture_heure}:${heure_ouverture_minutes}:00`,
                heure_fermeture: `${heure_fermeture_heure}:${heure_fermeture_minutes}:00`,
            })
            res.cookie('flash_message', "create_success", { maxAge: 1000, httpOnly: true });
        }
        res.redirect('/lieux');
    } catch (e) {
        res.cookie('flash_message', "error", { maxAge: 1000, httpOnly: true })

        console.log(e)
        return res.render("pages/add_edit-place.njk");
    }
}).post(['/lieu/suppression'], authenticateMiddleware, async (req, res) => {
    try {
        const placeToDestroy = await PlaceModel.findByPk(req.body.id)
        if (placeToDestroy) {
            await placeToDestroy.setListEvents([])
            await placeToDestroy.destroy()

            res.cookie('flash_message', "delete_success", { maxAge: 1000, httpOnly: true });
        }
    } catch (error) {
        console.log(error)
        res.cookie('flash_message', "delete_error", { maxAge: 1000, httpOnly: true });
    }

    res.redirect('/lieux');
})

router.get(['/lieux'], authenticateMiddleware, async (req, res) => {
    const listDays = Info.weekdays('long', { locale: 'fr' }).map(capitalizeFirstLetter);
    const listPlaces = await PlaceModel.findAll({
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: false }],
        order: [
            ['nom', 'ASC'],
        ],
    })

    const listPlacesComputed = await Promise.all(
        listPlaces.map(async (place) => {
            const placeRegularOpening = await place.getRegularOpening()
            const listClosedDays = (placeRegularOpening?.jours_fermeture || []) as string[];

            const [heure_ouverture_heure, heure_ouverture_minutes] = (placeRegularOpening?.heure_ouverture || DEFAULT_OPEN_HOURS).split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = (placeRegularOpening?.heure_fermeture || DEFAULT_CLOSE_HOURS).split(":");

            const res = {
                ...place.toJSON(),
                jours_fermeture: listClosedDays.map((idxDay) => listDays[Number(idxDay) - 1]).join(', '),
                heure_ouverture: `${heure_ouverture_heure}h${heure_ouverture_minutes}`,
                heure_fermeture: `${heure_fermeture_heure}h${heure_fermeture_minutes}`,
                incomplet: placeRegularOpening === null,
            } as PlaceRaw;

            delete res.regularOpening;

            return res;
        })
    );

    res.render("pages/places-list.njk", {
        places_list: listPlacesComputed,
        flash_message: req.cookies.flash_message,
    });
})

export default router;
