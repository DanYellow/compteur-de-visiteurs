import express from "express";
import { DateTime, Info } from "luxon";
import { Op, type InferCreationAttributes } from "sequelize";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";

import { capitalizeFirstLetter, listAgeGroups, listGroups as listBusinessSector, listDepartments, listGenders } from '#scripts/utils.shared';
import { requireMinimumRole } from "#server/middlewares";

import { Place as PlaceModel, RegularOpening as RegularOpeningModel, Event as EventModel, Visit as VisitModel } from "#models/index";
import type { CommonRegularOpening, EventRaw, PlaceRaw, csvVisit } from "#types";
import { flashMessageCookieOptions } from "#server/index";
import { dbCsvGroupsMapping } from "#types";

import { DEFAULT_CLOSED_DAYS, DEFAULT_OPEN_HOURS, DEFAULT_CLOSE_HOURS } from "#scripts/utils.shared";
import { computedPlaces, getVisitsSummaries } from "#server/utils.server";
import { expectedCsvHeaders, VisitCsvSchema } from "#scripts/schemas/visit-csv";

const router = express.Router();

const upload = multer({ dest: 'tmp/' });

router.get(["/visiteurs", "/visites"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.date) {
        const tmpDate = DateTime.fromISO(req.query.date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    let closedDays: string[] = DEFAULT_CLOSED_DAYS;

    const placeSelected = String(req.query?.lieu || "tous");
    let place = null;
    let regularOpening = {};
    let listAllEvents: EventModel[] = []

    const startTime = daySelected.startOf("month").minus({ week: 1 });
    const endTime = daySelected.endOf("month").plus({ week: 1 });

    if (placeSelected !== "tous") {
        place = await PlaceModel.findOne({
            where: { slug: placeSelected },
            include: [
                {
                    model: EventModel,
                    as: "listEvents",
                    attributes: {
                        include: ["nom", "heure_ouverture", "heure_fermeture"]
                    },
                    required: false,
                    where: {
                        date: {
                            [Op.between]: [startTime.toString(), endTime.toString()],
                        }
                    },
                    through: {
                        attributes: [],
                    },
                    include: [{
                        model: PlaceModel,
                        as: "listPlaces",
                        through: {
                            attributes: [],
                        },
                    }]
                }
            ],
            attributes: {
                exclude: ["date_creation", "place_id"]
            }
        })

        if (place) {
            let _regularOpening = await place.getRegularOpening();
            closedDays = (_regularOpening.jours_fermeture as string[]) || [];
            regularOpening = {
                ..._regularOpening.toJSON(),
                jours_fermeture: closedDays,
                jours_fermeture_litteral: Info.weekdays('long', { locale: 'fr' }).filter((_, idx) => closedDays.includes(String(idx + 1))),
            }
            place = place.toJSON() as PlaceRaw;
        }
    } else {
        const openingHoursLimitsReq = await fetch(`${req.protocol}://${req.get('host')}/api/lieux`);
        regularOpening = (await openingHoursLimitsReq.json()).data || { heure_ouverture: DEFAULT_OPEN_HOURS, heure_fermeture: DEFAULT_CLOSE_HOURS, jours_fermeture: DEFAULT_CLOSED_DAYS };
        closedDays = ((regularOpening as CommonRegularOpening).jours_fermeture as string[]) || [];

        listAllEvents = await EventModel.findAll({
            nest: true,
            where: {
                date: {
                    [Op.between]: [startTime.toString(), endTime.toString()],
                }
            },
            include: [{
                model: PlaceModel,
                as: "listPlaces",
                required: true,
                through: {
                    attributes: [],
                },
            }]
        });
    }

    const isClosedDay = closedDays.includes(String(daySelected.weekday));

    const listVisitsReq = await fetch(`${req.protocol}://${req.get('host')}/api/visites?filtre=jour&jour=${daySelected.toFormat("yyyy-LL-dd")}&lieu=${placeSelected}&page=${req.query.page || 1}`);
    const { data: listVisits, pagination } = (await listVisitsReq.json()) || { data: [], pagination: {} };

    const listPlaces = await PlaceModel.findAll({
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        order: [
            ['nom', 'ASC'],
        ],
    });
    const listPlacesComputed = await computedPlaces(listPlaces);

    const listEventsComputed: EventRaw[] = (placeSelected === "tous" ? listAllEvents : place!.listEvents).map((item) => {
        return {
            ...(placeSelected === "tous" ? (item as EventModel).toJSON() : item),
            aujourdhui: String(item.date) === daySelected.toFormat("yyyy-LL-dd")
        } as EventRaw
    });

    res.render("pages/admin/visits-list.njk", {
        visits_summary: getVisitsSummaries(listVisits),
        "visits_list": listVisits,
        "pagination": pagination,
        "list_groups": listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)),
        "list_genders": listGenders,
        "list_departments": listDepartments,
        "list_age_groups": listAgeGroups,
        "header_list": listVisits?.[0] ? Object.keys(listVisits[0]) : [],
        "current_date": daySelected,
        "current_page": req.query.page || 1,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
        "is_day_closed": isClosedDay,
        "list_months": Info.months('long', { locale: 'fr' }).map(capitalizeFirstLetter),
        "list_places": listPlacesComputed,
        "list_events": listEventsComputed,
        "place": {
            jours_fermeture: DEFAULT_CLOSED_DAYS,
            ...(placeSelected !== "tous" ? { ...place!, ...regularOpening } : regularOpening),
        }
    });
});

router.get(["/visiteurs/import", "/visites/import"], requireMinimumRole(""), async (_, res) => {
    const listPlaces = await PlaceModel.findAll({
        include: [{ model: RegularOpeningModel, as: "regularOpening", required: true }],
        order: [
            ['nom', 'ASC'],
        ],
    });

    const listPlacesComputed = await computedPlaces(listPlaces);

    res.render("pages/admin/import-csv.njk", {
        "list_places": listPlacesComputed,
    });
}).post(["/visiteurs/import", "/visites/import"], requireMinimumRole(""), upload.single('file'), async (req, res) => {
    const csvContent: csvVisit[] = [];

    const listCsvColsCountVisit = dbCsvGroupsMapping.map((item) => item.csv_key);

    const getRowsWithVisits = (data: csvVisit[]) => {
        return data.filter((item) => listCsvColsCountVisit.some(key => item[key] !== ""))
    }

    const isCsvFileValid = (file: Express.Multer.File) => {
        if (!file) {
            return 'Fichier CSV requis';
        }

        // Check MIME type
        if (file.mimetype !== 'text/csv' || path.extname(file.originalname).toLowerCase() !== '.csv') {
            return 'Seuls les fichiers .csv sont autorisés';
        }

        // const MAX_SIZE = 5 * 1024 * 1024;
        // if (file.size > MAX_SIZE) {
        //     return 'Fichier trop volumineux (max 5MB)';
        // }

        return null;
    }

    const payload = {
        file: req.file,
        ...req.body,
    }

    const validator = await VisitCsvSchema.omit({ file: true }).safeParseAsync(payload);
    const redirectUrl = req.headers.referer || '/';

    const place = await PlaceModel.findByPk(Number(req.body.lieu), {
        include: [
            { model: RegularOpeningModel, as: "regularOpening", required: true, attributes: ["heure_ouverture"] },
        ],
    });

    if (!validator.success || !payload.file || isCsvFileValid(payload.file) !== null || !place) {
        res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions);
        return res.redirect(redirectUrl);
    }

    let areCsvHeadersValid = true;

    fs.createReadStream(payload.file!.path)
        .pipe(csv({ skipLines: 1, mapHeaders: ({ header }) => header.trim() }))
        .on('data', (data) => csvContent.push(data))
        .on('headers', (headers) => {
            const missing = expectedCsvHeaders.filter(h => !headers.includes(h));

            if (missing.length) {
                areCsvHeadersValid = false;
            }
        })
        .on('end', async () => {
            if (!areCsvHeadersValid) {
                res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions);
            } else {
                const listRequestsPayload: Omit<InferCreationAttributes<VisitModel>, 'id'>[] = [];
                const listRowsWithVisits = getRowsWithVisits(csvContent);

                listRowsWithVisits.forEach((visit) => {
                    dbCsvGroupsMapping.forEach((key) => {
                        if (visit[key.csv_key]) {
                            for (let index = 0; index < Number(visit[key.csv_key]); index++) {
                                const visitDate = DateTime.fromFormat(`${visit.Janvier} ${place.regularOpening.heure_ouverture}`, "dd/LL/yy HH:mm:ss", { zone: "Europe/Paris" });

                                if (visitDate.isValid) {
                                    listRequestsPayload.push({
                                        date_passage: visitDate.toJSDate(),
                                        genre: '0', // Homme
                                        tranche_age: 2, // 25/34 ans
                                        departement: '75',
                                        [key.db_key]: 'oui',
                                        lieu_id: Number(req.body.lieu),
                                        est_importe: true,
                                    })
                                }
                            }
                        }
                    })
                })

                try {
                    await VisitModel.bulkCreate(listRequestsPayload);
                    res.cookie('flash_message', JSON.stringify(['import_success']), flashMessageCookieOptions);
                } catch (error) {
                    res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions);
                }
            }

            fs.unlinkSync(payload.file!.path);

            return res.redirect(redirectUrl);
        }).on('error', () => {
            fs.unlinkSync(payload.file!.path);

            res.cookie('flash_message', JSON.stringify(['error']), flashMessageCookieOptions);
            return res.redirect(redirectUrl);
        })
})

export default router;
