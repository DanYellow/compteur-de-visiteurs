import express from "express";
import { Info } from "luxon";

import { capitalizeFirstLetter, DEFAULT_CLOSE_HOURS, DEFAULT_OPEN_HOURS, listPlaceTypes } from '#scripts/utils.shared';
import { PlaceSchema } from "#scripts/schemas/index";
import { slugify, DEFAULT_CLOSED_DAYS } from "#scripts/utils.shared";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel, User } from "#models/index";
import { requireMinimumRole } from "#server/middlewares";
import { flashMessageCookieOptions } from "#server/index";
import { computedPlaces } from "#server/utils.server";

const router = express.Router();

const NUMBER_REGEX = /^\d+$/;

router.get(['/lieu', '/lieu/:placeId'], requireMinimumRole("ADMIN"), async (req, res) => {
    let place = null
    if (req.params.placeId) {
        place = await PlaceModel.findByPk(String(req.params.placeId), {
            include: [
                { model: RegularOpeningModel, as: "regularOpening", required: false },
                { model: User, as: 'dernier_editeur', required: false }
            ],
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

    res.render("pages/admin/add_edit-place.njk", {
        place: {
            jours_fermeture: DEFAULT_CLOSED_DAYS,
            ouvert: 1,
            ...place,
        },
        is_edit: Object.keys(place || {}).length > 0,
        not_found: req.params.placeId && !place,
        list_place_types: listPlaceTypes.map((item) => ({
            ...item,
            logo: `${item.value}-numixs.svg`
        })).sort((itemA, itemB) => itemA.label.localeCompare(itemB.label)),
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
}).post(['/lieu', '/lieu/:placeId'], requireMinimumRole("ADMIN"), async (req, res, next) => {
    if ("placeId" in req.params && !NUMBER_REGEX.test(String(req.params.placeId))) {
        return next();
    }

    const redirectUrl = req.headers.referer || '/';

    let payload = {
        ...req.body,
        jours_fermeture: JSON.stringify(req.body.jours_fermeture || [])
    };

    const validator = PlaceSchema.safeParse(payload);
    if (!validator.success) {
        res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions);
        return res.redirect(redirectUrl);
    }

    payload = {
        ...req.body,
        jours_fermeture: req.body.jours_fermeture,
        dernier_editeur_id: res.locals.current_user!.id,
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
            res.cookie('flash_message', JSON.stringify(['update_success']), { maxAge: 1000, httpOnly: true });
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
            res.cookie('flash_message', JSON.stringify(['create_success']), flashMessageCookieOptions);
        }
        if (req.params.placeId) {
            res.redirect(redirectUrl);
        } else {
            res.redirect(`${res.locals.admin_prefix}/lieux`);
        }
    } catch (e) {
        res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions)
        return res.redirect(redirectUrl);
    }
}).post(['/lieu/suppression'], requireMinimumRole("ADMIN"), async (req, res) => {
    try {
        const placeToDestroy = await PlaceModel.findByPk(req.body.id)
        if (placeToDestroy) {
            await placeToDestroy.setListEvents([])
            await placeToDestroy.destroy()

            res.cookie('flash_message', JSON.stringify(['delete_success']), flashMessageCookieOptions);
        }
    } catch (error) {
        console.log(error)
        res.cookie('flash_message', JSON.stringify(['delete_error']), flashMessageCookieOptions);
    }

    res.redirect(`${res.locals.admin_prefix}/lieux`);
})

router.get(['/lieux'], requireMinimumRole("ADMIN"), async (_, res) => {
    const listPlaces = await PlaceModel.findAll({
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: false }],
        order: [
            ['nom', 'ASC'],
        ],
    })

    const listPlacesComputed = await computedPlaces(listPlaces);

    res.render("pages/admin/places-list.njk", {
        places_list: listPlacesComputed,
    });
})

export default router;
