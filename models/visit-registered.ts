import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';

export default class VisitRegistered extends Model<InferAttributes<VisitRegistered>, InferCreationAttributes<VisitRegistered>> {
    declare code: string;
    declare contenu: Record<string, any>;

    static initModel(sequelize: Sequelize) {
        VisitRegistered.init(
            {
                code: {
                    type: DataTypes.STRING(3),
                    primaryKey: true,
                    allowNull: false,
                },
                contenu: {
                    type: DataTypes.JSON, // stored as TEXT in SQLite
                    allowNull: false,
                },
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: 'date_creation',
                modelName: 'visit_registered',
                underscored: true,
            }
        )
    }
}
