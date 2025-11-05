import type { PivotTableOptions, Result, WeekMonth } from "#types";
import { DateTime } from "luxon";

import { listGroups as listBusinessSector } from "#scripts/list-groups.ts";

const [openHours, closeHours] = import.meta.env.OPENING_HOURS.split("-").map(Number);
const rangeOpeningHours = Math.abs(Number(closeHours) - Number(openHours) + 1);

export const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + openHours).map((item) => String(item));

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

export const getPivotTable = (data: Result, columns = [], options: PivotTableOptions = {columnSuffix: ""}) => {
    const tableValues = [];
    const totalVisits = Object.values(data)
        .flat()
        .map((item) => Object.values(item).reduce((total: number, x) => (x === "oui" ? total + 1 : total), 0))
        .reduce((total: number, val: number) => total + val, 0)

    const tableHeaderColumns = ["Groupe"];
    const tableValuesPlaceholder: number[] = [];

    ;[...columns].forEach((label: string | Record<string, string>) => {
        if (typeof label === "object") {
            tableHeaderColumns.push(`${label.name}${options.columnSuffix}`);
        } else {
            tableHeaderColumns.push(`${label}${options.columnSuffix}`);
        }
        tableValuesPlaceholder.push(0);
    });
    tableHeaderColumns.push("Total par groupe");
    tableValues.push(tableHeaderColumns);

    const tableFooter = ["Total (visites)", ...tableValuesPlaceholder];

    listBusinessSector.forEach((business) => {
        const rowValues = [business.name];

        const visitorPerTypeAndPeriod = {
            [business.value]: new Array(columns.length || 0).fill(0),
        };

        Object.entries(data).forEach(([group, listVisits]) => {
            const totalPerGroup = listVisits.reduce(
                (acc: Record<string, number>, visit) => ((acc[business.value] = (acc[business.value] || 0) + ((visit[business.value] === "oui") ? 1 : 0)), acc),
                {});

            let indexArray = columns.findIndex((label: string | Record<string, number>) => {
                if (typeof label === "object") {
                    return Number(label.id) === Number(group);
                }
                return Number(label) === Number(group);
            });

            if (indexArray >= 0) {
                tableFooter[indexArray] += totalPerGroup[business.value];
                visitorPerTypeAndPeriod[business.value][indexArray] = totalPerGroup[business.value];
            }
        });

        visitorPerTypeAndPeriod[business.value].forEach((value) => {
            rowValues.push(value);
        });

        const totalBusiness = visitorPerTypeAndPeriod[business.value].reduce((acc, value) => acc + value, 0);
        rowValues.push(totalBusiness);

        tableValues.push(rowValues);
    });

    tableFooter.push(totalVisits);
    tableValues.push(tableFooter);

    return tableValues;
}
