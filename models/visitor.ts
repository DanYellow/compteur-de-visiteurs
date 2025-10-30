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
  lieu: DataTypes.STRING,
  ...listBusinessSectorKeys,
}, {
    createdAt: 'date_passage',
    updatedAt: false,
});

const queryInterface = sequelize.getQueryInterface()
const tableNames = await queryInterface.showAllTables();
try {
  const backupTableName = Visitor.tableName + '_backup'
  if (tableNames.includes(backupTableName)) {
    await queryInterface.dropTable(backupTableName)
  }
  await Visitor.sync({ alter: true })
} catch (e) {
  console.error('💔model sync error' , e)
}

// await Visitor.sync({ alter: true });

export default Visitor;
