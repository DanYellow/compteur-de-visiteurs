import { Sequelize } from 'sequelize';
import Place from './place';
import Visit from './visit';
import RegularOpening from './regular-opening';
import Event from './event';

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

Place.initModel(sequelize);
Visit.initModel(sequelize);
RegularOpening.initModel(sequelize);
Event.initModel(sequelize);

sequelize.models.place.hasMany(sequelize.models.visit, {
    foreignKey: {
        name: 'lieu_id',
        allowNull: false,
    },
    as: 'listVisits',
    onDelete: 'CASCADE',
});

sequelize.models.visit.belongsTo(sequelize.models.place, {
    foreignKey: {
        name: 'lieu_id',
        allowNull: false,
    },
    as: 'place',
});

sequelize.models.place.hasOne(sequelize.models.regular_opening, {
    foreignKey: {
        name: 'place_id',
        allowNull: false,
    },
    onDelete: 'CASCADE',
    as: "regularOpening",
});

sequelize.models.regular_opening.belongsTo(sequelize.models.place, {
    foreignKey: {
        name: 'place_id',
        allowNull: false,
    },
    as: 'place',
});

sequelize.models.place.belongsToMany(sequelize.models.event, {
    through: 'place_event',
    foreignKey: 'place_id',
    otherKey: 'event_id',
    as: "listEvents",
    onDelete: "CASCADE",
});

sequelize.models.event.belongsToMany(sequelize.models.place, {
    through: 'place_event',
    foreignKey: 'event_id',
    otherKey: 'place_id',
    as: "listPlaces",
    onDelete: "CASCADE",
});

if (process.env.NODE_ENV === "development") {
    await sequelize.sync({
        // force: true
        // alter: true
    })
} else {
    await sequelize.sync()
}

export default sequelize;

export { Place, Visit, RegularOpening, Event }
