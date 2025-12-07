import express from "express";
import { Info } from "luxon";

import { capitalizeFirstLetter, DEFAULT_CLOSE_HOURS, DEFAULT_OPEN_HOURS, listPlaceTypes } from '#scripts/utils.shared.ts';
import { PlaceSchema } from "#scripts/schemas.ts";
import { slugify } from "#scripts/utils.ts";
import { DEFAULT_CLOSED_DAYS } from "#scripts/utils.shared.ts";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel } from "#models/index.ts";
import { PlaceRaw } from "#types";
import { authenticateMiddleware } from "#server/middlewares.ts";

const router = express.Router();

router.get(['/utilisateurs'], authenticateMiddleware, async (req, res) => {


    res.render("pages/admin/list-users.njk", {
        list_users: []
    });
})

export default router;
