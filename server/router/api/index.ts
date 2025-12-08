import express from "express";

export const PERIOD_PREDICATE = {
    "jour": {
        "substitution": "%k",
        "luxon": "day",
        "property": "hour",
    },
    "semaine": {
        "substitution": "%u",
        "luxon": "week",
        "property": "weekday",
    },
    "mois": {
        "substitution": "%W",
        "luxon": "month",
        "property": "weekNumber",
    },
    "annee": {
        "substitution": "%m",
        "luxon": "year",
        "property": "month",
    },
}

import UserApiRouter from "#server/router/api/user.ts";
import EventApiRouter from "#server/router/api/event.ts";
import PlaceApiRouter from "#server/router/api/place.ts";
import VisitApiRouter from "#server/router/api/visit.ts";

const router = express.Router();

router.use("/", UserApiRouter);
router.use("/", EventApiRouter);
router.use("/", PlaceApiRouter);
router.use("/", VisitApiRouter);

export default router;
