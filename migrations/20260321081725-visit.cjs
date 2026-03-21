'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction((t) => {
            return Promise.all([
                queryInterface.addColumn(
                    'visit',
                    'est_importe',
                    {
                        type: Sequelize.DataTypes.BOOLEAN,
                        defaultValue: false,
                    },
                    { transaction: t }
                ),
            ]);
        });
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction((t) => {
            return Promise.all([
                queryInterface.removeColumn('visit', 'est_importe', {
                    transaction: t,
                }),
            ]);
        });
    },
};
