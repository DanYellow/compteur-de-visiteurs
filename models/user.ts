import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type BelongsToManySetAssociationsMixin, type BelongsToManyGetAssociationsMixin } from 'sequelize';
import { LIST_ROLES } from '#scripts/utils.shared.ts';
import type UserPublicKeyCredentials from './user-public-key-credentials';

export default class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: CreationOptional<number>;
    declare email: string;
    declare nom?: string;
    declare mot_de_passe?: string;
    declare prenom?: string;
    declare actif?: boolean;
    declare derniere_connexion?: string;
    declare role?: string;

    declare setListPublicKeys: BelongsToManySetAssociationsMixin<UserPublicKeyCredentials, number>;
    declare getListPublicKeys: BelongsToManyGetAssociationsMixin<UserPublicKeyCredentials>;

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
                    allowNull: true,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
                nom: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                prenom: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                actif: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                derniere_connexion: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                role: {
                    type: DataTypes.ENUM(...LIST_ROLES.map((item) => item.value)),
                    allowNull: false,
                    defaultValue: "NUMIXS_LAB",
                }
            },
            {
                sequelize,
                createdAt: 'date_inscription',
                updatedAt: false,
                modelName: 'user',
                underscored: true,
                hooks: {
                    // beforeCreate(record) {
                    //     record.mot_de_passe = bcrypt.hashSync(record.mot_de_passe, 10)
                    // },
                }
            }
        )
    }
}

