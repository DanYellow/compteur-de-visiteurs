import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type BelongsToManySetAssociationsMixin, type BelongsToManyGetAssociationsMixin, ForeignKey } from 'sequelize';

export default class UserPublicKeyCredentials extends Model<InferAttributes<UserPublicKeyCredentials>, InferCreationAttributes<UserPublicKeyCredentials>> {
    declare id: CreationOptional<number>;
    declare user_id: ForeignKey<number>;
    declare public_key: string;
    declare external_id: string;

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
                external_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
            },
            {
                sequelize,
                createdAt: 'date_enregistrement',
                updatedAt: false,
                modelName: 'user_public_key_credentials',
                underscored: true,
            }
        )
    }
}

