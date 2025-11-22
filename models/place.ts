import { DataTypes, Sequelize, Model, InferAttributes, InferCreationAttributes, CreationOptional, HasOneGetAssociationMixin, HasOneCreateAssociationMixin } from 'sequelize';
import { RegularOpening } from '.';

export default class Place extends Model<InferAttributes<Place>, InferCreationAttributes<Place>> {
    declare id: CreationOptional<number>;
    declare nom: string;
    declare slug: string;
    declare adresse: string;
    declare description: string;
    declare ouvert: boolean;
    declare date_creation: CreationOptional<Date>;

    declare addRegularOpening: HasOneCreateAssociationMixin<RegularOpening>;
    declare getRegularOpening: HasOneGetAssociationMixin<RegularOpening>;

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

