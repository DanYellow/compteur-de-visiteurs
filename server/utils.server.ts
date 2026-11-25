import fs from "fs";
import path from "path";

import nodemailer from "nodemailer";
import juice from "juice";
import nunjucks from "nunjucks";
import { loadEnvFile } from 'node:process';

import { capitalizeFirstLetter, listGroups } from "#scripts/utils.shared";
import type { PlaceRaw, VisitRaw, VisitValue } from "#types";
import type Place from "#models/place";
import { Info } from "luxon";

loadEnvFile(`${process.cwd()}/.env.local`);

export const mailTransporter = nodemailer.createTransport({
    ...(process.env.NODE_ENV === "development"
        ? {
            port: 1025,
            host: "localhost",
            tls: {
                rejectUnauthorized: false,
            },
        }
        : {
            host: process.env.EMAIL_SERVER_NOREPLY,
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_NOREPLY,
                pass: process.env.EMAIL_PASSWORD_NOREPLY,
            },
        }),
});

export const renderEmail = (template: string, data: Record<string, any> = {}) => {
    const tailwindCss = fs.readFileSync(
        path.join(process.cwd(), "dist/tailwind-email.css"),
        "utf8"
    );

    const rawHtml = nunjucks.render(template, {
        ...data,
        tailwindCss,
    });

    return juice(rawHtml, {
        applyStyleTags: true,
        removeStyleTags: true,
        resolveCSSVariables: true,
        preserveMediaQueries: true,
        insertPreservedExtraCss: false,
    })
}

export const getVisitsSummaries = (listVisits: VisitRaw[]) => {
    const result: Record<string, Record<VisitValue, number>> = {};

    const listKeys = ["genre", "departement", "tranche_age",];

    listKeys.forEach((key) => {
        result[key] = listVisits.reduce((category: Record<VisitValue, number>, visit: VisitRaw) => {
            const value = visit[key as keyof VisitRaw] as VisitValue;

            if (value != null) {
                category[value] = (category[value] || 0) + 1;
            }

            return category;
        }, {} as Record<VisitValue, number>)
    })

    const listGroupsFiltered = listGroups.filter((item) => (!("listInDb" in item) || item.listInDb)).map((item) => item.value);

    result.group = listGroupsFiltered.reduce((acc, key) => {
        acc[key] = listVisits.reduce((count, item: VisitRaw) => count + (item[key] === "oui" ? 1 : 0), 0);

        return acc;
    }, {} as Record<VisitValue, number>);

    return result;
}

export const computedPlaces = async (listPlaces: Place[]) => {
    const listDays = Info.weekdays('long', { locale: 'fr' }).map(capitalizeFirstLetter);

    const listPlacesComputed = await Promise.all(
        listPlaces.map(async (place) => {
            const placeRegularOpening = await place.getRegularOpening()
            const listClosedDays = (placeRegularOpening?.jours_fermeture || []) as string[];

            const [heure_ouverture_heure, heure_ouverture_minutes] = placeRegularOpening.heure_ouverture.split(":");
            const [heure_fermeture_heure, heure_fermeture_minutes] = placeRegularOpening.heure_fermeture.split(":");

            const res = {
                ...place.toJSON(),
                jours_fermeture: listClosedDays.map((idxDay) => listDays[Number(idxDay) - 1]).join(', '),
                heure_ouverture: `${heure_ouverture_heure}h${heure_ouverture_minutes}`,
                heure_fermeture: `${heure_fermeture_heure}h${heure_fermeture_minutes}`,
                incomplet: placeRegularOpening === null,
                logo: `${place.toJSON().type}-numixs.svg`
            } as PlaceRaw;

            delete res.regularOpening;

            return res;
        })
    );

    return listPlacesComputed;
}
