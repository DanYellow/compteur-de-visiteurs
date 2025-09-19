import * as z from "zod";

import { listBusinessSector } from "#scripts/utils.ts"

type BusinessSectorPayload = {
    habitant?: string;
    faclab?: string;
    association?: string;
    entrepreneur?: string;
    artisan_artiste?: string;
    collectivite?: string;
    education?: string;
}

type BusinessSectorSchema = {
    habitant?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    faclab?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    association?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    entrepreneur?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    artisan_artiste?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    collectivite?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    education?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}

const PHONE_NUMBER_REGEX = /(\d{2}\s?){5}|\d{2}\+\s?\d{1}\s?(\d{2}\s?){3}/;
const ZIP_CODE_REGEX = /^\d{4,5}$/;

const hasSelectedABusinessSector = (data: BusinessSectorPayload) => {
    return (
        "habitant" in data ||
        "association" in data ||
        "faclab" in data ||
        "entrepreneur" in data ||
        "artisan_artiste" in data ||
        "collectivite" in data ||
        "collectivite" in data ||
        "education" in data
    )
}

const listBusinessSectorValidator: BusinessSectorSchema = listBusinessSector.map(({ value }) => ({ [value]: z.string().optional().or(z.literal('')) })).reduce((obj, item) => {
    return { ...obj, ...item }
}, {})


export const NewMemberSchema = z.object({
    prenom: z.string().min(1, { message: "Vous devez mettre votre prénom" }),
    nom: z.string().min(1, { message: "Vous devez mettre votre nom de famille" }),
    numero_telephone: z.string().regex(new RegExp(PHONE_NUMBER_REGEX), { message: "Vous devez mettre un numéro de téléphone valide" }).optional().or(z.literal('')),
    email: z.email({ error: "Vous devez mettre une adresse e-mail valide" }),
    adresse: z.string().min(1, { message: "Vous devez mettre votre adresse" }).optional().or(z.literal('')),
    ville: z.string().min(1, { message: "Vous devez mettre votre ville" }).optional().or(z.literal('')),
    // region: z.string(),
    code_postal: z.string().regex(new RegExp(ZIP_CODE_REGEX), { message: "Vous devez un code postal valide" }),
    // Secteur activité
    ...listBusinessSectorValidator,

    reglement: z.string().optional().or(z.literal('')),
    signature: z.string().optional().or(z.literal('')),
}).refine((data) => {
    return hasSelectedABusinessSector(data);
}, {
    error: "Vous devez choisir au moins un secteur d'activité",
}).refine((data) => {
    return "reglement" in data;
}, {
    error: "Vous devez accepter le règlement intérieur du FacLab® numixs",
}).refine((data) => {
    return "signature" in data;
}, {
    error: "Vous devez signer le formulaire",
})
