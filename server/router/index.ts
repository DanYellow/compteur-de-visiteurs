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

router.get("/", async (req, res) => {
    const nbPlaces = await PlaceModel.count();
    const place = await PlaceModel.findOne({ where: { slug: req.cookies.numixs_place } })


    if (!("numixs_place" in req.cookies)) {
        res.cookie('flash_message', "unset_place", { maxAge: 1000, httpOnly: true })
        return res.redirect("/choix-lieu")
    } else if (nbPlaces === 0) {
        res.cookie('flash_message', "no_place", { maxAge: 1000, httpOnly: true })

        return res.redirect("/lieu")
    } else if (!place) {
        res.cookie('flash_message', "unknown_place", { maxAge: 1000, httpOnly: true })

        return res.redirect("/choix-lieu")
    }

    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector.filter((item) => (!("listInChoices" in item) || item.listInChoices)),
        place,
    });
}).post("/", async (req, res) => {
    const validator = VisitorSchema.safeParse(req.body);
    if (!validator.success) {
        return res.status(500).json({ "success": false });
    }

    try {
        const place = await PlaceModel.findOne({ where: { slug: req.cookies.numixs_place } })
        const payload = {
            ...req.body,
            placeId: place!.get("id"),
        }

        await VisitModel.create(payload)
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
    });

    let place = null;
    if (req.cookies.flash_message === "set_place") {
        place = await PlaceModel.findOne({ where: { slug: req.cookies.numixs_place } })
    }

    res.render("pages/set-place.njk", {
        "places_list": listPlaces,
        flash_message: req.cookies.flash_message,
        place,
    });
}).post(["/choix-lieu"], async (req, res) => {
    const options = {
        // maxAge: 1000 * 60 * 15, // would expire after 15 minutes
        httpOnly: true, // The cookie only accessible by the web server
    }

    res.cookie('numixs_place', req.body.place, options)
    res.cookie('flash_message', "set_place", { maxAge: 1000, httpOnly: true })

    res.redirect("/choix-lieu");
});

export default router;
