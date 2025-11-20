import { DataTypes, Sequelize } from 'sequelize';

import { listGroups as listBusinessSector } from '#scripts/utils.shared.ts';

export default (sequelize: Sequelize) => {
    const listBusinessSectorKeys: Record<string, any> = {}
    listBusinessSector
        .filter((item) => (!("listInDb" in item) || item.listInDb))
        .forEach((item) => {
            listBusinessSectorKeys[item.value] = {
                type: DataTypes.STRING,
                defaultValue: 'non',
            };
        })

    sequelize.define('visit', {
        // date_passage: DataTypes.DATE,
        ...listBusinessSectorKeys,
    }, {
        createdAt: 'date_passage',
        updatedAt: false,
    });
}
