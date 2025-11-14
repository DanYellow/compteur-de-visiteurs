import { Sequelize } from 'sequelize';

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

export default sequelize;
