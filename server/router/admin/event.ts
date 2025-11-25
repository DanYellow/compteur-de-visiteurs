import { Op } from "sequelize";
import express from "express";
import { DateTime, Info } from "luxon";

import { Place as PlaceModel, SpecialOpening as SpecialOpeningModel } from "#models/index.ts";
import { capitalizeFirstLetter } from '#scripts/utils.shared.ts';
import { SpecialOpeningSchema } from "#scripts/schemas.ts";
import { PlaceRaw } from "#types";

const router = express.Router();

router.get(['/evenements'], async (req, res) => {
    const today = DateTime.now();

    const listSpecialOpening = await SpecialOpeningModel.findAll({
        order: [["nom", "ASC"], ["date", "DESC"], [{ model: PlaceModel, as: 'listPlaces' }, "nom", "ASC"]],
        where: {
            ...(req.query.periode ? {
                date: {
                    [Op.gte]: `${today.toFormat("yyyy-LL-dd")}`
                }
            }: {})
        },
        include: [{ model: PlaceModel, as: "listPlaces", required: true, }],
    });

    res.render("pages/special-openings-list.njk", {
        special_openings_list: listSpecialOpening.map((p) => p.toJSON()),
        flash_message: req.cookies.flash_message,
        periode: req.query.periode,
    });
})

router.get(['/evenement', '/evenement/:specialOpeningId'], async (req, res) => {
    const listPlaces = await PlaceModel.findAll({
        raw: true,
        order: [["nom", "ASC"]],
    });

    let specialOpening = null;
    if (req.params.specialOpeningId) {
        specialOpening = await SpecialOpeningModel.findByPk(req.params.specialOpeningId, {
            include: [{ model: PlaceModel, as: "listPlaces", required: true, order: [["nom", "ASC"]] }]
        });
        if (specialOpening) {
            specialOpening = specialOpening.toJSON();

            const [heure_ouverture_heure, heure_ouverture_minutes] = specialOpening.heure_ouverture.split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = specialOpening.heure_fermeture.split(":");

            specialOpening = {
                ...specialOpening,
                heure_ouverture_heure,
                heure_ouverture_minutes,
                heure_fermeture_heure,
                heure_fermeture_minutes,
                list_places_id: specialOpening.listPlaces.map((place: PlaceRaw) => Number(place.id))
            }
        }
    }

    res.render("pages/add_edit-special-opening.njk", {
        special_opening: {
            ouvert: 1,
            list_places_id: [],
            date: (DateTime.now()).toFormat("yyyy-LL-dd"),
            ...(specialOpening ? specialOpening : {})
        },
        is_edit: Object.keys(specialOpening || {}).length > 0,
        flash_message: req.cookies.flash_message,
        not_found: req.params.specialOpeningId && !specialOpening,
        list_places: listPlaces,
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
}).post(['/evenement', '/evenement/:specialOpeningId'], async (req, res) => {
    const payloadValidation = {
        ...req.body,
        lieux: JSON.stringify(req.body.lieux || [])
    };

    const validator = SpecialOpeningSchema.safeParse(payloadValidation);
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
        if (req.params.specialOpeningId) {
            const specialOpening = await SpecialOpeningModel.findByPk(Number(req.params.specialOpeningId));
            if (specialOpening) {
                await specialOpening.update({
                    nom: payload.nom,
                    date: payload.date,
                    description: payload.description,
                    heure_ouverture: `${heure_ouverture_heure}:${heure_ouverture_minutes}:00`,
                    heure_fermeture: `${heure_fermeture_heure}:${heure_fermeture_minutes}:00`,
                });
                await specialOpening.setListPlaces(listPlacesId.map(Number))
            }
            res.cookie('flash_message', "update_success", { maxAge: 1000, httpOnly: true })
        } else {
            const specialOpening = await SpecialOpeningModel.create({
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
                await place.addSpecialOpening(specialOpening);
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
