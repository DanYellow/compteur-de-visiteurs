import { DataTypes } from 'sequelize';
import { fileURLToPath } from "url";
import path from "path";
import dotenv from 'dotenv';

import sequelize from "./index";

import { listGroups as listBusinessSector } from "#scripts/list-groups.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const listBusinessSectorKeys = {}
listBusinessSector
    .filter((item) => (!("listInDb" in item) || item.listInDb))
    .forEach((item) => {
        listBusinessSectorKeys[item.value] = {
            type: DataTypes.STRING,
            defaultValue: 'non',
        };
    })

const Visitor = sequelize.define('visitor', {
    date_passage: DataTypes.DATE,
    lieu: {
        type: DataTypes.STRING,
        defaultValue: dotenv.config({ path: __dirname + '/.env.local' }).parsed?.PLACE
    },
    ...listBusinessSectorKeys,
}, {
    createdAt: 'date_passage',
    updatedAt: false,
});

// const queryInterface = sequelize.getQueryInterface()
// const tableNames = await queryInterface.showAllTables();
// try {
//     const backupTableName = Visitor.tableName + '_backup'
//     if (tableNames.includes(backupTableName)) {
//         await queryInterface.dropTable(backupTableName)
//     }
//     await Visitor.sync({ alter: true })
// } catch (e) {
//     console.error('💔model sync error', e)
// }

export default Visitor;
