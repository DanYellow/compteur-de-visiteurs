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

const hasSelectedABusinessSector = (data: BusinessSectorPayload) => {
    return listBusinessSector.map((item) => item.value).some((item) => item in data)
}

const listBusinessSectorValidator: BusinessSectorSchema = listBusinessSector.map(({ value }) => ({ [value]: z.string().optional().or(z.literal('')) })).reduce((obj, item) => {
    return { ...obj, ...item }
}, {})


export const VisitorSchema = z.object({
    // Secteur activité
    ...listBusinessSectorValidator,

    reglement: z.string().optional().or(z.literal('')),
    signature: z.string().optional().or(z.literal('')),
}).refine((data) => {
    return hasSelectedABusinessSector(data);
}, {
    error: "Vous devez choisir au moins un secteur d'activité",
    path: listBusinessSector.map((item) => item.value)
});
