import { DataTypes } from 'sequelize';

import sequelize from "./index";

import { listBusinessSector } from "#scripts/utils.ts"

const listBusinessSectorKeys = {}
listBusinessSector.forEach((item) => {
  listBusinessSectorKeys[item.value] = DataTypes.STRING;
})

const Visitor = sequelize.define('visitor', {
  date_passage: DataTypes.DATE,
  place: DataTypes.STRING,
  ...listBusinessSectorKeys,
}, {
    createdAt: 'date_passage',
});

(async () => {
  await sequelize.sync();
})();


export default Visitor;
