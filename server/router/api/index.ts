import express from "express";

import UserApiRouter from "#server/router/api/user.ts";

const router = express.Router();

router.use("/", UserApiRouter);

export default router;
