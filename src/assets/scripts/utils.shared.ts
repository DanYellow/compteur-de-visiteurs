import type {
    BaseConfigData,
    CSVLinearHeader,
    PivotTableOptions,
    VisitRaw,
    WeekMonth,
} from '#types';
import { DateTime, Info, Interval } from 'luxon';

export const listGroups = [
    {
        label: 'Entreprise\nexterne',
        value: 'entreprise_externe',
        lineColor: '#ffc8fa',
        listInChoices: false,
    },
    {
        label: 'Entreprise\nStation Numixs',
        value: 'station_numixs',
        lineColor: 'rgb(213, 217, 22)',
        listInChoices: false,
    },
    {
        label: 'Entreprise',
        value: 'entreprise',
        lineColor: '',
        listInDb: false,
    },
    {
        label: 'Enseignant',
        value: 'enseignant',
        lineColor: 'rgb(15, 92, 192)',
        listInChoices: false,
    },
    {
        label: 'Élève',
        value: 'eleve',
        lineColor: 'rgb(75, 192, 192)',
        listInChoices: false,
    },
    {
        label: 'Éducation / Scolaire',
        value: 'education',
        lineColor: '',
        listInDb: false,
    },
    {
        label: 'Artisan',
        value: 'artisan',
        lineColor: 'rgb(255, 255, 255)',
    },
    {
        label: 'Artiste',
        value: 'artiste',
        lineColor: '#ffdc00',
    },
    {
        label: 'Agent CARPF',
        value: 'agent_carpf',
        lineColor: 'rgb(255, 108, 0)',
        fullName: "(Communauté d'Agglomération Roissy Pays de France)",
    },
    {
        label: 'Collectivité',
        value: 'collectivité',
        lineColor: '#00610d',
    },
    {
        label: 'FabLab',
        value: 'fablab',
        lineColor: 'rgb(217, 22, 123)',
    },
    {
        label: 'numixs Lab',
        value: 'numixs_lab',
        lineColor: '#000',
    },
    {
        label: 'Retraité',
        value: 'retraité',
        lineColor: '#d901ff',
    },
    {
        label: 'Association',
        value: 'association',
        lineColor: 'rgb(3, 252, 7)',
    },
    {
        label: 'En réinsertion pro',
        value: 'réinsertion_pro',
        lineColor: 'rgb(3, 252, 205)',
    },
    {
        label: 'Autre',
        value: 'autre',
        lineColor: 'rgb(252, 26, 3)',
    },
];

export const getPivotTable = (
    data: Record<string, VisitRaw[]>,
    columns: string[] | { id: number; name: string }[] = [],
    options: PivotTableOptions = { columnSuffix: '', simplified: false }
) => {
    const tableValues = [];
    const totalVisits = Object.values(data)
        .flat()
        .map((item) =>
            Object.values(item).reduce(
                (total: number, x) => (x === 'oui' ? total + 1 : total),
                0
            )
        )
        .reduce((total: number, val: number) => total + val, 0);

    const tableHeaderColumns = ['Groupe'];
    const tableValuesPlaceholder: number[] = [];

    [...columns].forEach((label: string | Record<string, string | number>) => {
        if (typeof label === 'object') {
            tableHeaderColumns.push(`${label.name}${options.columnSuffix}`);
        } else {
            tableHeaderColumns.push(`${label}${options.columnSuffix}`);
        }
        tableValuesPlaceholder.push(0);
    });
    tableHeaderColumns.push('Total par groupe');
    tableValues.push(tableHeaderColumns);

    const tableFooter = ['Total (visites)', ...tableValuesPlaceholder];

    listGroups
        .filter((item) => !('listInDb' in item) || item.listInDb)
        .forEach((business) => {
            let rowValues = [business.label];

            let visitsPerGroupAndPeriod = {
                [business.value]: new Array(columns.length || 0).fill([0, 0]),
            };

            if (options.simplified) {
                visitsPerGroupAndPeriod = {
                    [business.value]: new Array(columns.length || 0).fill(0),
                };
            }

            Object.entries(data).forEach(([group, listVisits]) => {
                let totalPerGroup: Record<string, number[] | number> = (
                    listVisits as unknown as VisitRaw[]
                ).reduce((acc: Record<string, number[]>, visit) => {
                    const isEventVisit = visit.liste_evenements !== '/';
                    return (
                        (acc[business.value] = [
                            (acc[business.value]?.[0] || 0) +
                            (visit[business.value as keyof VisitRaw] ===
                                'oui' && !isEventVisit
                                ? 1
                                : 0),
                            (acc[business.value]?.[1] || 0) +
                            (visit[business.value as keyof VisitRaw] ===
                                'oui' && isEventVisit
                                ? 1
                                : 0),
                        ]),
                        acc
                    );
                }, {});
                if (options.simplified) {
                    totalPerGroup = (
                        listVisits as unknown as VisitRaw[]
                    ).reduce(
                        (acc: Record<string, number>, visit) => (
                            (acc[business.value] =
                                (acc[business.value] || 0) +
                                (visit[business.value as keyof VisitRaw] ===
                                    'oui'
                                    ? 1
                                    : 0)),
                            acc
                        ),
                        {}
                    );
                }

                const indexArray = columns.findIndex((label) => {
                    if (typeof label === 'object') {
                        return Number(label.id) === Number(group);
                    }
                    return Number(label) === Number(group);
                });

                if (indexArray >= 0) {
                    if (options.simplified) {
                        (tableFooter[indexArray + 1] as number) += (
                            totalPerGroup as Record<string, number>
                        )[business.value];
                    } else {
                        (tableFooter[indexArray + 1] as number) += (
                            totalPerGroup as Record<string, number[]>
                        )[business.value].reduce(
                            (acc, value) => acc + value,
                            0
                        );
                    }
                    visitsPerGroupAndPeriod[business.value][indexArray] =
                        totalPerGroup[business.value];
                }
            });

            rowValues = [
                ...rowValues,
                ...visitsPerGroupAndPeriod[business.value],
            ];

            let totalBusiness = [];
            if (options.simplified) {
                totalBusiness = visitsPerGroupAndPeriod[business.value].reduce(
                    (acc, value) => acc + value,
                    0
                );
            } else {
                totalBusiness = visitsPerGroupAndPeriod[business.value].reduce(
                    (acc, value) => [acc[0] + value[0], acc[1] + value[1]],
                    [0, 0]
                );
            }

            rowValues.push(totalBusiness);
            tableValues.push(rowValues);
        });

    tableFooter.push(totalVisits);
    tableValues.push(tableFooter);

    return tableValues;
};

type LinearCSVOptions = {
    periodLabel: string;
    lieu: string;
    columns: string[];
};

// @TODO
export const getLinearCSV = (
    data: Record<string, unknown>[]
) => {
    const csvPayload: (string|number)[][] = [];

    data.forEach((item, idx) => {
        if (idx === 0) {
            csvPayload.push(Object.keys(item))
            csvPayload.push(Object.values(item) as (string | number)[])
        } else {
            csvPayload.push(Object.values(item) as (string | number)[])
        }
    })

    return csvPayload;
};

const listMonths = Info.months('long', { locale: 'fr' }).map((item, idx) => ({
    name: item.charAt(0).toUpperCase() + String(item).slice(1),
    id: String(idx + 1).padStart(2, '0'),
}));

export const getWeeksRangeMonth = (daySelected: DateTime) => {
    const startMonth = daySelected.startOf('month');
    const endMonth = daySelected.endOf('month');
    const intervalMonth = startMonth.until(endMonth);

    if (intervalMonth.isValid) {
        const intervalWeeks = intervalMonth.splitBy({ weeks: 1 });
        const listWeeks: WeekMonth[] = [];

        intervalWeeks.forEach(
            (
                item: Interval<true>,
                index: number,
                array: Interval<boolean>[]
            ) => {
                listWeeks.push({
                    id: item.start!.weekNumber,
                    name: `${item.start.toFormat('dd/LL')} ➜ ${(index ===
                        array.length - 1
                        ? endMonth
                        : item.end!.minus({ day: 1 })
                    ).toFormat('dd/LL')}`,
                });
            }
        );

        return listWeeks;
    }

    return [];
};

export const baseConfigData: BaseConfigData = {
    jour: {
        apiKey: 'jour',
        xValuesSuffix: 'h',
    },
    semaine: {
        apiKey: 'semaine',
    },
    mois: {
        apiKey: 'mois',
    },
    annee: {
        apiKey: 'annee',
        listColumns: listMonths,
    },
};

export const capitalizeFirstLetter = (val: unknown) => {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
};

export const DEFAULT_CLOSED_DAYS = ['1', '6', '7'];
export const DEFAULT_OPEN_HOURS = '10:00:00';
export const DEFAULT_CLOSE_HOURS = '19:30:00';

export const listPlaceTypes = [
    {
        label: 'Faclab® Numixs',
        value: 'faclab',
    },
    {
        label: 'Station Numixs',
        value: 'station',
    },
    {
        label: 'Numixs Lab',
        value: 'lab',
    },
];

export const LIST_ROLES = [
    {
        label: 'Super Administrateur',
        value: 'SUPER_ADMIN',
        weight: 1000,
    },
    {
        label: 'Administrateur',
        value: 'ADMIN',
        weight: 100,
    },
    {
        label: 'Numixs lab',
        value: 'NUMIXS_LAB',
        weight: 10,
    },
    {
        label: 'Lecteur',
        value: 'READ_ONLY',
        weight: 1,
    },
];

export const listDepartments = [
    {
        label: 'Paris (75)',
        value: '75',
    },
    {
        label: 'Seine-et-Marne (77)',
        value: '77',
    },
    {
        label: 'Yvelines (78)',
        value: '78',
    },
    {
        label: 'Essonne (91)',
        value: '91',
    },
    {
        label: 'Hauts-de-Seine (92)',
        value: '92',
    },

    {
        label: 'Seine-Saint-Denis (93)',
        value: '93',
    },
    {
        label: 'Val-de-Marne (94)',
        value: '94',
    },
    {
        label: 'Val d\'Oise (95)',
        value: '95',
    },
    {
        label: 'Autre / Hors Île-de-France',
        value: '99',
    },
];

export const listAgeGroups = [
    {
        label: '17 ans et moins',
        value: '0',
    },
    {
        label: '18/24 ans',
        value: '1',
    },
    {
        label: '25/34 ans',
        value: '2',
    },
    {
        label: '35/49 ans',
        value: '3',
    },
    {
        label: '50/64 ans',
        value: '4',
    },
    {
        label: '65 ans et plus',
        value: '5',
    },
];

export const listGenders = [
    {
        label: 'Homme',
        value: '0',
    },
    {
        label: 'Femme',
        value: '1',
    },
    {
        label: 'Non-binaire',
        value: '2',
    },
];

export const REQUIRED_MESSAGE = 'Ce champ est obligatoire';

export const uniqueByKey = (arr: any[], key: string) => {
    return [...new Map(arr.map(item => [item[key], item])).values()];
};

export const NB_ITEMS_PER_PAGE = 5;
