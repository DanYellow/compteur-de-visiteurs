import * as z from "zod";

import { listGroups as listBusinessSector, listAgeGroups, listDepartments, listGenders, REQUIRED_MESSAGE } from '#scripts/utils.shared.ts';

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
    enseignant?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    eleve?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
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


export const GroupSchema = z.object({
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
    path: ['entreprise']
}).refine(data => {
    const isEducationSelected = data.education === "oui" && (data.enseignant === "oui" || data.eleve === "oui");
    const isEducationNotSelected = !data.education && !data.enseignant && !data.eleve

    return isEducationNotSelected || isEducationSelected;
}, {
    message: "Vous devez choisir un type d'éducation",
    path: ['education']
})

export const AgeSchema = z.object({
    tranche_age: z.enum(listAgeGroups.map(({ value }) => value), {
        error: "Vous devez sélectionner une tranche d'âge",
    })
})

export const DepartmentSchema = z.object({
    departement: z.enum(listDepartments.map(({ value }) => value), {
        error: "Vous devez sélectionner un département",
    })
})

export const GenderSchema = z.object({
    genre: z.enum(listGenders.map(({ value }) => value), {
        error: "Vous devez sélectionner un genre",
    })
})

export const VisitSchema = z.object({
    ...DepartmentSchema.shape,
    ...GenderSchema.shape,
    ...AgeSchema.shape,
    ...GroupSchema.shape,
});

const VISIT_CODE_REGEX = /^(\d|[A-z]){3}$/;

export const VisitCodeSchema = z.object({
    code: z.string().refine((value) => VISIT_CODE_REGEX.test(value ?? ""), 'Le code de visite doit faire exactement 3 caractères'),
})
