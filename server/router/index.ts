import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';
import crypto from "crypto";

import { listGroups as listBusinessSector, listDepartments, listAgeGroups, listGenders } from '#scripts/utils.shared';
import { SOCKET_EVENTS } from "#scripts/utils.shared";
import { VisitSchema } from "#scripts/schemas/index";
import { flashMessageCookieOptions, wss } from "#server/index";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel, VisitRegistered as VisitRegisteredModel, Visit as VisitModel } from "#models/index";
import { checkIpAdress, parseManifest, requireRoleMiddleware } from "#server/middlewares";

import ApiRouter from "#server/router/api/index";
import DownloadRouter from "#server/router/download";
import AdminRouter from "#server/router/admin";
import CredentialRouter from "#server/router/credential";
import CredentialsPasskeyRouter from "#server/router/credentials-passkey";
import PasswordRouter from "#server/router/password";

const router = express.Router();

router.use(async (req, res, next) => {
    const manifest = await parseManifest("manifest.json");
    res.locals = {
        ...res.locals,
        manifest,
        lieu: req.query.lieu,
    };

    next();
});

const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
const generateFormCode = () => {
    return Array.from({ length: 3 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
};
const hashPayload = (normalized: string) => crypto.createHash("sha256").update(normalized).digest("hex");

const normalizePayload = (payload: Record<string, any>) => {
    const sorted = Object.keys(payload)
        .sort()
        .reduce((acc, key) => {
            acc[key] =
                payload[key] === "oui" ? true :
                    payload[key] === "non" ? false :
                        payload[key];
            return acc;
        }, {} as Record<string, any>);

    return JSON.stringify(sorted);
};

router.get("/", checkIpAdress, async (req, res) => {
    const nbPlaces = await PlaceModel.count();

    if (nbPlaces === 0) {
        res.cookie('flash_message', JSON.stringify(["no_place"]), flashMessageCookieOptions)
        return res.redirect(`${res.locals.admin_prefix}/lieu`);
    } else if (!("lieu_numixs" in req.cookies)) {
        res.cookie('flash_message', JSON.stringify(["unset_place"]), flashMessageCookieOptions)
        return res.redirect("/choix-lieu");
    }

    const place = await PlaceModel.findOne({ where: { slug: req.cookies.lieu_numixs } })
    if (!place) {
        res.cookie('flash_message', JSON.stringify(["unknown_place"]), flashMessageCookieOptions)
        return res.redirect("/choix-lieu");
    }

    return res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector.filter((item) => (!("listInChoices" in item) || item.listInChoices)),
        place,
        list_departments: listDepartments,
        list_age_groups: listAgeGroups,
        list_genders: listGenders,
    });
}).post("/", checkIpAdress, async (req, res) => {
    const validator = VisitSchema.safeParse(req.body);
    if (!validator.success) {
        return res.status(500).json({ "success": false });
    }

    try {
        const place = await PlaceModel.findOne({ where: { slug: req.cookies.lieu_numixs } })
        if (!place) {
            throw new Error("Lieu non trouvé");
        }
        const payload = {
            ...req.body,
            lieu_id: place!.id,
        }

        const newVisit = await VisitModel.create(payload);

        const code = generateFormCode();

        const normalized = normalizePayload(req.body);
        const hash = hashPayload(normalized);

        const existingVisit = await VisitRegisteredModel.findOne({ where: { hash } });
        if (!existingVisit) {
            await VisitRegisteredModel.create({ code, contenu: req.body, hash });
        }

        await new Promise(r => setTimeout(r, 1500));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: SOCKET_EVENTS.VISITOR_REGISTERED, payload: req.body }));
            }
        });

        res.status(200).json({
            success: true,
            data: {
                ...(await newVisit.getPlace()).toJSON(),
                code: existingVisit ? existingVisit.code : code,
            }
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ "success": false })
    }
});

router.get(["/choix-lieu"], async (req, res) => {
    const listPlaces = await PlaceModel.findAll({
        raw: true,
        order: [["nom", "ASC"]],
        where: {
            ouvert: {
                [Op.eq]: 1,
            }
        },
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
    });

    let place = null;

    if ("lieu_numixs" in req.cookies) {
        place = await PlaceModel.findOne({ where: { slug: req.cookies.lieu_numixs } })
    }

    res.render("pages/set-place.njk", {
        "places_list": listPlaces,
        place,
    });
}).post(["/choix-lieu"], async (req, res) => {
    const place = await PlaceModel.findOne({ where: { slug: req.body.place, ouvert: true } });
    const listFlashMessages = []
    if (place) {
        const daySelected = DateTime.now();
        const closedDays = (await place.getRegularOpening()).jours_fermeture || [];
        const isClosedDay = closedDays.includes(String(daySelected.weekday));
        if (isClosedDay) {
            listFlashMessages.push("closed_place")
        }
        res.cookie('lieu_numixs', req.body.place, { httpOnly: true })
        listFlashMessages.push("set_place")
    } else {
        listFlashMessages.push("not_found_place")
    }
    res.cookie('flash_message', JSON.stringify(listFlashMessages), flashMessageCookieOptions)

    res.redirect("/choix-lieu");
});

router.get("/interdit", async (_, res) => {
    res.status(403).render("pages/not-allowed.njk");
});

router.post('/deconnexion', (_, res) => {
    res.cookie('flash_message', JSON.stringify(["success_logout"]), flashMessageCookieOptions)
    res.clearCookie("token");
    res.redirect('/connexion');
});


router.use(CredentialRouter);
router.use(CredentialsPasskeyRouter);
router.use(PasswordRouter);
router.use("/api", ApiRouter);
router.use("/telecharger", requireRoleMiddleware("READ_ONLY"), DownloadRouter);
router.use(`/admin${process.env?.ADMIN_SUFFIX ? `-${process.env.ADMIN_SUFFIX}` : ""}`, requireRoleMiddleware("READ_ONLY"), AdminRouter);

if (process.env.NODE_ENV === "development") {
    const DebugRouter = await import("./debug");
    router.use("/debug", DebugRouter.default);

    const EmailRouter = await import("./email");
    router.use("/email", EmailRouter.default);
}

export default router;
