import type { WeekMonth } from "#types";
import { DateTime } from "luxon";

export const listBusinessSector = [
    {
        "name": "Entreprise externe",
        "value": "entreprise_externe",
        "lineColor": '#ffc8fa',
        "listInChoices": false,
    },
    {
        "name": "Station Numixs",
        "value": "station_numixs",
        "lineColor": 'rgb(213, 217, 22)',
        "listInChoices": false,
    },
    {
        "name": "Entreprise",
        "value": "entreprise",
        "lineColor": 'rgb(15, 92, 192)',
        "listInDb": false,
    },
    {
        "name": "Éducation",
        "value": "education",
        "lineColor": 'rgb(75, 192, 192)',
    },
    {
        "name": "Artisan",
        "value": "artisan",
        "lineColor": 'rgb(255, 255, 255)',
    },
    {
        "name": "Artiste",
        "value": "artiste",
        "lineColor": '#ffdc00',
    },
    {
        "name": "Agent CARPF",
        "value": "agent_carpf",
        "lineColor": 'rgb(255, 108, 0)',
    },
    {
        "name": "Collectivité",
        "value": "collectivité",
        "lineColor": '#00610d',
    },
    {
        "name": "FabLab",
        "value": "fablab",
        "lineColor": 'rgb(217, 22, 123)',
    },
    {
        "name": "numixs Lab",
        "value": "numixs_lab",
        "lineColor": 'rgb(22, 180, 217)',
    },
    {
        "name": "Retraité",
        "value": "retraité",
        "lineColor": '#d901ff',
    },
    {
        "name": "Association",
        "value": "association",
        "lineColor": 'rgb(3, 252, 7)',
    },
    {
        "name": "En réinsertion pro",
        "value": "réinsertion_pro",
        "lineColor": 'rgb(3, 252, 205)',
    },
    {
        "name": "Autre",
        "value": "autre",
        "lineColor": 'rgb(252, 26, 3)',
    },
];

export const listTimeSlots = Array.from(new Array(10), (_, i) => i + 10).map((item) => String(item));
export const listDays = [{
    id: 1,
    name: "Lundi",
},
{
    id: 2,
    name: "Mardi",
},
{
    id: 3,
    name: "Mercredi",
},
{
    id: 4,
    name: "Jeudi",
},
{
    id: 5,
    name: "Vendredi",
},
{
    id: 6,
    name: "Samedi",
}];

export const listMonths = [{
    id: 1,
    name: "Janvier",
},
{
    id: 2,
    name: "Février",
},
{
    id: 3,
    name: "Mars",
},
{
    id: 4,
    name: "Avril",
},
{
    id: 5,
    name: "Mai",
},
{
    id: 6,
    name: "Juin",
},
{
    id: 7,
    name: "Juillet",
},
{
    id: 8,
    name: "Août",
},
{
    id: 9,
    name: "Septembre",
},
{
    id: 10,
    name: "Octobre",
},
{
    id: 11,
    name: "Novembre",
},
{
    id: 12,
    name: "Décembre",
}]

export const getWeeksRangeMonth = (startDate) => {
    const today = DateTime.now();
    const startMonth = today.startOf("month");
    const endMonth = today.endOf("month");

    const firstWeekInYear = DateTime.fromObject({ weekYear: today.year, weekNumber: startMonth.weekNumber });
    const lastWeekInYear = DateTime.fromObject({ weekYear: today.year, weekNumber: endMonth.weekNumber });

    const intervalYear = firstWeekInYear.until(lastWeekInYear.endOf("week"));
    const intervalWeeks = intervalYear.splitBy({ weeks: 1 });

    const listWeeks: WeekMonth[] = [];
    intervalWeeks.forEach((item) => {
        listWeeks.push({
            id: item.s.weekNumber,
            name: `${item.s.toFormat("dd/LL")} ➜ ${item.e.toFormat("dd/LL")}`
        })
    })

    return listWeeks;
}

export const loadImage = (obj: HTMLImageElement) => {
    return new Promise((resolve, reject) => {
        obj.onload = () => resolve(obj);
        obj.onerror = reject;
    });
}


export const slugify = (input: string): string => {
    if (!input)
        return '';

    // make lower case and trim
    var slug = input.toLowerCase().trim();

    // remove accents from charaters
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // replace invalid chars with spaces
    slug = slug.replace(/[^a-z0-9\s-]/g, ' ').trim();

    // replace multiple spaces or hyphens with a single hyphen
    slug = slug.replace(/[\s-]+/g, '-');

    return slug;
}

export const cancellableSleep = (duration: number, signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
        signal.throwIfAborted();

        const timeout = setTimeout(() => {
            resolve();
            signal.removeEventListener('abort', abort);
        }, duration);

        const abort = () => {
            clearTimeout(timeout);
            reject(signal.reason);
        }

        signal.addEventListener('abort', abort);
    });
}
