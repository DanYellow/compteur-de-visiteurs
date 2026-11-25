'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction((t) => {
            return Promise.all([
                queryInterface
                    .describeTable('visit', { transaction: t })
                    .then((table) => {
                        // Only proceed if the column doesn't exist
                        if (!table.est_importe) {
                            return queryInterface.addColumn(
                                'visit',
                                'est_importe',
                                {
                                    type: Sequelize.DataTypes.BOOLEAN,
                                    defaultValue: false,
                                },
                                { transaction: t }
                            );
                        } else {
                            console.log(
                                'Column "est_importe" already exists. Skipping...'
                            );
                            return Promise.resolve(); // No-op, skip the operation
                        }
                    }),
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
