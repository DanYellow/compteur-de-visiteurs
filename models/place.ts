import { DataTypes } from 'sequelize';
import config from "#config" with { type: "json" };

import sequelize from "./index";

const Place = sequelize.define('place', {
    nom: DataTypes.STRING,
    adresse: DataTypes.STRING,
    jours_fermeture: DataTypes.TEXT,
    heure_ouverture: {
        type: DataTypes.NUMBER,
        defaultValue: 10,
    },
    heure_fermeture: {
        type: DataTypes.NUMBER,
        defaultValue: 19,
    },
    ouvert: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    updatedAt: false,
});

const queryInterface = sequelize.getQueryInterface()
const tableNames = await queryInterface.showAllTables();
try {
    const backupTableName = Place.tableName + '_backup'
    if (tableNames.includes(backupTableName)) {
        await queryInterface.dropTable(backupTableName)
    }
    await Place.sync({ alter: true })
} catch (e) {
    console.error('💔model sync error', e)
}

export default Place;
