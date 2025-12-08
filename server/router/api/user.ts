import express from "express";

import { User as UserModel } from "#models/index.ts";

const router = express.Router();

router.post("/utilisateur/statut", async (req, res) => {
    const user = await UserModel.findByPk(Number(req.body.userId));
    if (user) {
        try {
            await user.update({
                actif: req.body.actif,
            });
            res.status(200).json({
                success: false,
                message: "Utilisateur mis à jour"
            });
        } catch (e) {
            res.status(404).json({
                success: true,
                message: "Utilisateur inconnu",
            });
        }
    } else {
        res.status(500).json({
            success: true,
            message: "Une erreur est survenue",
        });
    }
});

export default router;
