import express from "express";
import { DateTime, DateTimeUnit } from "luxon";
import { Op, literal, Sequelize, QueryTypes } from 'sequelize';

import sequelize from "#models/index.ts";
import VisitorModel from "#models/visitor.ts";

import { listTimeSlots } from "#scripts/utils.ts";

const router = express.Router();

router.get("/", async (req, res) => {
    const today = DateTime.now();

    const dictGroupType = {
        "jour": {
            "substitution": "%H",
            "luxon": "day"
        },
        "semaine": {
            "substitution": "%u",
            "luxon": "week"
        },
        "mois": {
            "substitution": "%U",
            "luxon": "month"
        },
        "annee": {
            "substitution": "%m",
            "luxon": "year"
        },
    }

    const sqliteSubtitution = dictGroupType[req.query?.filtre || "jour"].substitution;

    const listVisitors = await VisitorModel.findAll({
        raw: true,
        attributes: [
            [literal(`*, STRFTIME('${sqliteSubtitution}', date_passage)`), "groupe"]
        ],
        where: {
            date_passage: {
                [Op.and]: {
                    [Op.gte]: today.startOf(dictGroupType[req.query?.filtre || "jour"].luxon).toString(),
                    [Op.lte]: today.endOf(dictGroupType[req.query?.filtre || "jour"].luxon).toString(),
                }
            }
        }
    });



    // const listVisitors = await sequelize.query(`
    //     SELECT *, STRFTIME('%H', date_passage) as groupe FROM visitor
    // `, {
    //     type: QueryTypes.SELECT,
    // });

    console.log(listVisitors)

    res.status(200).json({
        data: listVisitors
    });
});

export default router;
