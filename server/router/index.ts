import express from "express";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import { listGroups as listBusinessSector, listDepartments, listAgeGroups } from '#scripts/utils.shared.ts';
import { SOCKET_EVENTS } from '#scripts/utils.ts';
import { VisitorSchema } from "#scripts/schemas.ts";
import { flashMessageCookieOptions, wss } from "#server/index.ts";
import { Place as PlaceModel, RegularOpening as RegularOpeningModel, User as UserModel, Visit as VisitModel } from "#models/index.ts";
import { parseManifest, requireRoleMiddleware } from "#server/middlewares.ts";

import ApiRouter from "./api/index.ts";
import DownloadRouter from "./download.ts";
import AdminRouter from "./admin.ts";
import CredentialRouter from "./credential.ts";
import CredentialsPasskeyRouter from "./credentials-passkey.ts";
import PasswordRouter from "./password.ts";

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
// https://apidog.com/fr/blog/node-js-express-authentication-7/

router.get("/", async (req, res) => {
    const nbPlaces = await PlaceModel.count();

    if (nbPlaces === 0) {
        res.cookie('flash_message', JSON.stringify(["no_place"]), { maxAge: 1000, httpOnly: true })
        return res.redirect(`${res.locals.admin_prefix}/lieu`);
    } else if (!("lieu_numixs" in req.cookies)) {
        res.cookie('flash_message', JSON.stringify(["unset_place"]), { maxAge: 1000, httpOnly: true })
        return res.redirect("/choix-lieu");
    }

    const place = await PlaceModel.findOne({ where: { slug: req.cookies.lieu_numixs } })
    if (!place) {
        res.cookie('flash_message', JSON.stringify(["unknown_place"]), { maxAge: 1000, httpOnly: true })
        return res.redirect("/choix-lieu");
    }

    return res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector.filter((item) => (!("listInChoices" in item) || item.listInChoices)),
        place,
        list_departments: listDepartments,
        list_age_ranges: listAgeGroups,
    });
}).post("/", async (req, res) => {
    const validator = VisitorSchema.safeParse(req.body);
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

        //         const [order, created] = await sequelize.query(`
        //     INSERT INTO orders (customer_id, amount, created_at, updated_at)
        //     SELECT :customerId, :amount, NOW(), NOW()
        //     FROM customers
        //     WHERE id = :customerId AND status = 'active'
        //     RETURNING *;
        //   `, {
        //     replacements: {
        //       customerId,
        //       amount: orderData.amount
        //     },
        //     type: QueryTypes.INSERT
        //   });

        // if (!created || order.length === 0) {
        //     throw new Error('Cannot create order: Customer not active');
        //   }

        const newVisit = await VisitModel.create(payload)
        await new Promise(r => setTimeout(r, 1500));

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: SOCKET_EVENTS.VISITOR_REGISTERED, payload: req.body }));
            }
        });

        res.status(200).json({ "success": true, data: (await newVisit.getPlace()).toJSON() })
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
    const listFlashMessages = JSON.parse(req.cookies.flash_message || "[]")

    if ("lieu_numixs" in req.cookies) {
        place = await PlaceModel.findOne({ where: { slug: req.cookies.lieu_numixs } })
    }

    res.render("pages/set-place.njk", {
        "places_list": listPlaces,
        flash_message: listFlashMessages.reduce((a: Record<string, string>, v: string) => ({ ...a, [v]: v }), {}),
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

router.get("/interdit", async (req, res) => {
    res.render("pages/not-allowed.njk");
});

router.post('/deconnexion', (req, res) => {
    res.cookie('flash_message', "success_logout", flashMessageCookieOptions)
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
    const DebugRouter = await import("./debug.ts");
    router.use("/debug", DebugRouter.default);

    const EmailRouter = await import("./email.ts");
    router.use("/email", EmailRouter.default);
}

export default router;
