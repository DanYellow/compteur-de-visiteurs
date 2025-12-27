import fs from "fs";
import path from "path";

import nodemailer from "nodemailer";
import juice from "juice";
import nunjucks from "nunjucks";
import dotenv from "dotenv";

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

    const html = nunjucks.render(template, {
        ...data,
        tailwindCss
    });

    return juice(html, {
        applyStyleTags: true,
        removeStyleTags: true,
        preserveMediaQueries: true
    });
}
