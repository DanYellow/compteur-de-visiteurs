import express from "express";
import jwt from "jsonwebtoken";

import { getUser, requireRoleMiddleware } from "#server/middlewares.ts";
import { User as UserModel, UserPublicKeyCredentials as UserPublicKeyCredentialsModel } from "#models/index.ts";
import { LIST_ROLES } from "#scripts/utils.shared.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { UserTokenData } from "#types";

const router = express.Router();

router.get(['/utilisateurs'], getUser, requireRoleMiddleware("ADMIN"), async (req, res) => {
    const listUsers = await UserModel.findAll({
        raw: true,
    });

    res.render("pages/admin/list-users.njk", {
        list_users: listUsers,
        list_roles: LIST_ROLES,
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
        list_roles: LIST_ROLES,
        flash_message: req.cookies.flash_message,
    });
}).post(['/utilisateur/:userId'], getUser, requireRoleMiddleware(""), async (req, res) => {
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
