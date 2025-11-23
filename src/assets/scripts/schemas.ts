import * as z from "zod";

import { listGroups as listBusinessSector } from './utils.shared';

type BusinessSectorPayload = {
    entreprise?: string;
    education?: string;
    artisan?: string;
    artiste?: string;
    agent_carpf?: string;
    collectivité?: string;
    numixs_lab?: string;
    retraité?: string;
    réinsertion_pro?: string;
    autre?: string;
    station_numixs?: string;
    entreprise_externe?: string;
}

type BusinessSectorSchema = {
    entreprise?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    station_numixs?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    entreprise_externe?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    education?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    artisan?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    artiste?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    agent_carpf?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    collectivité?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    numixs_lab?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    retraité?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    réinsertion_pro?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    autre?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}

const hasSelectedABusinessSector = (data: BusinessSectorPayload) => {
    return listBusinessSector
        .filter((item) => (!("listInChoices" in item) || item.listInChoices))
        .map((item) => item.value).some((item) => item in data)
}

const listBusinessSectorValidator: BusinessSectorSchema = listBusinessSector.map(({ value }) => ({ [value]: z.string().optional().or(z.literal('')) })).reduce((obj, item) => {
    return { ...obj, ...item }
}, {})

export const VisitorSchema = z.object({
    // Secteur activité
    ...listBusinessSectorValidator,
}).refine((data) => {
    return hasSelectedABusinessSector(data as BusinessSectorPayload);
}, {
    error: "Vous devez choisir au moins un groupe",
    path: listBusinessSector.map((item) => item.value)
}).refine(data => {
    const entrepriseIsSelected = data.entreprise === "oui" && (data.entreprise_externe === "oui" || data.station_numixs === "oui");
    const entrepriseIsNotSelected = !data.entreprise && !data.entreprise_externe && !data.station_numixs

    return entrepriseIsNotSelected || entrepriseIsSelected;
}, {
    message: "Vous devez choisir un type d'entreprise",
    path: ['entreprise'] // Pointing out which field is invalid
})

const REQUIRED_MESSAGE = "Ce champ est obligatoire";

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


export const SpecialOpeningSchema = z.object({
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
    lieux: z.string(),

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
})
.refine(data => {
    const closedDays = JSON.parse(data.lieux || "[]")
    return closedDays?.length >= 1;
}, {
    error: `Lieux concernés : ${REQUIRED_MESSAGE}`,
    path: ['lieux']
})
