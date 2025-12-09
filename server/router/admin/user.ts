import express from "express";
import jwt from "jsonwebtoken";

import { requireRoleMiddleware } from "#server/middlewares.ts";
import { User as UserModel } from "#models/index.ts";
import { LIST_ROLES } from "#scripts/utils.shared.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { UserToken } from "#types";

const router = express.Router();

router.get(['/utilisateurs'], requireRoleMiddleware("ADMIN"), async (req, res) => {

    const listUsers = await UserModel.findAll({
        raw: true,
    });

    res.render("pages/admin/list-users.njk", {
        list_users: listUsers,
        list_roles: LIST_ROLES,
    });
})

router.get(['/utilisateur/:userId', '/utilisateur/moi'], requireRoleMiddleware(""), async (req, res) => {
    let user = await UserModel.findByPk(req.params.userId, {
        raw: true,
    });

    if (req.params.userId === "moi") {
        try {
            const token = jwt.verify(req.cookies.token, String(process.env.JWT_SECRET)) as UserToken;

            user = await UserModel.findOne({
                where: {
                    email: token.email
                },
                raw: true,
            });
        } catch (error) {
            console.log("ee", error)
        }
    }

    res.render("pages/admin/add_edit-user.njk", {
        user,
        is_edit: true,
        list_roles: LIST_ROLES,
        flash_message: req.cookies.flash_message,
    });
}).post(['/utilisateur/:userId'], requireRoleMiddleware(""), async (req, res) => {
    const user = await UserModel.findByPk(req.params.userId);

    const payload = {
        ...req.body,
    };

    if (user) {
        await user.update(payload);
        res.cookie('flash_message', "update_success", flashMessageCookieOptions);
    } else {
        res.cookie('flash_message', "update_error", flashMessageCookieOptions);

    }


    res.redirect(`${res.locals.admin_prefix}/utilisateur/${req.params.userId}`);
})


export default router;
