import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import { mailTransporter, renderEmail } from "#server/utils.ts";
import { User as UserModel } from "#models/index.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

router.get("/passkey", async (req, res) => {
    return res.send(renderEmail("emails/new-passkey.njk"));
});


export default router;
