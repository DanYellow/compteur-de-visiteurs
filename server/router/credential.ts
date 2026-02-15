import express from "express";
import { UniqueConstraintError } from 'sequelize';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loadEnvFile } from 'node:process';

import { SignInSchema, SignInActivationSchema, LoginSchema } from "#scripts/schemas/index";
import { flashMessageCookieOptions, wss } from "#server/index";
import { User as UserModel } from "#models/index";
import type { CustomSession, UserTokenData } from "#types";
import { SOCKET_EVENTS } from "#scripts/utils.shared";

loadEnvFile(`${process.cwd()}/.env.local`);

const router = express.Router();

router.get('/connexion', async (req, res) => {
    try {
        jwt.verify(req.cookies.token, String(process.env.JWT_SECRET));
        return res.redirect(`${res.locals.admin_prefix}/dashboard`);

    } catch (error) { }

    res.render("pages/login.njk", {
        flash_message: req.cookies.flash_message,
        user_email: req.query?.email || req.cookies.email,
    });
}).post('/connexion', async (req, res) => {
    const validator = LoginSchema.safeParse(req.body);

    if (!validator.success) {
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

        return res.redirect("/connexion");
    }

    const { email, mot_de_passe } = req.body;

    const user = await UserModel.findOne({
        where: { email: String(req.body.email), actif: true, approuve: true, utilise_mdp: true, }
    })

    if (user && user.mot_de_passe && bcrypt.compareSync(mot_de_passe, user.mot_de_passe!)) {
        try {
            const token = jwt.sign({ role: user.role, email, id: user.id }, String(process.env.JWT_SECRET));

            await user.update({
                derniere_connexion: new Date().toString()
            })

            res.cookie('flash_message', JSON.stringify(['successful_login']), flashMessageCookieOptions);
            res.cookie("token", token, { httpOnly: true, secure: false, sameSite: 'strict' });

            if ("return_to" in (req.session as CustomSession)) {
                return res.redirect((req.session as CustomSession).return_to!);
            }

            return res.redirect(`${res.locals.admin_prefix}/dashboard`);
        } catch (error) {
            console.log(error)
        }
    } else {
        res.cookie('flash_message', 'wrong_credentials', flashMessageCookieOptions);

        return res.redirect("/connexion");
    }
});

router.get('/inscription', async (req, res) => {
    res.render("pages/sign-in.njk", {
        flash_message: req.cookies.flash_message,
        signin_email: req.cookies.email,
    });
}).post('/inscription', async (req, res) => {
    const validator = SignInSchema.safeParse(req.body);

    if (!validator.success) {
        res.status(500)
        res.cookie('flash_message', 'register_fail', flashMessageCookieOptions)

        return res.redirect("/inscription");
    }

    try {
        await UserModel.create({
            email: String(req.body.email),
        });

        res.cookie('flash_message', 'register_success', flashMessageCookieOptions);

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: SOCKET_EVENTS.NEW_USER, payload: {} }));
            }
        });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            const user = await UserModel.findOne({
                where: { email: String(req.body.email) }
            })
            if (user) {
                if (user?.actif === false) {
                    res.cookie('flash_message', 'register_duplicate', flashMessageCookieOptions)
                } else {
                    res.cookie('flash_message', 'user_exists', flashMessageCookieOptions)
                    res.cookie('email', req.body.email, flashMessageCookieOptions)

                    return res.redirect("/connexion");
                }
            }
        } else {
            res.cookie('flash_message', 'register_fail', flashMessageCookieOptions)
        }
    }
    res.cookie('email', req.body.email, flashMessageCookieOptions)

    return res.redirect("/inscription");
});

router.get(['/approbation{/:token}'], async (req, res) => {
    let errorKey = "";
    let user = null;
    let isTokenValid = false;
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWT_APPROVAL_SECRET!) as UserTokenData;

        user = await UserModel.findByPk(decoded.userId);

        if (!user) {
            throw new Error("user_not_found");
        }

        if (user.actif === false) {
            throw new Error("user_not_active");
        }
        isTokenValid = true;
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            errorKey = 'expired_token'
        } else if (error.name === "JsonWebTokenError") {
            errorKey = 'invalid_token'
        } else {
            errorKey = error.message
        }
    }

    res.render("pages/sign-in-activation.njk", {
        flash_message: req.cookies?.flash_message || errorKey,
        signin_email: user?.email || "",
        is_token_valid: isTokenValid,
    });
}).post('/approbation{/:token}', async (req, res) => {
    let errorKey = "";
    const { token } = req.params;

    const validator = SignInActivationSchema.safeParse(req.body);

    if (!validator.success) {
        res.status(500)
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

        return res.redirect(`/approbation/${token}`);
    }

    try {
        if (!token) {
            throw new Error("missing_token");
        }

        const decoded = jwt.verify(token, process.env.JWT_APPROVAL_SECRET!) as UserTokenData;

        const user = await UserModel.findByPk(decoded.userId);

        if (!user) {
            throw new Error("user_not_found");
        }

        if (!user?.actif) {
            throw new Error("user_not_active");
        }

        if (user.mot_de_passe === null || user.mot_de_passe === "") {
            const payload = {
                mot_de_passe: bcrypt.hashSync(req.body.password, 8)
            }

            await user.update(payload);

            res.cookie('email', req.body.email, flashMessageCookieOptions);
            res.cookie('flash_message', 'account_created', flashMessageCookieOptions);
        } else {
            res.cookie('email', req.body.email, flashMessageCookieOptions);
            res.cookie('flash_message', 'account_already_created', flashMessageCookieOptions);
        }

        return res.redirect("/connexion");
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            errorKey = 'expired_token';
        } else if (error.name === "JsonWebTokenError") {
            errorKey = 'invalid_token';
        } else {
            errorKey = error as string
        }
    }

    res.cookie('flash_message', errorKey, flashMessageCookieOptions);

    return res.redirect(`/approbation/${token}`);
});


export default router;
