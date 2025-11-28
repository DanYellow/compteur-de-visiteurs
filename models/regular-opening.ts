import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey } from 'sequelize';
import { DEFAULT_CLOSED_DAYS, DEFAULT_OPEN_HOURS, DEFAULT_CLOSE_HOURS } from "#scripts/utils.shared.ts";

export default class RegularOpening extends Model<InferAttributes<RegularOpening>, InferCreationAttributes<RegularOpening>> {
    declare id: CreationOptional<number>;
    declare place_id: ForeignKey<number>;
    declare jours_fermeture: string | string[];
    declare heure_fermeture: string;
    declare heure_ouverture: string;

    static initModel(sequelize: Sequelize) {
        RegularOpening.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                jours_fermeture: {
                    type: DataTypes.JSON,
                    defaultValue: DEFAULT_CLOSED_DAYS,
                },
                heure_ouverture: {
                    type: DataTypes.TIME,
                    defaultValue: DEFAULT_OPEN_HOURS,
                },
                heure_fermeture: {
                    type: DataTypes.TIME,
                    defaultValue: DEFAULT_CLOSE_HOURS,
                    validate: {
                        isGreaterThanOtherField(value: number) {
                            if (Number(value) <= Number(this.heure_ouverture)) {
                                throw new Error('L\'heure de fermeture ne peut pas être inférieure à celle d\'ouverture.');
                            }
                        }
                    }
                },
                place_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    unique: true,
                    references: {
                        model: 'place',
                        key: 'id'
                    }
                },
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: false,
                modelName: 'regular_opening',
                underscored: true,
            }
        )
    }
}

