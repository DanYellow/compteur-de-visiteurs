import express from "express";
import { Info } from "luxon";

import { capitalizeFirstLetter } from '#scripts/utils.shared.ts';
import { PlaceSchema } from "#scripts/schemas.ts";
import { slugify } from "#scripts/utils.ts";
import { DEFAULT_CLOSED_DAYS } from "#server/router/admin.ts";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel } from "#models/index.ts";
import { PlaceRaw } from "#types";

const router = express.Router();

// const base = "auteurs";

router.get(['/lieu', '/lieu/:placeId'], async (req, res) => {
    let place = null
    if (req.params.placeId) {
        place = await PlaceModel.findByPk(req.params.placeId, {
            include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        });
        if (place) {
            const placeRegularOpening = await place.getRegularOpening()

            const [heure_ouverture_heure, heure_ouverture_minutes] = placeRegularOpening.heure_ouverture.split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = placeRegularOpening.heure_fermeture.split(":");

            place = {
                ...place.toJSON(),
                jours_fermeture: placeRegularOpening.jours_fermeture,
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
        } else {
            const place = await PlaceModel.create({
                nom: payload.nom,
                adresse: payload.adresse,
                slug: slugify(req.body.nom),
                description: payload.description,
                ouvert: payload.ouvert,
            });

            const { heure_ouverture_heure, heure_ouverture_minutes, heure_fermeture_heure, heure_fermeture_minutes } = req.body

            await RegularOpeningModel.create({
                place_id: place.id,
                jours_fermeture: listClosedDays,
                heure_ouverture: `${heure_ouverture_heure}:${heure_ouverture_minutes}:00`,
                heure_fermeture: `${heure_fermeture_heure}:${heure_fermeture_minutes}:00`,
            })
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
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        order: [
            ['nom', 'ASC'],
        ],
    })

    const listPlacesComputed = await Promise.all(
        listPlaces.map(async (place) => {
            const placeRegularOpening = await place.getRegularOpening()
            const listClosedDays = placeRegularOpening.jours_fermeture as string[];

            const [heure_ouverture_heure, heure_ouverture_minutes] = placeRegularOpening.heure_ouverture.split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = placeRegularOpening.heure_fermeture.split(":");

            const res = {
                ...place.toJSON(),
                jours_fermeture: listClosedDays.map((idxDay) => listDays[Number(idxDay) - 1]).join(', '),
                heure_ouverture: `${heure_ouverture_heure}h${heure_ouverture_minutes}`,
                heure_fermeture: `${heure_fermeture_heure}h${heure_fermeture_minutes}`,
            } as PlaceRaw;

            delete res.regularOpening

            return res
        })
    );

    res.render("pages/places-list.njk", {
        places_list: listPlacesComputed,
    });
})

export default router;
