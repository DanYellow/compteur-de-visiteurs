import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey, type HasOneGetAssociationMixin } from 'sequelize';

import { listAgeGroups, listGroups as listBusinessSector, listDepartments, listGenders } from '#scripts/utils.shared.ts';
import Place from '#models/place.ts';

export default class Visit extends Model<InferAttributes<Visit>, InferCreationAttributes<Visit>> {
    declare id: CreationOptional<number>;
    declare lieu_id: ForeignKey<Place['id']>;
    declare genre: string;
    declare departement: string;
    declare tranche_age: number;
    declare groupe?: string;
    declare date_passage: CreationOptional<Date>;

    declare getPlace: HasOneGetAssociationMixin<Place>;

    static initModel(sequelize: Sequelize) {
        const listBusinessSectorKeys: Record<string, any> = {}
        listBusinessSector
            .filter((item) => (!("listInDb" in item) || item.listInDb))
            .forEach((item) => {
                listBusinessSectorKeys[item.value] = {
                    type: DataTypes.STRING,
                    defaultValue: 'non',
                };
            })

        Visit.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                tranche_age: {
                    type: DataTypes.ENUM(
                        ...listAgeGroups.map((item) => item.value)
                    ),
                    allowNull: false,
                },
                genre: {
                    type: DataTypes.ENUM(
                        ...listGenders.map((item) => item.value)
                    ),
                    allowNull: false,
                },
                departement: {
                    type: DataTypes.ENUM(
                        ...listDepartments.map((item) => item.value)
                    ),
                    allowNull: false,
                },
                ...listBusinessSectorKeys,
                date_passage: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
            },
            {
                modelName: 'visit',
                createdAt: 'date_passage',
                updatedAt: false,
                sequelize,
            }
        )
    }
}
