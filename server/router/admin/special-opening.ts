import { SpecialOpening } from "#models/index.ts";
import express from "express";
import { Info } from "luxon";

import { Place as PlaceModel, Visit as VisitModel } from "#models/index.ts";
import { capitalizeFirstLetter } from '#scripts/utils.shared.ts';
import { Op } from "sequelize";

const router = express.Router();

router.get(['/jours-exceptionnels'], async (req, res) => {
    res.render("pages/special-openings-list.njk", {
        // places_list: listPlacesComputed,
    });
})

router.get(['/jours-exceptionnel', '/jours-exceptionnel/:specialOpeningId'], async (req, res) => {
    let specialOpening = null;

    const listPlaces = await PlaceModel.findAll({
        raw: true,
        order: [["nom", "ASC"]],
        where: {
            ouvert: {
                [Op.eq]: 1,
            }
        }
    });

    if (req.params.specialOpeningId) {
        specialOpening = await SpecialOpening.findByPk(req.params.specialOpeningId, {
            // include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        });
        if (specialOpening) {
            // const placeRegularOpening = await place.getRegularOpening()

            // const [heure_ouverture_heure, heure_ouverture_minutes] = placeRegularOpening.heure_ouverture.split(":");
            // const [heure_fermeture_heure, heure_fermeture_minutes] = placeRegularOpening.heure_fermeture.split(":");

            // place = {
            //     ...place.toJSON(),
            //     jours_fermeture: placeRegularOpening.jours_fermeture,
            //     heure_ouverture_heure,
            //     heure_ouverture_minutes,
            //     heure_fermeture_heure,
            //     heure_fermeture_minutes,
            // }
        }
    }

    res.render("pages/add_edit-special-opening.njk", {
        special_opening: {
            ouvert: 1,
        },
        is_edit: Object.keys(specialOpening || {}).length > 0,
        flash_message: req.cookies.flash_message,
        not_found: req.params.specialOpeningId && !specialOpening,
        list_places: listPlaces,
        list_days: Info.weekdays('long', { locale: 'fr' }).map((item, idx) => ({ value: String(idx + 1), label: capitalizeFirstLetter(item) }))
    });
})



export default router;
