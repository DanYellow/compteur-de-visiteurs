import type { PivotTableOptions, Result, WeekMonth } from "#types";
import { DateTime, Info } from "luxon";

import config from "#config" with { type: "json" };

export const listGroups = [
    {
        "name": "Entreprise\nexterne",
        "value": "entreprise_externe",
        "lineColor": '#ffc8fa',
        "listInChoices": false,
    },
    {
        "name": "Entreprise\nStation Numixs",
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

export const getPivotTable = (data: Result, columns = [], options: PivotTableOptions = { columnSuffix: "" }) => {
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

    listGroups.forEach((business) => {
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
                tableFooter[indexArray + 1] += totalPerGroup[business.value];
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

export const getLinearCSV = (data: Result[]) => {
    const csvHeader = Object.keys(data[0]);
    csvHeader[1] = "Période";
    csvHeader.pop();

    const csvTotal = ["Total", "/", "/", ...new Array(listGroups.filter((item) => (!("listInDb" in item) || item.listInDb)).length).fill(0)];
    const csvPayload = [csvHeader];

    data.forEach((item) => {
        // let groupName = xLabels[item.groupe];
        // if (typeof groupName === 'object') {
        //     groupName = groupName.name;
        // }

        Object.values(item).forEach((value, idx) => {
            if (value === "oui") {
                csvTotal[idx] += 1
            }
        });

        const rowData: string[] = Object.values({
            ...item,
            // groupe: groupName
        })
        rowData.pop()
        csvPayload.push(rowData);
    });

    csvPayload.splice(1, 0, csvTotal);

    return csvPayload;
}

const [openHours, closeHours] = config.OPENING_HOURS.split("-").map(Number);
const rangeOpeningHours = Math.abs(Number(closeHours) - Number(openHours) + 1);

const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + openHours).map((item) => String(item));

const listDays = Info.weekdays('long', {locale: 'fr'})
    .filter((item) => item !== "samedi" && item !== "dimanche")
    .map((item, idx) => ({
        name: item.charAt(0).toUpperCase() + String(item).slice(1),
        id: idx + 1
    }));

const listMonths = Info.months('long', {locale: 'fr' })
    .map((item, idx) => ({
        name: item.charAt(0).toUpperCase() + String(item).slice(1),
        id: idx + 1
    }));

const getWeeksRangeMonth = (startDate) => {
    const today = DateTime.now();
    const startMonth = today.startOf("month");
    const endMonth = today.endOf("month");

    // const firstWeekInMonth = DateTime.fromObject({ weekYear: today.year, weekNumber: startMonth.weekNumber, day: 1 });
    // const lastWeekInMonth = DateTime.fromObject({ weekYear: today.year, weekNumber: endMonth.weekNumber });

    const intervalYear = startMonth.until(endMonth);
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

export const configData = {
    "jour": {
        apiKey: "jour",
        listColumns: listTimeSlots,
        xValuesSuffix: "h",
    },
    "semaine": {
        apiKey: "semaine",
        listColumns: listDays,
    },
    "mois": {
        apiKey: "mois",
        listColumns: getWeeksRangeMonth(),
    },
    "annee": {
        apiKey: "annee",
        listColumns: listMonths,
    }
}
