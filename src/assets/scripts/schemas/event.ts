import * as z from "zod";

import { REQUIRED_MESSAGE } from '#scripts/utils.shared.ts';

export const EventSchema = z.object({
    nom: z.string().min(1, {
        error: `Nom : ${REQUIRED_MESSAGE}`
    }),
    description: z.string().optional(),
    heure_ouverture_heure: z.string(),
    heure_ouverture_minutes: z.string(),
    heure_fermeture_heure: z.string(),
    heure_fermeture_minutes: z.string(),
    date: z.iso.date({
        error: `Lieux concernés : ${REQUIRED_MESSAGE}`
    }),
    lieux: z.string().optional(),

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
});
