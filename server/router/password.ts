import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';

import { ChangePasswordSchema, PasswordRecoverySchema } from "#scripts/schemas/index.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { User as UserModel } from "#models/index.ts";
import { UserTokenData } from "#types";

dotenv.config({ path: `${process.cwd()}/.env.local` })

const router = express.Router();

router.get('/mot-de-passe-oublie', async (req, res) => {
    res.render("pages/forgot-password.njk", {
        flash_message: req.cookies.flash_message,
        user_email: req.cookies.email,
    });
}).post('/mot-de-passe-oublie', async (req, res) => {
    const validator = PasswordRecoverySchema.safeParse(req.body);

    if (!validator.success) {
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

        return res.redirect("/mot-de-passe-oublie");
    }

    const { email } = req.body;

    const user = await UserModel.findOne({
        where: { email: String(email), actif: true }
    })

    if (user) {
        await fetch(`${req.protocol}://${req.get('host')}/api/utilisateur/generer-nouveau-mdp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: user.id,
            })
        });

        res.cookie('flash_message', 'form_success', flashMessageCookieOptions);
        res.cookie('email', email, flashMessageCookieOptions);
    } else {
        res.cookie('flash_message', 'user_not_found', flashMessageCookieOptions);

    }
    return res.redirect("/mot-de-passe-oublie");
});

router.get(['/recuperation-mot-de-passe/{:token}'], async (req, res) => {
    let user = null;
    let errorKey = "";
    const { token } = req.params;

    try {
        const decoded = jwt.verify(token, process.env.JWT_APPROVAL_SECRET!) as UserTokenData;

        user = await UserModel.findByPk(decoded.userId);

        if (!user) {
            throw new Error("user_not_found");
        }

        if (user.actif === false) {
            throw new Error("user_not_active");
        }
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            errorKey = 'expired_token'
        } else if (error.name === "JsonWebTokenError" || error.name === "SyntaxError") {
            errorKey = 'invalid_token'
        } else {
            errorKey = error.message
        }
    }

    res.render("pages/new-password.njk", {
        flash_message: errorKey,
        user_email: user?.email,
    });
}).post('/recuperation-mot-de-passe/{:token}', async (req, res) => {
    const validator = ChangePasswordSchema.safeParse(req.body);
    const { token } = req.params;

    if (!validator.success) {
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

        return res.redirect(`/recuperation-mot-de-passe/${token}`);
    }

    let user = null;
    let errorKey = "";

    try {
        if (!token) {
            throw new Error("missing_token");
        }

        const decoded = jwt.verify(token, process.env.JWT_ACTIVATION_SECRET!) as UserTokenData;

        user = await UserModel.findByPk(decoded.userId);

        if (!user) {
            throw new Error("user_not_found");
        }

        if (user.actif === false) {
            throw new Error("user_not_active");
        }

        await user.update({
            mot_de_passe: bcrypt.hashSync(String(req.body.password), 8),
            utilise_mdp: true,
        })

        res.render("pages/login.njk", {
            flash_message: "password_updated",
        });
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            errorKey = 'expired_token'
        } else if (error.name === "JsonWebTokenError" || error.name === "SyntaxError") {
            errorKey = 'invalid_token'
        } else {
            errorKey = error.message
        }

        res.render("pages/new-password.njk", {
            flash_message: errorKey,
        });
    }
});

export default router;
