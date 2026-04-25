import { Sequelize } from "sequelize";
import Place from "./place";
import Visit from "./visit";
import VisitRegistered from "./visit-registered";
import RegularOpening from "./regular-opening";
import Event from "./event";
import User from "./user";
import UserPublicKeyCredentials from "./user-public-key-credentials";

import bcrypt from "bcryptjs";
import path from "path";

let databaseFileName = "database.tmp.sqlite";

if (process.env.NODE_ENV === "production") {
    databaseFileName = "database-prod.tmp.sqlite";
}

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.resolve(path.resolve(), "database", databaseFileName),
    define: {
        freezeTableName: true,
    },
    logging: false, //process.env.NODE_ENV === "development",
});

try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
} catch (error) {
    console.error("Unable to connect to the database:", error);
}

Place.initModel(sequelize);
Visit.initModel(sequelize);
VisitRegistered.initModel(sequelize);
RegularOpening.initModel(sequelize);
Event.initModel(sequelize);
User.initModel(sequelize);
UserPublicKeyCredentials.initModel(sequelize);

sequelize.models.place.hasMany(sequelize.models.visit, {
    foreignKey: {
        name: "lieu_id",
        allowNull: false,
    },
    as: "listVisits",
    onDelete: "CASCADE",
});

sequelize.models.visit.belongsTo(sequelize.models.place, {
    foreignKey: {
        name: "lieu_id",
        allowNull: false,
    },
    as: "place",
});

sequelize.models.place.hasOne(sequelize.models.regular_opening, {
    foreignKey: {
        name: "place_id",
        allowNull: false,
    },
    onDelete: "CASCADE",
    as: "regularOpening",
});

sequelize.models.regular_opening.belongsTo(sequelize.models.place, {
    foreignKey: {
        name: "place_id",
        allowNull: false,
    },
    as: "place",
});

sequelize.models.place.belongsToMany(sequelize.models.event, {
    through: "place_event",
    foreignKey: "place_id",
    otherKey: "event_id",
    as: "listEvents",
    onDelete: "CASCADE",
});

sequelize.models.place.belongsTo(sequelize.models.user, {
    foreignKey: {
        name: "dernier_editeur_id",
        allowNull: true,
    },
    as: "dernier_editeur",
});

sequelize.models.event.belongsToMany(sequelize.models.place, {
    through: "place_event",
    foreignKey: "event_id",
    otherKey: "place_id",
    as: "listPlaces",
    onDelete: "CASCADE",
});

// User <-> Public keys
sequelize.models.user.hasMany(sequelize.models.user_public_key_credentials, {
    foreignKey: {
        name: "user_id",
        allowNull: false,
    },
    as: "listPasskeys",
    onDelete: "CASCADE",
});

sequelize.models.user_public_key_credentials.belongsTo(sequelize.models.user, {
    foreignKey: {
        name: "user_id",
        allowNull: false,
    },
    as: "user",
});

// if (process.env.MERGE_DB) {
//     console.log("Hello merged")
//     await sequelize.query(`ATTACH DATABASE './database/database-old.tmp.sqlite' AS other`);

//     const [[{ maxId }]] = await sequelize.query(`
//         SELECT COALESCE(MAX(id), 0) AS maxId FROM visit;
//     `);

//     const offset = maxId;

//     const [columns] = await sequelize.query(`
//         PRAGMA table_info(visit);
//     `);

//     const colNames = columns.map(c => c.name);

//     const selectCols = colNames.map(name =>
//         name === "id" ? `id + ${offset} AS id` : name
//     );

//     const sql = `
//         INSERT INTO visit (${colNames.join(", ")})
//         SELECT ${selectCols.join(", ")}
//         FROM other.visit;
//     `;

//     await sequelize.query(sql);
//     await sequelize.query(`DETACH DATABASE other`);
// }

if (process.env.NODE_ENV === "development") {
    await sequelize.sync({
        // force: true,
        // alter: true
    });
} else {
    await sequelize.sync();
}

const adminCount = await User.count({
    where: { role: "ADMIN" },
});

if (adminCount === 0) {
    await User.create({
        email: "admin@admin.com",
        mot_de_passe: bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD!, 8),
        role: "ADMIN",
        actif: true,
        approuve: true,
    });
    console.log("✅ Admin account created");
}

export default sequelize;

export { Place, Visit, RegularOpening, Event, User, UserPublicKeyCredentials, VisitRegistered };
