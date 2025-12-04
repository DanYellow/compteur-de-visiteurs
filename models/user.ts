import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type BelongsToManySetAssociationsMixin, type BelongsToManyGetAssociationsMixin } from 'sequelize';

export default class Event extends Model<InferAttributes<Event>, InferCreationAttributes<Event>> {
    declare id: CreationOptional<number>;
    declare identifiant: string;
    declare mot_de_passe: string;

    static initModel(sequelize: Sequelize) {
        Event.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                identifiant: {
                    type: DataTypes.STRING,
                    unique: true,
                    allowNull: false,
                },
                mot_de_passe: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                // role: {

                // }

            },
            {
                sequelize,
                updatedAt: false,
                createdAt: false,
                modelName: 'event',
                underscored: true,
                hooks: {
                    beforeValidate(record) {
                        // record.slug = `${slugify(record.nom)}-${record.date}-${String(Date.now()).slice(-6)}`
                    },
                }
            }
        )
    }
}

