import express from "express";
import dotenv from "dotenv";
import nunjucks from "nunjucks";
import jwt from "jsonwebtoken";

import {
    User as UserModel,
    UserPublicKeyCredentials as UserPublicKeyCredentialsModel,
} from "#models/index.ts";
import { mailTransporter } from "#server/utils.ts";
import { requireRoleMiddleware } from "#server/middlewares.ts";
import { renderEmail } from "#server/utils.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

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
                        expiresIn: (process.env.JWT_ACTIVATION_EXPIRES ?? '1d') as jwt.SignOptions['expiresIn'],
                    }
                );

                const activationLink = `${req.protocol}://${req.get(
                    "host"
                )}/activation/${token}`;
                const html = renderEmail("emails/user-activation.njk", {
                    activation_link: activationLink,
                });

                const info = await mailTransporter.sendMail({
                    from: `"Faclab Numixs" <${process.env.EMAIL_NOREPLY}>`,
                    to: user.email,
                    subject: "Activation de votre compte Fablab Numixs",
                    text: nunjucks.render("emails/user-activation.txt.njk", {
                        activation_link: activationLink,
                    }),
                    html: html, // HTML body
                });
                console.log("Message sent:", info.messageId);
            }

            res.status(200).json({
                success: true,
                message: "Utilisateur mis à jour",
                utilisateur: user.toJSON(),
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

            return res.json({ erreur: false });
        } catch (error) {
            return res.status(500).json({ erreur: true });
        }
    }
    return res.status(500).json({ erreur: true });
});

router.post("/utilisateur/generer-nouveau-mdp", async (req, res) => {
    const user = await UserModel.findByPk(req.body.userId, {
        include: [{
            model: UserPublicKeyCredentialsModel,
            as: "listPasskeys",
        }]
    });

    if (!user) {
        return res.status(200).json({});
    }

    const token = jwt.sign(
        { userId: user.id },
        String(process.env.JWT_ACTIVATION_SECRET),
        {
            expiresIn: (process.env.JWT_ACTIVATION_EXPIRES ?? '1d') as jwt.SignOptions['expiresIn'],
        }
    );

    const activationLink = `${req.protocol}://${req.get(
        "host"
    )}/recuperation-mot-de-passe/${token}`;
    const html = nunjucks.render("pages/emails/new-password.njk", {
        activation_link: activationLink,
    });

    const info = await mailTransporter.sendMail({
        from: `"Faclab Numixs" <${process.env.EMAIL_NOREPLY}>`,
        to: user.email,
        subject: "Récupération de votre mot de passe Fablab Numixs",
        text: "Hello world?", // plain‑text body
        html: html, // HTML body
    });
    console.log("Message sent:", info.messageId);

    res.status(200).json({});
});

export default router;
