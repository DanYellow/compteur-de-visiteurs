import express from "express";
import jwt from "jsonwebtoken";

import { getUser, requireRoleMiddleware } from "#server/middlewares.ts";
import { User as UserModel, UserPublicKeyCredentials as UserPublicKeyCredentialsModel } from "#models/index.ts";
import { LIST_ROLES } from "#scripts/utils.shared.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { UserTokenData } from "#types";
import { Op } from "sequelize";

const NUMBER_REGEX = /^\d+$/;

const router = express.Router();

router.get(['/utilisateurs'], getUser, requireRoleMiddleware("ADMIN"), async (req, res) => {
    const listUsers = await UserModel.findAll({
        raw: true,
        ...( req.query?.actif && {
            where: {
                actif: false
            }
        })
    });

    res.render("pages/admin/list-users.njk", {
        list_users: listUsers.map((item) => {
            return {
                ...item,
                role: LIST_ROLES.find((role) => item.role === role.value)
            }
        }),
        actif: req.query.actif,
    });
})

router.get(['/utilisateur/:userId', '/utilisateur/moi'], getUser, requireRoleMiddleware(""), async (req, res) => {
    let user = await UserModel.findByPk(req.params.userId, {
        raw: true,
    });

    if (req.params.userId === "moi") {
        try {
            const token = jwt.verify(req.cookies.token, String(process.env.JWT_SECRET)) as UserTokenData;

            user = await UserModel.findOne({
                where: {
                    email: token.email
                },
                raw: true,
            });
        } catch (error) {
            console.log(error)
        }
    }

    res.render("pages/admin/add_edit-user.njk", {
        user,
        is_edit: true,
        list_roles: LIST_ROLES.filter((item) => item.value !== "SUPER_ADMIN"),
        flash_message: req.cookies.flash_message,
    });
}).post(['/utilisateur/:userId'], getUser, requireRoleMiddleware(""), async (req, res, next) => {
    if ("userId" in req.params && !NUMBER_REGEX.test(req.params.userId)) {
        return next();
    }

    const user = await UserModel.findByPk(req.body.id);
    const payload = {
        ...req.body,
    };

    if (user) {
        await user.update(payload);
        if (String(user.id) === String(req.current_user!.id)) {
            req.current_user = user.toJSON();
        }
        res.cookie('flash_message', "update_success", flashMessageCookieOptions);
    } else {
        res.cookie('flash_message', "update_error", flashMessageCookieOptions);

    }

    res.redirect(`${res.locals.admin_prefix}/utilisateur/${req.params.userId}`);
}).post(['/utilisateur/suppression'], getUser, requireRoleMiddleware("ADMIN"), async (req, res) => {
    try {
        await UserModel.destroy({
            where: {
                id: req.body.id,
                role: { [Op.notIn]: ["ADMIN"] }
            }
        })
        res.cookie('flash_message', "delete_success", flashMessageCookieOptions);
    } catch (error) {
        console.log(error)
        res.cookie('flash_message', "delete_error", flashMessageCookieOptions);
    }

    res.redirect(`${res.locals.admin_prefix}/utilisateurs`);
})

router.get(['/utilisateur/:userId/passkeys', '/utilisateur/moi/passkeys'], getUser, requireRoleMiddleware(""), async (req, res) => {
    let user = await UserModel.findByPk(req.params.userId, {
        nest: true,
        include: [{
            model: UserPublicKeyCredentialsModel,
            as: "listPasskeys",
        }]
    });

    if (req.params.userId === "moi") {
        try {
            const token = jwt.verify(req.cookies.token, String(process.env.JWT_SECRET)) as UserTokenData;

            user = await UserModel.findOne({
                where: {
                    email: token.email
                },
                nest: true,
                include: [{
                    model: UserPublicKeyCredentialsModel,
                    as: "listPasskeys",
                }]
            });
        } catch (error) {
            console.log(error)
        }
    }

    res.render("pages/admin/add_edit-user-passkeys.njk", {
        user,
        flash_message: req.cookies.flash_message,
    });
}).post(['/utilisateur/:userId/passkeys', '/utilisateur/moi/passkeys'], getUser, requireRoleMiddleware(""), async (req, res) => {
    try {
        let passkey = await UserPublicKeyCredentialsModel.findOne({
            where: {
                id: Number(req.body.id),
                user_id: req.current_user!.id,
            }
        })

        if (!passkey) {
            throw new Error("error");
        }

        await passkey.update(req.body)

        res.cookie('flash_message', "update_success", flashMessageCookieOptions);
        res.redirect(`${res.locals.admin_prefix}/utilisateur/moi/passkeys`)
    } catch (error) {
        console.log("error", error)

        res.redirect(`${res.locals.admin_prefix}/utilisateur/moi/passkeys`)
    }
}).post(['/utilisateur/passkey/suppression'], getUser, requireRoleMiddleware(""), async (req, res) => {
    try {
        const user = await UserModel.findByPk(req.body.userId, {
            include: [{
                model: UserPublicKeyCredentialsModel,
                as: "listPasskeys",
            }]
        })

        if (!user) {
            throw new Error("user_not_found");
        }

        if (user.listPasskeys.length == 1 && user.utilise_mdp === false) {
            throw new Error("no_auth_method");
        }

        await UserPublicKeyCredentialsModel.destroy({
            where: {
                id: req.body.passkeyId,
            }
        })

        res.cookie('flash_message', "delete_success", flashMessageCookieOptions);
    } catch (error: any) {
        res.cookie('flash_message', error.message, flashMessageCookieOptions);
    }

    res.redirect(`${res.locals.admin_prefix}/utilisateur/moi/passkeys`)
})

export default router;
