import express from "express";
import { DateTime } from "luxon";
import { UniqueConstraintError } from 'sequelize';
import bcrypt from "bcryptjs";


import { SignInSchema, SignInConfirmationSchema, LoginSchema } from "#scripts/schemas.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { User as UserModel } from "#models/index.ts";

const router = express.Router();

const users = [{ id: 1, username: 'user1', password: bcrypt.hashSync('password1', 8) }];
router.get('/connexion', async (req, res) => {
    res.render("pages/login.njk", {
        flash_message: req.cookies.flash_message,
        signin_email: req.query.email,
    });
}).post('/connexion', async (req, res) => {
    const validator = LoginSchema.safeParse(req.body);

    if (!validator.success) {
        res.status(500)
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions);

        return res.redirect("/connexion");
    }

    const { email, mot_de_passe } = req.body;

    const user = await UserModel.findOne({
        where: { email: String(req.body.email) }
    })

    if (user && bcrypt.compareSync(mot_de_passe, user.mot_de_passe!)) {
        try {
            UserModel.update({
                derniere_connexion: new Date().toString()
            }, {
                where: { email: String(email) }
            })
        } catch (error) {

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

router.get('/confirmation', async (req, res) => {
    res.render("pages/sign-in-confirmation.njk", {
        flash_message: req.cookies.flash_message,
        signin_email: req.cookies.email,
    });
}).post('/confirmation', async (req, res) => {
    const validator = SignInConfirmationSchema.safeParse(req.body);

    if (!validator.success) {
        res.status(500)
        res.cookie('flash_message', 'form_not_valid', flashMessageCookieOptions)
        return res.redirect("/confirmation");
    }

    const user = await UserModel.findOne({
        where: { email: String(req.body.email) }
    })

    if (user) {
        // if (user.actif === false) {
        //     res.cookie('flash_message', 'account_not_active', flashMessageCookieOptions)

        //     return res.redirect("/confirmation");
        // }

        if (user.mot_de_passe === null || user.mot_de_passe === "") {
            const payload = {
                mot_de_passe: bcrypt.hashSync(req.body.password, 8)
            }

            await UserModel.update(payload,
                {
                    where: { email: String(req.body.email) }
                })
            res.cookie('email', req.body.email, flashMessageCookieOptions);
            res.cookie('flash_message', 'account_created', flashMessageCookieOptions);

            return res.redirect("/connexion");
        } else {
            res.cookie('email', req.body.email, flashMessageCookieOptions);
            res.cookie('flash_message', 'account_already_created', flashMessageCookieOptions);

            return res.redirect("/connexion");
        }
    } else {
        res.cookie('flash_message', 'account_not_found', flashMessageCookieOptions)
    }

    return res.redirect("/confirmation");
});


export default router;
