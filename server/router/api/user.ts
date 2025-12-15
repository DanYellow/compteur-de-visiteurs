import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import nunjucks from "nunjucks";
import jwt from "jsonwebtoken";

import {
    User as UserModel,
    UserPublicKeyCredentials as UserPublicKeyCredentialsModel,
} from "#models/index.ts";
import { requireRoleMiddleware } from "#server/middlewares.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

const transporter = nodemailer.createTransport({
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

router.post("/utilisateur/activation", requireRoleMiddleware("ADMIN"), async (req, res) => {
    const user = await UserModel.findByPk(Number(req.body.userId));
    if (user) {
        try {
            await user.update({
                actif: req.body.actif,
            });

            if (req.body.actif) {
                const token = jwt.sign(
                    { userId: user.id },
                    String(process.env.JWT_ACTIVATION_SECRET),
                    {
                        expiresIn: (process.env.JWT_ACTIVATION_EXPIRES ?? '1d' ) as jwt.SignOptions['expiresIn'],
                    }
                );

                const activationLink = `${req.protocol}://${req.get(
                    "host"
                )}/activation/${token}`;
                const html = nunjucks.render("pages/emails/activation.njk", {
                    activation_link: activationLink,
                });

                const info = await transporter.sendMail({
                    from: `"Faclab Numixs" <${process.env.EMAIL_NOREPLY}>`,
                    to: user.email,
                    subject: "Activation de votre compte Fablab Numixs",
                    text: "Hello world?", // plain‑text body
                    html: html, // HTML body
                });
                console.log("Message sent:", info.messageId);
            }

            res.status(200).json({
                success: true,
                message: "Utilisateur mis à jour",
            });
        } catch (e) {
            console.log("e", e);
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

router.post("/utilisateur/mdp-activation", async (req, res) => {
    const user = await UserModel.findByPk(req.body.userId, {
        include: [{
            model: UserPublicKeyCredentialsModel,
            as: "listPasskeys",
        }]
    });

    if (user && user.listPasskeys.length > 0) {
        try {
            await user.update({
                utilise_mdp: !user.utilise_mdp,
            });

            res.json({ erreur: false });
        } catch (error) {
            res.status(500).json({ erreur: true });
        }
    }
    res.status(500).json({ erreur: true });
});

export default router;
