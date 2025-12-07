import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type BelongsToManySetAssociationsMixin, type BelongsToManyGetAssociationsMixin } from 'sequelize';
import bcrypt from "bcryptjs";

import { LIST_ROLES } from '#scripts/utils.shared.ts';
export default class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: CreationOptional<number>;
    declare email: string;
    declare mot_de_passe: string;
    declare actif: boolean;
    declare derniere_connexion: string;
    declare role?: string;

    static initModel(sequelize: Sequelize) {
        User.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                mot_de_passe: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                actif: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                derniere_connexion: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                role: {
                    type: DataTypes.ENUM(...LIST_ROLES.map((item) => item.value)),
                    allowNull: false,
                    defaultValue: "NUMIXS_LAB",
                }
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: false,
                modelName: 'user',
                underscored: true,
                hooks: {
                    beforeCreate(record) {
                        record.mot_de_passe = bcrypt.hashSync(record.mot_de_passe, 10)
                    },
                }
            }
        )
    }
}

