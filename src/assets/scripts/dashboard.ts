import {
    Chart, BarElement, BarController, CategoryScale,
    LinearScale, Title, LineController, LineElement, PointElement,
    Tooltip, Legend, SubTitle, type LegendItem, type ChartEvent,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime, Info } from "luxon";

import type { ChartConfigData, EventRaw, LineChartEntry, VisitRaw } from "#types";
import { capitalizeFirstLetter, baseConfigData, getPivotTable, getWeeksRangeMonth, uniqueByKey } from '#scripts/utils.shared';
import { TotalVisitors, listGenders, listVisits as _listVisits, listAgeGroups, listDepartments, listGroups as listBusinessSector, greenNumixs, grayNumixs } from '#scripts/utils.client';
import { chartScales, chartTitleStyle, syncLegend } from '#scripts/utils.chart';

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const linkDownloadChartData = document.querySelector("[data-download-chart-data='simple']") as HTMLLinkElement;
const tableDetailsChart = document.getElementById("table-details-chart") as HTMLTableElement;
const inputSyncCharts = document.querySelector('[data-switch-toggle-charts-sync]') as HTMLInputElement;

const placeData = JSON.parse((document.querySelector("[data-place]") as HTMLDivElement)?.dataset.place || "{}")

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement, Legend, ChartDataLabels, SubTitle);

let areChartsSync = true;

const [heure_ouverture_heure] = placeData.regularOpening.heure_ouverture.split(":");
const [heure_fermeture_heure, heure_fermeture_minutes] = placeData.regularOpening.heure_fermeture.split(":");

const isCloseHourExactly = heure_fermeture_minutes === "00";
const rangeOpeningHours = Math.abs(Number(heure_fermeture_heure) - Number(heure_ouverture_heure) - (isCloseHourExactly ? 1 : 0) + 1);
const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + Number(heure_ouverture_heure)).map((item) => String(item));

baseConfigData.jour = {
    ...baseConfigData.jour,
    listColumns: listTimeSlots
}

const listClosedDaysIndex = placeData.jours_fermeture.map(Number);

baseConfigData.semaine = {
    ...baseConfigData.semaine,
    listColumns: Info.weekdays('long', { locale: 'fr' })
        .map((item, idx) => {
            if (listClosedDaysIndex.includes(idx + 1)) {
                return null
            }
            return {
                name: capitalizeFirstLetter(item),
                id: idx + 1
            }
        }).filter((item) => item !== null)
}

inputSyncCharts.addEventListener("change", () => {
    areChartsSync = inputSyncCharts.checked
})

let daySelected = DateTime.now();
const queryParams = new URLSearchParams(window.location.search);

if (queryParams.has("date")) {
    const tmpDate = DateTime.fromISO(queryParams.get("date") as string);
    if (tmpDate.isValid) {
        daySelected = tmpDate;
    }
}

const placeParam = queryParams.get('lieu');

baseConfigData.mois = {
    ...baseConfigData.mois,
    listColumns: getWeeksRangeMonth(daySelected)
}

const placeQueryParams = new URLSearchParams({
    ...((placeParam === "tous" || !placeParam) ? {} : { lieu: placeParam }),
});
const downloadLinkSuffix = placeQueryParams.toString().length ? `&${placeQueryParams.toString()}` : '';

const filters = {
    age: {
        key: "tranche_age",
        group: listAgeGroups,
        legendTitle: "Tranches d'âge",
    },
    genre: {
        key: "genre",
        group: listGenders,
        legendTitle: "Genres",
    },
    departement: {
        key: "departement",
        group: listDepartments,
        legendTitle: "Départements",
    },
    visite: {
        key: "liste_evenements",
        group: _listVisits,
        legendTitle: "Visites",
    },
} as const;

type FilterKey = keyof typeof filters;

const filterParam = queryParams.get('filtre') as FilterKey || "visite";

const configData: ChartConfigData = {
    "jour": {
        ...baseConfigData.jour,
        id: "daily-chart",
        chartTitle: `Visites uniques du ${daySelected.toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?jour=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Tranche horaire',
        xLabels: baseConfigData.jour.listColumns!,
    },
    "semaine": {
        ...baseConfigData.semaine,
        id: "weekly-chart",
        chartTitle: `Visites uniques du ${daySelected.startOf("week").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("week").toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?semaine=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Jours',
        xLabels: baseConfigData.semaine.listColumns!,
    },
    "mois": {
        ...baseConfigData.mois,
        id: "monthly-chart",
        chartTitle: `Visites uniques du ${daySelected.startOf("month").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("month").toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?mois=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Semaines',
        xLabels: baseConfigData.mois.listColumns!,
    },
    "annee": {
        ...baseConfigData.annee,
        id: "yearly-chart",
        chartTitle: `Visites uniques du ${daySelected.startOf("year").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("year").toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?annee=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Mois',
        xLabels: baseConfigData.annee.listColumns!,
    },
    "tous": {
        ...baseConfigData.tous,
        id: "all-chart",
        chartTitle: `Toutes les visites uniques`,
        downloadLink: `/telecharger?tous${downloadLinkSuffix}&pivot`,
        xTitle: 'Année',
        xLabels: baseConfigData.tous.listColumns!,
    }
}

const listCharts = Object.values(configData);
const listChartsInstance: Chart[] = []

listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xLabels, xValuesSuffix }) => {
    const ctx = document.getElementById(id) as HTMLCanvasElement;

    const apiQueryParams = new URLSearchParams({
        filtre: apiKey,
        jour: daySelected.toFormat("yyyy-LL-dd"),
        ...((placeParam === "tous" || !placeParam) ? {} : { lieu: placeParam }),
    });

    const req = await fetch(`/api/visites?${apiQueryParams.toString()}`);
    const res = await req.json();
    const listVisitsGrouped = Object.groupBy(res.data as VisitRaw[], (item) => item.groupe);

    let listEventsHours = [] as { date: string, groupe: string, heure_fermeture: number, heure_ouverture: number, is_close_hour_exactly: boolean }[];

    const reqEvent = await fetch(`/api/evenements?${apiQueryParams.toString()}`);
    const resEvent = await reqEvent.json();

    if (resEvent.data) {
        resEvent.data.forEach((item: EventRaw) => {
            const [event_heure_ouverture_heure] = item.heure_ouverture.split(":");
            const [event_heure_fermeture_heure, event_heure_fermeture_minutes] = item.heure_fermeture.split(":");

            const isEventClosedAfterRegularHours = heure_fermeture_heure > parseInt(heure_fermeture_heure);
            const minutesToUse = isEventClosedAfterRegularHours ? heure_fermeture_minutes : event_heure_fermeture_minutes;

            listEventsHours.push({
                date: String(item.date),
                groupe: item.groupe,
                heure_fermeture: Math.max(Number(event_heure_fermeture_heure), Number(heure_fermeture_heure)),
                heure_ouverture: Math.min(Number(event_heure_ouverture_heure), Number(heure_ouverture_heure)),
                is_close_hour_exactly: minutesToUse === "00",
            })
        });

        if (apiKey === "jour") {
            const {
                heure_fermeture = Number(heure_fermeture_heure),
                heure_ouverture = Number(heure_ouverture_heure),
            } = listEventsHours?.[0] || {}

            let {
                is_close_hour_exactly: isCloseHourExactly = false,
            } = listEventsHours?.[0] || {}

            if (!resEvent.data.length && placeData.regularOpening) {
                isCloseHourExactly = placeData.regularOpening.heure_fermeture.split(":")[1] === "00"
            }

            const rangeOpeningHours = Math.abs(heure_fermeture - heure_ouverture - (isCloseHourExactly ? 1 : 0) + 1);
            xLabels = Array.from(new Array(rangeOpeningHours), (_, i) => i + heure_ouverture).map((item) => String(item));

            configData.jour = {
                ...configData.jour,
                xLabels,
            }
        } else if (apiKey === "semaine") {
            xLabels = [
                ...xLabels,
                ...resEvent.data.map((item: EventRaw) => item.jour)
            ].sort((itemA, itemB) => itemA.id - itemB.id);

            xLabels = uniqueByKey(xLabels, "id");

            configData.semaine = {
                ...configData.semaine,
                xLabels,
            }
        }
    }

    ctx.dataset.chartData = JSON.stringify(listVisitsGrouped);

    const chartDataNumber: { [key: string]: number[] } = {}
    filters[filterParam].group.forEach((item) => {
        chartDataNumber[item.value] = new Array(xLabels.length).fill(0);
    })

    const getIndexForKey = (value: string): number => {
        return xLabels.findIndex((item) => {
            let labelKey = item;
            if (typeof item === 'object') {
                labelKey = String((item as { name: string; id: number; }).id);
            }

            return labelKey === value;
        })
    }

    Object.entries(listVisitsGrouped).forEach(([key, listVisits]) => {
        const idx = getIndexForKey(key);

        listVisits?.forEach((visit) => {
            if (filterParam === "visite") {
                chartDataNumber[visit.liste_evenements === "" ? 0 : 1][idx] += 1;
            } else {
                chartDataNumber[visit[filters[filterParam].key]][idx] += 1;
            }
        })
    })

    const chartLabels = xLabels.map((item) => {
        if (typeof item === 'object') {
            return `${item.name}${xValuesSuffix || ""}`;
        }

        return `${item}${xValuesSuffix || ""}`;
    })

    listChartsInstance.push(
        new Chart(
            ctx,
            {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: filters[filterParam].group.map((item) => {
                        return {
                            label: item.label,
                            data: chartDataNumber[item.value],
                            backgroundColor: item.color,
                            borderColor: item.borderColor,
                            borderWidth: 1.5
                        }
                    })
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            text: chartTitle,
                            ...chartTitleStyle,
                            padding: {
                                bottom: 0
                            }
                        },
                        subtitle: {
                            display: true,
                            text: `(${placeData.nom ?? "Tous"})`,
                            color: "white",
                            font: {
                                size: 0,
                                style: 'normal',
                                weight: 'normal',
                                family: 'Calibri',
                            },
                        },
                        tooltip: {
                            enabled: true,
                        },
                        legend: {
                            display: true,
                            labels: {
                                color: '#FFF',
                            },
                            title: {
                                display: true,
                                text: filters[filterParam].legendTitle,
                                color: '#FFF',
                            },
                            onClick: (e: ChartEvent, legendItem: LegendItem, _legend: { chart: Chart }) => {
                                syncLegend(e, legendItem, _legend, listChartsInstance, areChartsSync);
                            },
                        },
                        totalVisitors: {
                            text: 'Visites sur la période : ' + res.data.length,
                            totalColor: greenNumixs,
                        },
                        datalabels: {
                            color: "white",
                            font: {
                                size: 0
                            },
                            anchor: "end",
                            align: "end",
                            offset: 3,
                            formatter: v => v ? v : ''
                        }
                    },
                    scales: chartScales(xTitle, undefined, true),
                },
                plugins: [TotalVisitors],
            }
        )
    );
});

const generateTotalCells = (tr: HTMLTableRowElement, data: number[][], rootArray?: unknown[], rootIndex?: number, hasEvents: boolean = false) => {
    const hasExtraParams = typeof rootIndex !== "undefined" && Array.isArray(rootArray);

    data.forEach((totalVisits, idxTotalVisits, totalVisitsArray) => {
        totalVisits.forEach((visit, idxVisit, array) => {
            const td = document.createElement("td");
            td.textContent = String(visit);
            td.style.textAlign = "center";
            td.style.color = Number(visit) > 0 ? greenNumixs : "";

            if (idxTotalVisits === totalVisitsArray.length - 1) {
                td.style.fontSize = "1.25rem";
                if (idxVisit === 0) {
                    td.style.borderLeft = "2px solid white";
                }
            }

            if (hasExtraParams && rootIndex >= rootArray.length - 2) {
                td.style.fontSize = '1.25rem';
                if (rootIndex === rootArray.length - (hasEvents ? 2 : 1)) {
                    td.style.borderTop = "2px solid white";
                }
            }

            if (totalVisits.length === 1) {
                td.colSpan = array.length;
            }

            tr.append(td);
        });
    })
}

const generateFirstRowCell = (data: { label: string }, colSpan: number = 1) => {
    const th = document.createElement("th");
    th.textContent = data.label;
    th.colSpan = colSpan;
    th.style.backgroundColor = grayNumixs;
    th.style.paddingInline = "0.5rem";
    th.style.textAlign = "left";
    th.classList.add(...["sticky", "left-0"]);

    return th;
}

const detailsChartCtx = document.getElementById("detailsChart")! as HTMLCanvasElement;
detailsChartsDialog.addEventListener("toggle", async (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        const sourceBtn = toggleEvent.source! as HTMLButtonElement;
        const chartSelected = sourceBtn.dataset.detailsChart || "jour";
        const chartData = JSON.parse(sourceBtn.closest("div")?.querySelector("canvas")?.dataset.chartData || "{}");

        const { xLabels = [], xTitle = "", xValuesSuffix = "", chartTitle, downloadLink } = configData[chartSelected] || {};


        linkDownloadChartData.href = downloadLink || "";

        const tableDetailsChartTableHead = tableDetailsChart.querySelector("thead") as HTMLTableSectionElement;
        tableDetailsChartTableHead.innerHTML = "";

        const tableDetailsChartTableBody = tableDetailsChart.querySelector("tbody") as HTMLTableSectionElement;
        tableDetailsChartTableBody.innerHTML = "";

        const tableDetailsChartTableFooter = tableDetailsChart.querySelector("tfoot") as HTMLTableSectionElement;
        tableDetailsChartTableFooter.innerHTML = "";

        const lineChartDatasets: LineChartEntry[] = [];

        const visitsHasEvents = Object.values(chartData).flat().some((item) => (item as VisitRaw).liste_evenements !== "")
        const tableData = getPivotTable(chartData, xLabels as [], visitsHasEvents)

        const totalVisits = tableData.footer.at(-1)?.total.flat().at(-1) || 0;

        const periodTableRow = document.createElement("tr");
        tableDetailsChartTableHead.append(periodTableRow);

        const visitTypeTableRow = document.createElement("tr");
        visitTypeTableRow.style.borderBottom = "2px solid white";
        tableDetailsChartTableHead.append(visitTypeTableRow);

        const nbSubColumns = tableData.body[0].total[0].length;

        // Table header
        ;[null, ...xLabels, "Total"].forEach((item, cellIndex, array) => {
            const th = document.createElement("th");
            th.classList.add(...['px-2']);
            if (item !== null) {
                const label = typeof item === 'object' ? item.name : item;
                th.textContent = `${label}${cellIndex === array.length - 1 ? "" : xValuesSuffix}`;
            } else {
                th.classList.add(...["sticky", "left-0"]);
                th.style.backgroundColor = grayNumixs;
            }
            th.colSpan = cellIndex === 0 ? 1 : nbSubColumns;
            if (cellIndex === array.length - 1) {
                th.style.borderLeft = "2px solid white";
            }
            periodTableRow.append(th);

            for (let indexHead = 0; indexHead < nbSubColumns; indexHead++) {
                const th = document.createElement("th");
                th.classList.add(...['px-2'])
                th.style.paddingBottom = "0.25rem";
                if (cellIndex === array.length - 1 && indexHead === 0) {
                    th.style.borderLeft = "2px solid white";
                }

                if (cellIndex === 0) {
                    if (indexHead === 0) {
                        th.colSpan = 1;
                        th.textContent = "Groupe / Type de visite";
                        th.style.backgroundColor = grayNumixs;
                        th.classList.add(...["sticky", "left-0"]);
                        visitTypeTableRow.append(th);
                    }
                } else {
                    th.textContent = indexHead % 2 ? "Evènement" : "Régulière";
                    visitTypeTableRow.append(th);
                }
            }
        })

        // Table body
        tableData.body.forEach((data, cellIndex) => {
            const trBody = document.createElement("tr");
            tableDetailsChartTableBody.append(trBody);

            trBody.classList.add(...["hover:!bg-green-numixs/15", "tr-details-table"]);

            const td = generateFirstRowCell(data, 1);
            trBody.append(td);

            if (cellIndex % 2 === 0) {
                td.style.backgroundColor = "#000000";
                trBody.style.backgroundColor = "#00000075";
            }

            generateTotalCells(trBody, data.total);

            lineChartDatasets.push({
                label: data.label,
                data: data.total.map((item: unknown) => {
                    return (item as number[]).reduce((acc: number, value: number) => acc + value, 0)
                }),
                borderColor: listBusinessSector.find((group) => group.label === data.label)!.borderColor,
                tension: 0,
                fill: true,
            });
        })

        // Table footer
        tableData.footer.forEach((data, cellIndex, array) => {
            const trFooter = document.createElement("tr");
            tableDetailsChartTableFooter.append(trFooter);

            trFooter.classList.add(...["hover:!bg-green-numixs/15", "tr-details-table"]);

            const td = generateFirstRowCell(data, 1);
            trFooter.append(td);

            if (cellIndex === 0) {
                td.style.borderTop = "2px solid white";
            }

            generateTotalCells(trFooter, data.total, array, cellIndex, visitsHasEvents)
        });

        if (visitsHasEvents) {
            Array.from(Array.from(tableDetailsChartTableFooter.childNodes).at(-1)!.childNodes).forEach((cell, idx) => {
                if (idx === 0) {
                    return;
                }
                (cell as HTMLTableCellElement).colSpan = 2;
            });
        }

        const data = {
            labels: xLabels.map((item) => {
                const label = typeof item === 'object' ? item.name : item
                return `${label}${xValuesSuffix}`;
            }),
            datasets: lineChartDatasets.map((item) => ({
                ...item,
                data: item.data.toSpliced(-1, 1)
            }))
        };

        new Chart(
            detailsChartCtx,
            {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: chartScales(xTitle, 18),
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: '#FFF',
                            },
                            title: {
                                display: true,
                                text: "Groupes",
                                color: '#FFF',
                            },
                        },
                        title: {
                            text: `${(chartTitle || "").replace("uniques", "détaillées")}`,
                            ...chartTitleStyle,
                            padding: {
                                bottom: 0
                            },
                            font: {
                                ...chartTitleStyle.font,
                                size: 26,
                            },
                        },
                        subtitle: {
                            display: true,
                            text: `(${placeData.nom ?? "Tous"})`,
                            color: "white",
                            font: {
                                size: 16,
                                style: 'normal',
                                weight: 'normal',
                                family: 'Calibri'
                            },
                            padding: {
                                bottom: 10
                            },
                        },
                        totalVisitors: {
                            text: 'Visites sur la période : ' + totalVisits,
                            fontSize: "18px",
                            totalColor: greenNumixs,
                        },
                        datalabels: {
                            color: "white",
                            align: "end",
                            font: {
                                size: 0
                            },
                            formatter: v => v ? v : ''
                        }
                    }
                },
                plugins: [TotalVisitors],
            }
        )
    } else {
        try {
            const modalChart = Chart.getChart('detailsChart');
            modalChart?.destroy();
        } catch (e) {
        }
    }
})
