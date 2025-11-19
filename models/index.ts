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
        name: 'place_id',
        allowNull: false,
    },
});

sequelize.models.visit.belongsTo(sequelize.models.place);

await sequelize.sync({ alter: true })

export default sequelize;
