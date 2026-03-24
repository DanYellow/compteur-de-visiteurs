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
    "tous": {
        "substitution": "%Y",
        "luxon": "year",
        "property": "year",
    },
}

import UserApiRouter from "#server/router/api/user";
import EventApiRouter from "#server/router/api/event";
import PlaceApiRouter from "#server/router/api/place";
import VisitApiRouter from "#server/router/api/visit";

const router = express.Router();

router.use("/", UserApiRouter);
router.use("/", EventApiRouter);
router.use("/", PlaceApiRouter);
router.use("/", VisitApiRouter);

export default router;
