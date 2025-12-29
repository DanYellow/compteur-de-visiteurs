import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import { User as UserModel } from "#models/index.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

router.get("/approbation", async (req, res) => {
    if (req.query.email) {
        const user = await UserModel.findOne({
            where: { email: String(req.query.email) },
        });

        if (user) {
            await user.update({
                actif: true,
                ...(req.query.mot_de_passe ? {
                    mot_de_passe: bcrypt.hashSync(String(req.query.mot_de_passe), 8)
                } : {})
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
