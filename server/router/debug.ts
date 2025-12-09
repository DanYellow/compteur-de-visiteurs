import express from "express";
import { DateTime } from "luxon";
import { UniqueConstraintError } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import {
    SignInSchema,
    SignInConfirmationSchema,
    LoginSchema,
} from "#scripts/schemas.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { User as UserModel } from "#models/index.ts";
import { CustomSession } from "#types";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

router.get("/confirmation", async (req, res) => {
    if (req.query.email) {
        const user = await UserModel.findOne({
            where: { email: String(req.query.email) },
        });

        if (user) {
            await user.update({
                actif: true,
            });

            return res.status(200).json({"message": "succès"});
        }
    }
    
    return res.status(500).json({"message": "erreur"});
});

export default router;
