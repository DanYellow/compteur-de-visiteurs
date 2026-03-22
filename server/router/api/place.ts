import express from "express";

import sequelize from "#models/index";
import type { CommonRegularOpening } from "#types";
import { DEFAULT_CLOSED_DAYS, DEFAULT_OPEN_HOURS, DEFAULT_CLOSE_HOURS } from "#scripts/utils.shared";

const router = express.Router();

// Returns max range opening of all places
router.get("/lieux", async (_, res) => {
    try {
        const [listPlaces] = await sequelize.query(
            `
                SELECT
                    json_group_array(value) AS jours_fermeture,
                    (
                        SELECT MIN(rh.heure_ouverture)
                        FROM place p
                        JOIN regular_opening rh ON rh.place_id = p.id
                        WHERE p.ouvert = 1
                    ) AS heure_ouverture,
                    (
                        SELECT MAX(rh.heure_fermeture)
                        FROM place p
                        JOIN regular_opening rh ON rh.place_id = p.id
                        WHERE p.ouvert = 1
                    ) AS heure_fermeture
                FROM (
                    SELECT json_each.value
                    FROM place
                    JOIN regular_opening ON regular_opening.place_id = place.id,
                        json_each(regular_opening.jours_fermeture)
                    WHERE place.ouvert = 1
                    GROUP BY json_each.value
                    HAVING COUNT(DISTINCT place.id) = (
                        SELECT COUNT(*)
                        FROM place
                        JOIN regular_opening ON regular_opening.place_id = place.id
                        WHERE place.ouvert = 1
                    )
                )
            `,
            {
                raw: true,
            })

        const commonRegularOpening = listPlaces[0] as CommonRegularOpening;

        let closedDays = commonRegularOpening.jours_fermeture;
        if (!commonRegularOpening.heure_ouverture) {
            closedDays = JSON.stringify(DEFAULT_CLOSED_DAYS)
        }

        res.status(200).json({
            data: {
                heure_ouverture: commonRegularOpening.heure_ouverture || DEFAULT_OPEN_HOURS,
                heure_fermeture: commonRegularOpening.heure_fermeture || DEFAULT_CLOSE_HOURS,
                jours_fermeture: JSON.parse(closedDays as string),
            }
        });
    } catch (e) {
        res.status(500).json({
            data: {
                heure_ouverture: DEFAULT_OPEN_HOURS,
                heure_fermeture: DEFAULT_CLOSE_HOURS,
                jours_fermeture: DEFAULT_CLOSED_DAYS,
            }
        });
    }
});

export default router;
