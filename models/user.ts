import {
    DataTypes,
    Sequelize,
    Model,
    type InferAttributes,
    type InferCreationAttributes,
    type CreationOptional,
    type BelongsToManySetAssociationsMixin,
    type BelongsToManyGetAssociationsMixin,
    Op,
    type NonAttribute,
} from "sequelize";
import { loadEnvFile } from 'node:process';
import { LIST_ROLES } from "#scripts/utils.shared";
import type UserPublicKeyCredentials from "./user-public-key-credentials";

loadEnvFile(`${process.cwd()}/.env.local`);

export default class User extends Model<
    InferAttributes<User>,
    InferCreationAttributes<User>
> {
    declare id: CreationOptional<number>;
    declare email: string;
    declare nom?: string;
    declare mot_de_passe?: string;
    declare prenom?: string;
    declare actif?: boolean;
    declare approuve?: boolean;
    declare derniere_connexion?: string;
    declare role?: string;
    declare utilise_mdp?: boolean;

    listPasskeys: NonAttribute<UserPublicKeyCredentials[]> = [];

    declare setListPasskeys: BelongsToManySetAssociationsMixin<
        UserPublicKeyCredentials,
        number
    >;
    declare getListPasskeys: BelongsToManyGetAssociationsMixin<UserPublicKeyCredentials>;

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
                approuve: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                derniere_connexion: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                utilise_mdp: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                role: {
                    type: DataTypes.ENUM(
                        ...LIST_ROLES.map((item) => item.value)
                    ),
                    allowNull: false,
                    defaultValue: "NUMIXS_LAB",
                },
            },
            {
                sequelize,
                createdAt: "date_inscription",
                updatedAt: 'updated_at',
                modelName: "user",
                underscored: true,
                hooks: {
                    afterSave(record) {
                        deleteFirstAdmin(record);
                    },
                },
            }
        );
    }
}

const deleteFirstAdmin = async (record: User) => {
    const adminCount = await User.count({
        where: {
            role: "ADMIN",
            actif: true,
            mot_de_passe: {
                [Op.ne]: ""
            }
        },
    });

    if (record.role === "ADMIN" && adminCount > 1) {
        await User.destroy({
            where: {
                email: "admin@admin.com",
            },
        });
    }
};
