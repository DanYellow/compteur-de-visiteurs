import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey, type HasOneGetAssociationMixin } from 'sequelize';

import { listGroups as listBusinessSector } from '#scripts/utils.shared.ts';
import Place from '#models/place.ts';

export default class Visit extends Model<InferAttributes<Visit>, InferCreationAttributes<Visit>> {
    declare id: CreationOptional<number>;
    declare place_id: ForeignKey<Place['id']>;
    declare date_passage: CreationOptional<Date>;
    declare groupe?: string;

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
                date_passage: DataTypes.DATE,
                ...listBusinessSectorKeys,
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
