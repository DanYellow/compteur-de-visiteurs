import { DataTypes } from 'sequelize';

import sequelize from "./index";
import Visitor from './visitor';

const Place = sequelize.define('place', {
    nom: DataTypes.STRING,
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    adresse: DataTypes.STRING,
    jours_fermeture: DataTypes.TEXT,
    heure_ouverture: {
        type: DataTypes.NUMBER,
        defaultValue: 10,
    },
    heure_fermeture: {
        type: DataTypes.NUMBER,
        defaultValue: 20,
        validate: {
            isGreaterThanOtherField(value: number) {
                if (Number(value) <= Number(this.heure_ouverture)) {
                    throw new Error('Bar must be greater than otherField.');
                }
            }
        }
    },
    ouvert: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    updatedAt: false,
});

Place.hasMany(Visitor);

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
