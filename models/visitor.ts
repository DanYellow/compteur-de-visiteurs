import { Sequelize, DataTypes } from 'sequelize';

import { listBusinessSector } from "#scripts/utils.ts"

const listBusinessSectorKeys = {}
listBusinessSector.forEach((item) => {
  listBusinessSectorKeys[item.value] = DataTypes.STRING;
})

const sequelize = new Sequelize('sqlite::memory:');
const Visitor = sequelize.define('Visitor', {
  date_passage: DataTypes.DATE,
  place: DataTypes.STRING,
  ...listBusinessSectorKeys,
});

export default Visitor;