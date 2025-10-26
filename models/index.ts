import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.tmp.sqlite',
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

await sequelize.sync({ alter: true });

export default sequelize;
