import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { stringify } from "csv-stringify/sync";
import { DateTime } from "luxon";
import { Op } from 'sequelize';

import { listBusinessSector } from "#scripts/utils.ts"
import { VisitorSchema } from "#scripts/schemas.ts";
import { wss } from "./index.ts";
import VisitorModel from "#models/visitor.ts"

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log("ip", ip)
    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
    });
});

router.post("/", async (req, res) => {
    const validator = VisitorSchema.safeParse(req.body);
    if (!validator.success) {
        res.status(500).json({ "success": false })
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

interface IVisitor {
    date_passage: string;
    day: string;
}

router.get(["/dashboard"], async (req, res) => {
    res.render("pages/dashboard.njk");
})

router.get(["/visiteurs", "/liste-visiteurs"], async (req, res) => {
    let daySelected = DateTime.now();
    const today = daySelected;
    if (req.query.current_date) {
        const tmpDate = DateTime.fromISO(req.query.current_date as string);
        if (tmpDate.isValid) {
            daySelected = tmpDate;
        }
    }

    const daySelectedFormatted = daySelected.toFormat("yyyy-MM-dd");

    const records: IVisitor[] = await VisitorModel.findAll({
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: `${daySelectedFormatted} 00:00:00`,
                    [Op.lte]: `${daySelectedFormatted} 23:59:59.999999`,
                }
            }
        }
    });

    res.render("pages/members-list.njk", {
        "visitors_list": records,
        "list_business_sector": listBusinessSector,
        "header_list": records?.[0] ? Object.keys(records[0]) : [],
        "current_date": daySelected,
        "today": DateTime.now(),
        "is_today": daySelected.startOf('day').equals(today.startOf('day')),
    });
});

router.get('/visiteurs/telecharger', async (req, res) => {
    const today = DateTime.now();

    // let downloadedFileSuffix = "";

    // switch (Object.keys(req.query)[0]) {
    //     case "jour":
            
    //         break;
    
    //     default:
    //         break;
    // }

    const records: IVisitor[] = await VisitorModel.findAll({
        raw: true,
        ...("jour" in req.query ? {
            where: {
                date_passage: {
                    [Op.and]: {
                        [Op.gte]: today.startOf('day'),
                        [Op.lte]: today.endOf('day'),
                    }
                }
            }
        } : {}),
        ...("mois" in req.query ? {
            where: {
                date_passage: {
                    [Op.and]: {
                        [Op.gte]: today.startOf('month'),
                        [Op.lte]: today.endOf('month'),
                    }
                }
            }
        } : {}),
        ...("year" in req.query ? {
            where: {
                date_passage: {
                    [Op.and]: {
                        [Op.gte]: today.startOf('year'),
                        [Op.lte]: today.endOf('year'),
                    }
                }
            }
        } : {})
    });

    const values = [Object.keys(records[0])];
    records.forEach((item) => {
        const formattedItem = {
            ...item,
            date_passage: DateTime.fromISO(new Date(item.date_passage).toISOString()).toFormat("dd/LL/yyyy à HH:mm"),
        }
        values.push(Object.values(formattedItem));
    })

    const timestamp = DateTime.now().toFormat("dd-LL-yyyy-HH'h'mm");
    const csvFile = path.join(__dirname, "..", "liste-membres.tmp.csv");

    fs.writeFileSync(csvFile, stringify(values));
    res.download(csvFile, `${timestamp}-liste-membres.csv`, () => {
        fs.unlinkSync(csvFile);
    });
});


export default router;
