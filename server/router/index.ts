import express from "express";

import { listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import { SOCKET_EVENTS } from '#scripts/utils.ts';
import { VisitorSchema } from "#scripts/schemas.ts";
import { wss } from "#server/index.ts";
import VisitModel from "#models/visit.ts";
import PlaceModel from "#models/place.ts";

import ApiRouter from "./api.ts";
import DownloadRouter from "./download.ts";
import AdminRouter from "./admin.ts";

import parseManifest from "#server/parse-manifest.ts";

const router = express.Router();

router.use(async (_req, res, next) => {
    const manifest = await parseManifest("manifest.json");
    res.locals = {
        ...res.locals,
        manifest,
    };

    next();
});


router.use("/api", ApiRouter);
router.use("/telecharger", DownloadRouter);
router.use("/", AdminRouter);

router.get("/", (req, res) => {
    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector.filter((item) => (!("listInChoices" in item) || item.listInChoices)),
    });
});

router.post("/", async (req, res) => {
    const validator = VisitorSchema.safeParse(req.body);
    if (!validator.success) {
        return res.status(500).json({ "success": false });
    }

    try {
        const payload = {
            ...req.body,
            lieu: res.locals.PLACE,
        }

        await VisitorModel.create(payload);
        await new Promise(r => setTimeout(r, 1500));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: SOCKET_EVENTS.VISITOR_REGISTERED, payload: req.body }));
            }
        });

        res.status(200).json({ "success": true })
    } catch (err) {
        console.log(err)
        res.status(500).json({ "success": false })
    }
});

router.get(["/choix-lieu"], async (req, res) => {
    const listPlaces = await PlaceModel.findAll({
        raw: true,
    })

    // res.setHeader('Set-Cookie', 'numixs_place=cookie_value; Max-Age=3600'); // Cookie expires in 1 hour

    res.render("pages/set-place.njk", {
        "list_places": listPlaces,
    });
}).post(["/choix-lieu"], async (req, res) => {
    const payload = {
        ...req.body,
    }
    console.log("payload", payload)
    // res.setHeader('Set-Cookie', 'numixs_place=cookie_value; Max-Age=3600'); // Cookie expires in 1 hour

    // res.render("pages/set-place.njk", {
    //     "list_places": listPlaces,
    // });
});

export default router;
