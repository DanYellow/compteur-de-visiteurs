import express from "express";
import { DateTime, Info } from "luxon";
import { Op, literal } from 'sequelize';

import { capitalizeFirstLetter, listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import { VisitorSchema } from "#scripts/schemas.ts";
import { wss } from "../index.ts";
import VisitorModel from "#models/visitor.ts";
import config from "#config" with { type: "json" };

import ApiRouter from "./api.ts";
import DownloadRouter from "./download.ts";
import parseManifest from "#server/parse-manifest.ts";

const router = express.Router();

router.use(async (_req, res, next) => {
    const manifest = {
        manifest: await parseManifest("manifest.json"),
    };
    res.locals = manifest;

    next();
});


router.use("/api", ApiRouter);
router.use("/telecharger", DownloadRouter);

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
                client.send(JSON.stringify({ type: "VISITOR_REGISTERED", payload: req.body }));
            }
        });

        res.status(200).json({ "success": true })
    } catch (err) {
        console.log(err)
        res.status(500).json({ "success": false })
    }
});

router.get(["/dashboard"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    res.render("pages/dashboard.njk", {
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": config.CLOSED_DAYS_INDEX.split(",").includes(String(daySelected.weekday)),
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
    });
})

router.get(["/visiteurs", "/liste-visiteurs", "/visites"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    // const request = await fetch(`http://${req.get('host')}/api?filtre=${configKey}`);
    // const records = await request.json();

    const [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);
    const records = await VisitorModel.findAll({
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").set({ hour: openHours }).toString(),
                    [Op.lte]: daySelected.endOf("day").set({ hour: closeHours }).toString(),
                }
            }
        },
        order: [['date_passage', 'DESC']]
    });

    const visitorsSummary = await VisitorModel.findAll({
        raw: true,
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: daySelected.startOf("day").set({ hour: openHours }).toString(),
                    [Op.lte]: daySelected.endOf("day").set({ hour: closeHours }).toString(),
                }
            }
        },
        attributes: [
            ...(listBusinessSector.map((item) => [literal(`COUNT (distinct "id") FILTER (WHERE "${item.value}" = 'oui')`), item.value]))
        ]
    });

    res.render("pages/members-list.njk", {
        visitors_summary: visitorsSummary[0],
        "visitors_list": records,
        "list_business_sector": listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)),
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": config.CLOSED_DAYS_INDEX.split(",").includes(String(daySelected.weekday)),
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
    });
});

export default router;
