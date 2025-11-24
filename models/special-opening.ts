import { slugify } from '#scripts/utils.ts';
import { DataTypes, Sequelize, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type BelongsToManySetAssociationsMixin, type BelongsToManyGetAssociationsMixin } from 'sequelize';
import Place from './place';

export default class SpecialOpening extends Model<InferAttributes<SpecialOpening>, InferCreationAttributes<SpecialOpening>> {
    declare id: CreationOptional<number>;
    declare nom: string;
    declare description: string;
    declare slug?: string;
    declare date: Date;
    declare heure_fermeture: string;
    declare heure_ouverture: string;
    declare ouvert?: boolean;

    declare setListPlaces: BelongsToManySetAssociationsMixin<Place, number>;
    declare getListPlaces: BelongsToManyGetAssociationsMixin<Place>;

    static initModel(sequelize: Sequelize) {
        SpecialOpening.init(
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
                description: DataTypes.STRING,
                date: {
                    type: DataTypes.DATEONLY,
                },
                heure_ouverture: {
                    type: DataTypes.TIME,
                    defaultValue: '10:00:00'
                },
                heure_fermeture: {
                    type: DataTypes.TIME,
                    defaultValue: '20:00:00',
                    validate: {
                        isGreaterThanOtherField(value: number) {
                            if (Number(value) <= Number(this.heure_ouverture)) {
                                throw new Error('L\'heure de fermeture ne peut pas être inférieure à celle d\'ouverture.');
                            }
                        }
                    }
                },
                ouvert: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                updatedAt: false,
                createdAt: false,
                modelName: 'special_opening',
                underscored: true,
                hooks: {
                    beforeValidate(record) {
                        record.slug = `${slugify(record.nom)}-${record.date}-${String(Date.now()).slice(-6)}`
                    },
                }
            }
        )
    }
}

