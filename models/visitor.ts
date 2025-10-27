import { DataTypes } from 'sequelize';

import sequelize from "./index";

import { listBusinessSector } from "#scripts/utils.ts"

const listBusinessSectorKeys = {}
listBusinessSector.forEach((item) => {
  listBusinessSectorKeys[item.value] = {
    type: DataTypes.STRING,
    defaultValue: 'non',
  };
})

const Visitor = sequelize.define('visitor', {
  date_passage: DataTypes.DATE,
  place: DataTypes.STRING,
  ...listBusinessSectorKeys,
}, {
    createdAt: 'date_passage',
});

await Visitor.sync({ alter: true });

export default Visitor;
