import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
    sequelize.define('place', {
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
                        throw new Error('L\'heure de fermeture ne peut pas être inférieure à celle d\'ouverture.');
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
        createdAt: 'date_creation',
    });
}

