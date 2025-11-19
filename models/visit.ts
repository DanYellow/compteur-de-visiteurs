import { DataTypes } from 'sequelize';
import config from "#config" with { type: "json" };

import sequelize from "./index";

import { listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import Place from './place';

const listBusinessSectorKeys = {}
listBusinessSector
    .filter((item) => (!("listInDb" in item) || item.listInDb))
    .forEach((item) => {
        listBusinessSectorKeys[item.value] = {
            type: DataTypes.STRING,
            defaultValue: 'non',
        };
    })

const Visit = sequelize.define('visit', {
    date_passage: DataTypes.DATE,
    ...listBusinessSectorKeys,
}, {
    createdAt: 'date_passage',
    updatedAt: false,
});

const queryInterface = sequelize.getQueryInterface()
const tableNames = await queryInterface.showAllTables();
try {
    const backupTableName = Visit.tableName + '_backup'
    if (tableNames.includes(backupTableName)) {
        await queryInterface.dropTable(backupTableName)
    }
    await Visit.sync({ alter: true })
} catch (e) {
    console.error('💔model sync error', e)
}

export default Visit;
