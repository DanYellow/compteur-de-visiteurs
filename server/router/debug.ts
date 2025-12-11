import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import { User as UserModel } from "#models/index.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

router.get("/activation", async (req, res) => {
    if (req.query.email) {
        const user = await UserModel.findOne({
            where: { email: String(req.query.email) },
        });

        if (user) {
            await user.update({
                actif: true,
            });

            return res.status(200).json({"message": "Succès. Vous allez être déconnecté(e)."});
        }
    }

    return res.status(500).json({"message": "Erreur"});
});

router.get("/promote", async (req, res) => {
    if (req.query.email) {
        const user = await UserModel.findOne({
            where: { email: String(req.query.email) },
        });

        if (user) {
            await user.update({
                role: String(req.query?.role || "ADMIN"),
            });

            const token = jwt.sign({ role: user.role, email: user.email }, String(process.env.JWT_SECRET));
            res.cookie("token", token, { httpOnly: true, secure: false });

            return res.status(200).json({"message": "succès"});
        }
    }

    return res.status(500).json({"message": "erreur"});
});

export default router;
