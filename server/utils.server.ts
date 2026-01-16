import fs from "fs";
import path from "path";

import nodemailer from "nodemailer";
import juice from "juice";
import nunjucks from "nunjucks";
import dotenv from "dotenv";
import { listGroups } from "#scripts/utils.shared";
import type { VisitRaw, VisitValue } from "#types";

dotenv.config({ path: `${process.cwd()}/.env.local` });

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
