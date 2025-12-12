import express from "express";
import { UniqueConstraintError } from 'sequelize';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';

import { SignInSchema, SignInActivationSchema, LoginSchema } from "#scripts/schemas.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { User as UserModel } from "#models/index.ts";
import { CustomSession, UserTokenData } from "#types";

dotenv.config({ path: `${process.cwd()}/.env.local` })

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
        where: { email: String(req.body.email), actif: true }
    })

    if (user && user.mot_de_passe && bcrypt.compareSync(mot_de_passe, user.mot_de_passe!)) {
        try {
            const token = jwt.sign({ role: user.role, email, id: user.id }, String(process.env.JWT_SECRET));

            await UserModel.update({
                derniere_connexion: new Date().toString()
            }, {
                where: { email: String(email), actif: true }
            })

            res.cookie('flash_message', 'successful_login', flashMessageCookieOptions);
            res.cookie("token", token, { httpOnly: true, secure: false, sameSite: 'strict' });

            if ("return_to" in (req.session as CustomSession)) {
                return res.redirect((req.session as CustomSession).return_to!);
            }

            return res.redirect(`${res.locals.admin_prefix}/dashboard`);
        } catch (error) {
            console.log("ee", error)
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
        res.cookie('flash_message', 'register_success', flashMessageCookieOptions)
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

// router.get('/activation/:token', async (req, res) => {
//     let error_key = "";
//     try {
//         const { token } = req.params;
//         const decoded = jwt.verify(token, process.env.JWT_ACTIVATION_SECRET!) as UserTokenData;

//         const user = await UserModel.findByPk(decoded.userId);

//         if (!user) {
//             throw new Error("user_not_found");
//         }

//         if (user?.actif) {
//             throw new Error("user_not_active");
//         }
//     } catch (error: any) {
//         if (error.name === "TokenExpiredError") {
//             error_key = 'expired_token'
//         } else if (error.name === "JsonWebTokenError") {
//             error_key = 'invalid_token'
//         } else {
//             error_key = error as string
//         }
//     }

//     res.render("pages/sign-in-activation.njk", {
//         flash_message: req.cookies?.flash_message || error_key,
//         signin_email: req.cookies.email,
//     });
// }).post('/activation/:token', async (req, res) => {
//     let error_key = "";
//     const { token } = req.params;

//     const validator = SignInActivationSchema.safeParse(req.body);

//     if (!validator.success) {
//         res.status(500)
//         res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

//         return res.redirect(`/activation/${token}`);
//     }

//     try {
//         jwt.verify(token, process.env.JWT_ACTIVATION_SECRET!);

//         const user = await UserModel.findOne({
//             where: { email: String(req.body.email) }
//         })

//         if (!user) {
//             throw new Error("user_not_found");
//         }

//         if (!user?.actif) {
//             throw new Error("user_not_active");
//         }

//         if (user.mot_de_passe === null || user.mot_de_passe === "") {
//             const payload = {
//                 mot_de_passe: bcrypt.hashSync(req.body.password, 8)
//             }

//             await user.update(payload);

//             res.cookie('email', req.body.email, flashMessageCookieOptions);
//             res.cookie('flash_message', 'account_created', flashMessageCookieOptions);
//         } else {
//             res.cookie('email', req.body.email, flashMessageCookieOptions);
//             res.cookie('flash_message', 'account_already_created', flashMessageCookieOptions);
//         }

//         return res.redirect("/connexion");
//     } catch (error: any) {
//         if (error.name === "TokenExpiredError") {
//             error_key = 'expired_token';
//         } else if (error.name === "JsonWebTokenError") {
//             error_key = 'invalid_token';
//         } else {
//             error_key = error as string
//         }
//     }

//     res.cookie('flash_message', error_key, flashMessageCookieOptions);

//     return res.redirect(`/activation/${token}`);
// });

router.get('/activation', async (req, res) => {
    let error_key = null;
    console.log("req.get('host')", req.get('host'))
    res.render("pages/sign-in-activation.njk", {
        flash_message: req.cookies?.flash_message || error_key,
        signin_email: req.cookies.email,
    });
}).post('/activation', async (req, res) => {
    let error_key = "";

    const validator = SignInActivationSchema.safeParse(req.body);

    if (!validator.success) {
        res.status(500)
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

        return res.redirect(`/activation/${token}`);
    }

    try {
        const user = await UserModel.findOne({
            where: { email: String(req.body.email) }
        })

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
            error_key = 'expired_token';
        } else if (error.name === "JsonWebTokenError") {
            error_key = 'invalid_token';
        } else {
            error_key = error as string
        }
    }

    res.cookie('flash_message', error_key, flashMessageCookieOptions);

    return res.redirect(`/activation`);
});

export default router;
