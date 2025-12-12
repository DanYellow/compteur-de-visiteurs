import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type BelongsToManySetAssociationsMixin, type BelongsToManyGetAssociationsMixin, ForeignKey } from 'sequelize';

export default class UserPublicKeyCredentials extends Model<InferAttributes<UserPublicKeyCredentials>, InferCreationAttributes<UserPublicKeyCredentials>> {
    declare id: CreationOptional<number>;
    declare user_id: ForeignKey<number>;
    declare public_key: string;
    declare external_id: string;
    declare derniere_utilisation?: string;
    declare nom?: string;
    declare aaguid: string;

    static initModel(sequelize: Sequelize) {
        UserPublicKeyCredentials.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                public_key: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                nom: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                external_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
                derniere_utilisation: {
                    type: DataTypes.DATE,
                },
                // https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#attestedcredentialdata
                aaguid: {
                    type: DataTypes.STRING,
                    allowNull: false,
                }
            },
            {
                sequelize,
                createdAt: 'date_creation',
                updatedAt: false,
                modelName: 'user_public_key_credentials',
                underscored: true,
            }
        )
    }
}

