import { DataTypes, Sequelize, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';

export default class Place extends Model<InferAttributes<Place>, InferCreationAttributes<Place>> {
    declare id: CreationOptional<number>;
    declare heure_ouverture: number;
    declare nom: string;
    declare slug: string;
    declare adresse: string;
    declare jours_fermeture: string;
    declare heure_fermeture: number;
    declare ouvert: string;

    static initModel(sequelize: Sequelize) {
        Place.init(
            {
                id: {
                    type: DataTypes.TINYINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                },
                nom: DataTypes.STRING,
                slug: {
                    type: DataTypes.STRING,
                    unique: true,
                    allowNull: false,
                },
                adresse: DataTypes.STRING,
                jours_fermeture: DataTypes.JSON,
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
                    type: DataTypes.STRING,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: 'date_creation',
                modelName: 'place',
            }
        )
    }
}

