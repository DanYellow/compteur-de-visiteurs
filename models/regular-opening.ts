import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey } from 'sequelize';

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
                    defaultValue: [],
                },
                heure_ouverture: {
                    type: DataTypes.TIME,
                    defaultValue: '10:00:00',
                },
                heure_fermeture: {
                    type: DataTypes.TIME,
                    defaultValue: '20:00:00',
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

