import express from "express";
import { Op, literal, Sequelize, QueryTypes } from 'sequelize';
import sequelize from "#models/index.ts";
import VisitorModel from "#models/visitor.ts";

import { listTimeSlots } from "#scripts/utils.ts";

const router = express.Router();

router.get("/", async (req, res) => {
    // const visitors = await VisitorModel.findAll({
    //     raw: true,
    //     attributes: [
    //         [Sequelize.fn('date_trunc', 'day', Sequelize.col('date_passage')), 'createdOn'],
    //     ],
    //     group: "hour"
    // });

    const listVisitors = await sequelize.query(`
        SELECT *, STRFTIME('%H', date_passage) as hour FROM visitor
    `, {
        type: QueryTypes.SELECT,
    });


    res.status(200).json({
        data: listVisitors
    })
    // res.status(200).json({
    //         data: listRessources,
    //         total_pages: isFinite(total_pages) ? total_pages : 1,
    //         count,
    //         page,
    //         query_params: querystring.stringify(queryParam),
    //     });
});

export default router;
