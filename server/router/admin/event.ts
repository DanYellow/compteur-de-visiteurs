import { Op } from "sequelize";
import express from "express";
import { DateTime, Info } from "luxon";

import { Place as PlaceModel, Event as EventModel } from "#models/index.ts";
import { capitalizeFirstLetter } from '#scripts/utils.shared.ts';
import { EventSchema } from "#scripts/schemas.ts";
import { PlaceRaw } from "#types";

const router = express.Router();

router.get(['/evenements'], async (req, res) => {
    const today = DateTime.now();

    const listEvents = await EventModel.findAll({
        order: [["date", "DESC"], ["heure_ouverture", "DESC"], ["nom", "ASC"],  [{ model: PlaceModel, as: 'listPlaces' }, "nom", "ASC"]],
        where: {
            ...(req.query.periode ? {
                date: {
                    [Op.gte]: `${today.toFormat("yyyy-LL-dd")}`
                }
            }: {})
        },
        include: [{ model: PlaceModel, as: "listPlaces", required: true, }],
    });

    res.render("pages/events-list.njk", {
        special_openings_list: listEvents.map((p) => p.toJSON()),
        flash_message: req.cookies.flash_message,
        periode: req.query.periode,
    });
})

router.get(['/evenement', '/evenement/:eventId'], async (req, res) => {
    const listPlaces = await PlaceModel.findAll({
        raw: true,
        order: [["nom", "ASC"]],
    });

    let event = null;
    if (req.params.eventId) {
        event = await EventModel.findByPk(req.params.eventId, {
            include: [{ model: PlaceModel, as: "listPlaces", required: true, order: [["nom", "ASC"]] }]
        });
        if (event) {
            event = event.toJSON();

            const [heure_ouverture_heure, heure_ouverture_minutes] = event.heure_ouverture.split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = event.heure_fermeture.split(":");

            event = {
                ...event,
                heure_ouverture_heure,
                heure_ouverture_minutes,
                heure_fermeture_heure,
                heure_fermeture_minutes,
                list_places_id: event.listPlaces.map((place: PlaceRaw) => Number(place.id))
            }
        }
    }

    res.render("pages/add_edit-special-opening.njk", {
        special_opening: {
            ouvert: 1,
            list_places_id: [],
            date: (DateTime.now()).toFormat("yyyy-LL-dd"),
            ...(event ? event : {})
        },
        is_edit: Object.keys(event || {}).length > 0,
        flash_message: req.cookies.flash_message,
        not_found: req.params.eventId && !event,
        list_places: listPlaces,
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
}).post(['/evenement', '/evenement/:eventId'], async (req, res) => {
    const payloadValidation = {
        ...req.body,
        lieux: JSON.stringify(req.body.lieux || [])
    };

    const validator = EventSchema.safeParse(payloadValidation);
    if (!validator.success) {
        return res.render("pages/add_edit-place.njk");
    }

    const payload = {
        ...req.body,
    };

    try {
        let listPlacesId = [];
        if (payload.lieux) {
            if (Array.isArray(payload.lieux)) {
                listPlacesId = payload.lieux;
            } else {
                listPlacesId = payload.lieux.split();
            }
        }

        const { heure_ouverture_heure, heure_ouverture_minutes, heure_fermeture_heure, heure_fermeture_minutes } = req.body
        if (req.params.eventId) {
            const event = await EventModel.findByPk(Number(req.params.eventId));
            if (event) {
                await event.update({
                    nom: payload.nom,
                    date: payload.date,
                    description: payload.description,
                    heure_ouverture: `${heure_ouverture_heure}:${heure_ouverture_minutes}:00`,
                    heure_fermeture: `${heure_fermeture_heure}:${heure_fermeture_minutes}:00`,
                });
                await event.setListPlaces(listPlacesId.map(Number))
            }
            res.cookie('flash_message', "update_success", { maxAge: 1000, httpOnly: true })
        } else {
            const event = await EventModel.create({
                nom: payload.nom,
                date: payload.date,
                description: payload.description,
                heure_ouverture: `${heure_ouverture_heure}:${heure_ouverture_minutes}:00`,
                heure_fermeture: `${heure_fermeture_heure}:${heure_fermeture_minutes}:00`,
            });

            const listPlaces = await PlaceModel.findAll({
                where: {
                    id: {
                        [Op.in]: listPlacesId.filter(Boolean).map(Number)
                    }
                }
            })

            for (const place of listPlaces) {
                await place.addEvent(event);
            }
            res.cookie('flash_message', "create_success", { maxAge: 1000, httpOnly: true })
        }
        res.redirect('/evenements');
    } catch (e) {
        res.cookie('flash_message', "error", { maxAge: 1000, httpOnly: true })

        console.log(e);
        return res.render("pages/add_edit-special-opening.njk");
    }
})

export default router;
