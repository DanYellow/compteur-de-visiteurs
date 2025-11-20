import { Sequelize } from 'sequelize';
import Place from './place';
import Visit from './visit';

let databaseFileName = './database.tmp.sqlite';

if (process.env.NODE_ENV === "production") {
    databaseFileName = './database-prod.tmp.sqlite';
}

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databaseFileName,
    define: {
        freezeTableName: true,
    },
});

try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

Place(sequelize);
Visit(sequelize);

sequelize.models.place.hasMany(sequelize.models.visit, {
    foreignKey: {
        name: 'lieu_id',
        allowNull: false,
    },
});

sequelize.models.visit.belongsTo(sequelize.models.place, {
    foreignKey: {
        name: 'lieu_id',
        allowNull: false,
    },
});

if (process.env.NODE_ENV === "development") {
    const queryInterface = sequelize.getQueryInterface();
    const tableNames = await queryInterface.showAllTables();

    for await (const model of Object.values(sequelize.models)) {
        try {
            const backupTableName = model.tableName + '_backup';
            if (tableNames.includes(backupTableName)) {
                await queryInterface.dropTable(backupTableName)
            }

            await model.sync() // { alter: true, force: false, }
        } catch (e) {
            console.error('💔model sync error', e)
        }
    }
}

export default sequelize;
