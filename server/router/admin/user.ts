import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

import { requireMinimumRole } from "#server/middlewares";
import { User as UserModel, UserPublicKeyCredentials as UserPublicKeyCredentialsModel } from "#models/index";
import { LIST_ROLES } from "#scripts/utils.shared";
import { flashMessageCookieOptions } from "#server/index";
import type { UserTokenData } from "#types";

const NUMBER_REGEX = /^\d+$/;

const router = express.Router();

router.get(['/utilisateurs'], requireMinimumRole("ADMIN"), async (req, res) => {
    const listUsers = await UserModel.findAll({
        raw: true,
        ...(req.query?.filtre && {
            where: {
                ...(req.query?.filtre === "approuver" && { approuve: false }),
                ...(req.query?.filtre === "actif" && { actif: true }),
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
        filtre: req.query.filtre,
    });
})

router.get(['/utilisateur/:userId', '/utilisateur/moi'], requireMinimumRole(), async (req, res) => {
    let user = await UserModel.findByPk(Number(req.params.userId), {
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
            }) as UserModel;
        } catch (error) {
            console.log(error)
        }
    }

    res.render("pages/admin/add_edit-user.njk", {
        user,
        is_edit: true,
        list_roles: LIST_ROLES.filter((item) => item.value !== "SUPER_ADMIN"),
    });
}).post(['/utilisateur/:userId'], requireMinimumRole(""), async (req, res, next) => {
    if ("userId" in req.params && !NUMBER_REGEX.test(String(req.params.userId)) && req.params.userId !== "moi") {
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
        res.cookie('flash_message', JSON.stringify(['update_success']), flashMessageCookieOptions);
    } else {
        res.cookie('flash_message', JSON.stringify(['update_error']), flashMessageCookieOptions);
    }

    res.redirect(`${res.locals.admin_prefix}/utilisateur/${req.params.userId}`);
}).post(['/utilisateur/suppression'], requireMinimumRole("ADMIN"), async (req, res) => {
    try {
        await UserModel.destroy({
            where: {
                id: req.body.id,
                role: { [Op.notIn]: ["ADMIN"] }
            }
        })
        res.cookie('flash_message', JSON.stringify(['delete_success']), flashMessageCookieOptions);
    } catch (error) {
        res.cookie('flash_message', JSON.stringify(['delete_error']), flashMessageCookieOptions);
    }

    res.redirect(`${res.locals.admin_prefix}/utilisateurs`);
})

router.get(['/utilisateur/:userId/passkeys', '/utilisateur/moi/passkeys'], requireMinimumRole(), async (req, res) => {
    if (req.params.userId !== "moi" && String(req.params.userId) !== String(res.locals.current_user!.id)) {
        return res.redirect("/interdit");
    }

    const userId = req.params.userId === "moi" ? res.locals.current_user!.id : req.params.userId;
    const user = await UserModel.findByPk(Number(userId), {
        nest: true,
        include: [{
            model: UserPublicKeyCredentialsModel,
            as: "listPasskeys",
        }]
    });

    res.render("pages/admin/add_edit-user-passkeys.njk", {
        user,
    });
}).post(['/utilisateur/:userId/passkeys', '/utilisateur/moi/passkeys'], requireMinimumRole(), async (req, res) => {
    if (req.params.userId !== "moi" && String(req.params.userId) !== String(res.locals.current_user!.id)) {
        return res.redirect("/interdit");
    }

    try {
        const passkey = await UserPublicKeyCredentialsModel.findOne({
            where: {
                id: Number(req.body.id),
                user_id: req.current_user!.id,
            }
        })

        if (!passkey) {
            throw new Error("error");
        }

        await passkey.update(req.body)

        res.cookie('flash_message', JSON.stringify(['update_success']), flashMessageCookieOptions);
        res.redirect(`${res.locals.admin_prefix}/utilisateur/moi/passkeys`)
    } catch (error) {
        res.redirect(`${res.locals.admin_prefix}/utilisateur/moi/passkeys`)
    }
}).post(['/utilisateur/passkey/suppression'], requireMinimumRole(), async (req, res) => {
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

        res.cookie('flash_message', JSON.stringify(['delete_success']), flashMessageCookieOptions);
    } catch (error: any) {
        res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions);
    }

    res.redirect(`${res.locals.admin_prefix}/utilisateur/moi/passkeys`)
})

export default router;
