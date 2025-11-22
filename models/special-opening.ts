import { DataTypes, Sequelize, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export default class PlaceSpecialOpening extends Model<InferAttributes<PlaceSpecialOpening>, InferCreationAttributes<PlaceSpecialOpening>> {
    declare id: CreationOptional<number>;
    declare nom: string;
    declare description: string;
    declare jour: Date;
    declare heure_fermeture: number;
    declare heure_ouverture: number;
    declare ouvert: boolean;

    static initModel(sequelize: Sequelize) {
        PlaceSpecialOpening.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                nom: DataTypes.STRING,
                description: DataTypes.STRING,
                jour: {
                    type: DataTypes.DATE,
                },
                heure_ouverture: {
                    type: DataTypes.TIME,
                    defaultValue: '10:00:00'
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
                ouvert: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false,
                },
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: false,
                modelName: 'special_opening',
                underscored: true,
            }
        )
    }
}

