import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type HasOneGetAssociationMixin, type HasOneCreateAssociationMixin, type BelongsToManyAddAssociationMixin, type BelongsToManyGetAssociationsMixin, type BelongsToManyAddAssociationsMixin, type BelongsToManySetAssociationsMixin } from 'sequelize';
import { RegularOpening, Event } from '.';
import type { PlaceType } from '#types';
import { listPlaceTypes } from '#scripts/utils.shared.ts';

export default class Place extends Model<InferAttributes<Place>, InferCreationAttributes<Place>> {
    declare id: CreationOptional<number>;
    declare nom: string;
    declare slug: string;
    declare adresse: string;
    declare type?: PlaceType;
    declare description: string;
    declare ouvert: boolean;
    declare date_creation: CreationOptional<Date>;

    declare addRegularOpening: HasOneCreateAssociationMixin<RegularOpening>;
    declare getRegularOpening: HasOneGetAssociationMixin<RegularOpening>;

    declare addEvent: BelongsToManyAddAssociationMixin<Event, number>;
    declare addListEvents: BelongsToManyAddAssociationsMixin<Event, number>;
    declare setListEvents: BelongsToManySetAssociationsMixin<Event, number>;

    declare getEvent: BelongsToManyGetAssociationsMixin<Event>;

    static initModel(sequelize: Sequelize) {
        Place.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                nom: DataTypes.STRING,
                slug: {
                    type: DataTypes.STRING,
                    unique: true,
                    allowNull: false,
                },
                adresse: DataTypes.TEXT,
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                type: {
                    type: DataTypes.ENUM(...listPlaceTypes.map((item) => item.value)),
                    defaultValue: listPlaceTypes.map((item) => item.value)[0],
                    allowNull: false,
                },
                ouvert: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                date_creation: DataTypes.DATE,
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: 'date_creation',
                modelName: 'place',
                underscored: true,
            }
        )
    }
}

