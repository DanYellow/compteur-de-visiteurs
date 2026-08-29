import * as z from "zod";

import { listPlaceTypes, REQUIRED_MESSAGE } from '#scripts/utils.shared';

export const PlaceSchema = z.object({
    nom: z.string().min(1, {
        error: `Nom : ${REQUIRED_MESSAGE}`
    }),
    adresse: z.string().optional(),
    jours_fermeture: z.string().optional(),
    heure_ouverture_heure: z.string(),
    heure_ouverture_minutes: z.string(),
    heure_fermeture_heure: z.string(),
    heure_fermeture_minutes: z.string(),
    type: z.enum(listPlaceTypes.map((item) => item.value), {
        error: "Vous devez définir un type de lieu"
    }),
    ouvert: z.enum(["1", "0"], {
        error: "Vous devez définir l'ouverture du lieu"
    })
}).refine(data => {
    const timeOpen = new Date();
    timeOpen.setHours(Number(data.heure_ouverture_heure))
    timeOpen.setMinutes(Number(data.heure_ouverture_minutes))

    const timeClose = new Date();
    timeClose.setHours(Number(data.heure_fermeture_heure))
    timeClose.setMinutes(Number(data.heure_fermeture_minutes))

    return timeOpen < timeClose;
}, {
    error: "Horaires : L'heure d'ouverture doit être inférieure à celle de fermeture",
    path: ['heure_ouverture_heure', 'heure_ouverture_minutes', 'heure_fermeture_heure', 'heure_fermeture_minutes']
}).refine(data => {
    const closedDays = JSON.parse(data.jours_fermeture || "[]")
    return closedDays?.length < 7;
}, {
    error: "Le lieu doit être ouvert au minimum un jour",
    path: ['jours_fermeture']
})
