import * as z from "zod";

import { listBusinessSector } from "#scripts/utils.ts";

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
}

type BusinessSectorSchema = {
    entreprise?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
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
    return listBusinessSector.map((item) => item.value).some((item) => item in data)
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
});
