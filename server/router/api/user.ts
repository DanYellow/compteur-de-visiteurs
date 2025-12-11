import express from "express";
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
import nunjucks from "nunjucks";

import { User as UserModel } from "#models/index.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` })

const router = express.Router();

const transporter = nodemailer.createTransport({
    ...(process.env.NODE_ENV === "development" ? {
        port: 1025,
        host: 'localhost',
        tls: {
            rejectUnauthorized: false
        },
    } : {
        host: "smtp.laposte.net",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_NOREPLY,
            pass: process.env.EMAIL_PASSWORD_NOREPLY,
        },
    })
});

router.post("/utilisateur/statut", async (req, res) => {
    const user = await UserModel.findByPk(Number(req.body.userId));
    if (user) {
        try {
            await user.update({
                actif: req.body.actif,
            });

            const html = nunjucks.render('pages/emails/activation.njk', {
                title: 'Hello',
                items: [1, 2, 3]
            });

            const info = await transporter.sendMail({
                from: `"Maddison Foo Koch" <${process.env.EMAIL_NOREPLY}>`,
                to: user.email,
                subject: "Hello ✔",
                text: "Hello world?", // plain‑text body
                html: html, // HTML body
            });
            console.log("Message sent:", info.messageId);

            res.status(200).json({
                success: true,
                message: "Utilisateur mis à jour"
            });
        } catch (e) {
            console.log("e", e)
            res.status(404).json({
                success: false,
                message: "Utilisateur inconnu",
            });
        }
    } else {
        res.status(500).json({
            success: false,
            message: "Une erreur est survenue",
        });
    }
});

export default router;
