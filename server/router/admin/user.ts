import express from "express";

import { requireRoleMiddleware } from "#server/middlewares.ts";
import { User as UserModel } from "#models/index.ts";

const router = express.Router();

router.get(['/utilisateurs'], requireRoleMiddleware(), async (req, res) => {

    const listUsers = UserModel.findAll({
        raw: true,
    });

    res.render("pages/admin/list-users.njk", {
        list_users: listUsers
    });
})

export default router;
