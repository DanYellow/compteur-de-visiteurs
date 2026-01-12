import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend, SubTitle, type ScriptableScaleContext, type LegendItem, type ChartEvent, } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime, Info } from "luxon";

import type { ChartConfigData, EventRaw, LineChartEntry, VisitRaw } from "#types";
import { capitalizeFirstLetter, baseConfigData, getPivotTable, listGroups as listBusinessSector, getWeeksRangeMonth, uniqueByKey } from '#scripts/utils.shared.ts';
import { TotalVisitors, listGenders, listVisits as _listVisits, listAgeGroups, listDepartments } from '#scripts/utils.client.ts';
import { chartScales, chartTitleStyle, syncLegend } from '#scripts/utils.chart.ts';

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const linkDownloadChartData = document.querySelector("[data-download-chart-data='simple']") as HTMLLinkElement;
const tableDetailsChart = document.getElementById("table-details-chart") as HTMLTableElement;
const inputSyncCharts = document.querySelector('[data-switch-toggle-charts-sync]') as HTMLInputElement;

const placeData = JSON.parse((document.querySelector("[data-place]") as HTMLDivElement)?.dataset.place || "{}")

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement, Legend, ChartDataLabels, SubTitle);

const greenNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-green-numixs');

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
        id: "dailyChart",
        chartTitle: `Visites uniques du ${daySelected.toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?jour=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Tranche horaire',
        xLabels: baseConfigData.jour.listColumns!,
    },
    "semaine": {
        ...baseConfigData.semaine,
        id: "weeklyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("week").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("week").toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?semaine=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Jours',
        xLabels: baseConfigData.semaine.listColumns!,
    },
    "mois": {
        ...baseConfigData.mois,
        id: "monthlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("month").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("month").toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?mois=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Semaines',
        xLabels: baseConfigData.mois.listColumns!,
    },
    "annee": {
        ...baseConfigData.annee,
        id: "yearlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("year").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("year").toFormat("dd/LL/yyyy")}`,
        downloadLink: `/telecharger?annee=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}&pivot`,
        xTitle: 'Mois',
        xLabels: baseConfigData.annee.listColumns!,
    }
}

const listCharts = Object.values(configData);
const listChartsInstance: Chart[] = []

; (() => {
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
                                text: 'Visites : ' + res.data.length,
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
    })
})();

const detailsChartCtx = document.getElementById("detailsChart")! as HTMLCanvasElement;
detailsChartsDialog.addEventListener("toggle", async (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        const sourceBtn = toggleEvent.source! as HTMLButtonElement;
        const chartSelected = sourceBtn.dataset.detailsChart || "jour";
        const chartData = JSON.parse(sourceBtn.closest("div")?.querySelector("canvas")?.dataset.chartData || "{}");

        const { xLabels = [], xTitle = "", xValuesSuffix = "", chartTitle, downloadLink } = configData[chartSelected] || {};
        const totalVisits = Object.values(chartData).flat().length;

        linkDownloadChartData.href = downloadLink || "";

        const tableDetailsChartTableHeadRow = tableDetailsChart.querySelector("thead tr[data-tr-period]")! as HTMLTableRowElement;
        tableDetailsChartTableHeadRow.innerHTML = "";

        const tableDetailsChartTableHeadVisitTypeRow = tableDetailsChart.querySelector("thead tr[data-tr-visit-type]")! as HTMLTableRowElement;
        tableDetailsChartTableHeadVisitTypeRow.innerHTML = "";

        const tableDetailsChartTableBody = tableDetailsChart.querySelector("tbody")! as HTMLTableSectionElement;
        tableDetailsChartTableBody.innerHTML = "";

        const lineChartDatasets: LineChartEntry[] = [];

        const visitsHasEvents = Object.values(chartData).flat().some((item) => (item as VisitRaw).liste_evenements !== "")
        const chartDataPivotTable = getPivotTable(chartData, xLabels as [], { columnSuffix: xValuesSuffix, simplified: !visitsHasEvents })
        console.log(xLabels)
        Object.values(chartDataPivotTable).forEach((row, index, table) => {
            const trBody = document.createElement("tr");
            trBody.classList.add("hover:!bg-green-numixs/15");
            if (index % 2 === 0) {
                trBody.style.backgroundColor = "#00000075";
            }

            row.forEach((cell, cellIndex, listRows) => {
                if (index === 0) {
                    const th = document.createElement("th");
                    th.classList.add("px-2")
                    th.textContent = String(cell);
                    th.colSpan = 2;
                    tableDetailsChartTableHeadRow.append(th);

                    if (visitsHasEvents) {
                        for (let indexHead = 0; indexHead < 2; indexHead++) {
                            const th = document.createElement("th");
                            th.classList.add("px-2")
                            if (cellIndex !== 0) {
                                th.textContent = indexHead % 2 ? "Evènement" : "Régulière";
                            }
                            tableDetailsChartTableHeadVisitTypeRow.append(th);
                        }
                    }
                } else {
                    const td = document.createElement("td");

                    if (Array.isArray(cell)) {
                        cell.forEach((val, idx) => {
                            if (idx === 0) {
                                const tdReg = document.createElement("td");
                                tdReg.textContent = String(val);
                                tdReg.style.textAlign = "center";
                                tdReg.style.color = Number(val) > 0 ? greenNumixs : "";

                                if (cellIndex === listRows.length - 1) {
                                    tdReg.style.borderLeft = "2px solid white";
                                }
                                trBody.append(tdReg);
                            } else {
                                td.style.color = Number(val) > 0 ? greenNumixs : "";
                                td.textContent = String(val);
                            }
                        })
                    } else {
                        td.textContent = String(cell);
                        td.style.color = Number(cell) > 0 ? greenNumixs : "";
                        td.colSpan = 2;
                    }
                    if (cellIndex === 0) {
                        td.style.paddingLeft = "0.2rem";
                        td.colSpan = 2;
                    }
                    if (cellIndex > 0) {
                        td.style.textAlign = "center";
                    }

                    // Last column
                    if (cellIndex === listRows.length - 1 && !Array.isArray(cell)) {
                        td.style.borderLeft = "2px solid white";
                    }

                    // Last row
                    if (index === table.length - 1) {
                        td.style.borderTop = "2px solid white";
                        td.style.fontSize = "1.25rem";
                        td.style.paddingTop = "0.35rem";
                    }

                    trBody.append(td);
                }
            });

            if (index > 0 && index < table.length - 1) {
                const lineData = row.slice(1, row.length - 1);

                let flatData = []
                if (visitsHasEvents) {
                    flatData = lineData.map((item: unknown) => {
                        return (item as number[]).reduce((acc: number, value: number) => acc + value, 0)
                    })
                } else {
                    flatData = lineData;
                }

                lineChartDatasets.push({
                    label: row[0] as string,
                    data: flatData as number[],
                    borderColor: listBusinessSector.find((item) => item.label === row[0] as string)!.lineColor,
                    tension: 0,
                    fill: true,
                });
            }

            if (index > 0) {
                tableDetailsChartTableBody.append(trBody);
            }
        });

        const data = {
            labels: chartDataPivotTable[0].slice(1, chartDataPivotTable[0].length - 1),
            datasets: lineChartDatasets,
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
                                family: "Calibri"
                            },
                            padding: {
                                bottom: 10
                            },
                        },
                        totalVisitors: {
                            text: 'Visites : ' + totalVisits,
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
