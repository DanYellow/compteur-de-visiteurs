import type {
    BaseConfigData,
    GroupItem,
    VisitRaw,
    WeekMonth,
} from '#types';
import { DateTime, Info } from 'luxon';

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
] as const satisfies readonly GroupItem[];

export const getPivotTable = (
    data: Record<string, VisitRaw[]>,
    columns: string[] | { id: number; name: string }[] = [],
    hasEvents: boolean
) => {
    const listGroupsFiltered = listGroups.filter((item) => !('listInDb' in item) || item.listInDb)

    const res: { label: string, total: number[][] }[] = [];

    listGroupsFiltered.forEach((item) => {
        const valuesForGroup: number[][] = columns.map((col) => {
            const visitGroupKey = typeof col === 'object' ? col.id : col;
            const visitsForGroup = data[visitGroupKey];
            if (visitsForGroup) {
                return visitsForGroup.reduce(
                    (accumulator, currentVisit) => {
                        const isEventVisit = currentVisit.liste_evenements !== '';

                        return [
                            accumulator[0] + (!isEventVisit && currentVisit[item.value as keyof VisitRaw] === "oui" ? 1 : 0),
                            ...(hasEvents ? [accumulator[1] + (isEventVisit && currentVisit[item.value as keyof VisitRaw] === "oui" ? 1 : 0)] : [])
                        ]
                    }, [0, ...(hasEvents ? [0] : [])]
                );
            }
            return [0, ...(hasEvents ? [0] : [])];
        })

        const totalForGroup = valuesForGroup.reduce((acc, totalVisits) => {
            return [
                acc[0] + totalVisits[0],
                ...(hasEvents ? [acc[1] + totalVisits[1]] : [])
            ]
        }, [0, ...(hasEvents ? [0] : [])]);

        valuesForGroup.push(totalForGroup);

        res.push({
            label: item.label,
            total: valuesForGroup
        })
    })

    const columnCount = res[0].total.length;

    const columnTotals = Array.from({ length: columnCount }, (_, colIndex) =>
        res.reduce(
            ([sumA, sumB], item) => [
                sumA + (item.total[colIndex] as number[])[0],
                ...(hasEvents ? [sumB + (item.total[colIndex] as number[])[1]] : [])
            ],
            [0, ...(hasEvents ? [0] : [])]
        )
    );

    const total: { label: string, total: number[][] }[] = []

    if (hasEvents) {
        total.push({
            label: "Total par type",
            total: columnTotals
        })
    }

    total.push({
        label: "Total",
        total: columnTotals.map(([totalReg, totalEvent]) => [totalReg + (hasEvents ? totalEvent : 0)])
    });

    return { body: res, footer: total };
};

export const getLinearCSV = (
    data: Record<string, unknown>[]
) => {
    const csvPayload: (string | number)[][] = [];

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
    const startOfMonth = daySelected.startOf('month');
    const endOfMonth = daySelected.endOf('month');

    let cursor = startOfMonth.startOf('week');

    const listWeeks: WeekMonth[] = [];

    while (cursor <= endOfMonth) {
        const weekStart = cursor;
        const weekEnd = cursor.plus({ days: 6 });

        const from = weekStart < startOfMonth ? startOfMonth : weekStart;
        const to = weekEnd > endOfMonth ? endOfMonth : weekEnd;

        listWeeks.push({
            id: weekStart.weekNumber,
            name: `${from.toFormat('dd/LL')} ➜ ${to.toFormat('dd/LL')}`,
        });

        cursor = cursor.plus({ weeks: 1 });
    }

    return listWeeks;
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
        label: 'Faclab® numixs',
        value: 'faclab',
    },
    {
        label: 'Station numixs',
        value: 'station',
    },
    {
        label: 'numixs Lab',
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
] as const;

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
] as const;

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
] as const;

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
] as const;

export const REQUIRED_MESSAGE = 'Ce champ est obligatoire';

export const uniqueByKey = (arr: any[], key: string) => {
    return [...new Map(arr.map(item => [item[key], item])).values()];
};

export const NB_ITEMS_PER_PAGE = 25;

export const SOCKET_EVENTS = {
    VISITOR_REGISTERED: "VISITOR_REGISTERED",
    NEW_USER: "NEW_USER",
}

export const slugify = (input: string): string => {
    if (!input)
        return '';

    // make lower case and trim
    let slug = input.toLowerCase().trim();

    // remove accents from charaters
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // replace invalid chars with spaces
    slug = slug.replace(/[^a-z0-9\s-]/g, ' ').trim();

    // replace multiple spaces or hyphens with a single hyphen
    slug = slug.replace(/[\s-]+/g, '-');

    return slug;
}
