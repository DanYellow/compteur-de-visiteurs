import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend, SubTitle, type ScriptableScaleContext } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime, Info } from "luxon";

import type { ChartConfigData, CustomTitleOptions, EventRaw, LineChartEntry, VisitRaw } from "#types";
import { capitalizeFirstLetter, baseConfigData, getPivotTable, listGroups as listBusinessSector, getWeeksRangeMonth } from './utils.shared';
import { TotalVisitors } from './utils';

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const linkDownloadChartData = document.querySelector("[data-download-chart-data='simple']") as HTMLLinkElement;
const linkDownloadDetailedChartData = document.querySelector("[data-download-chart-data='detailed']") as HTMLLinkElement;
const tableDetailsChart = document.getElementById("table-details-chart") as HTMLTableElement;

const placeData = JSON.parse((document.querySelector("[data-place]") as HTMLDivElement)?.dataset.place || "{}")

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement, Legend, ChartDataLabels, SubTitle);

const greenNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-green-numixs');

const chartTitleStyle: CustomTitleOptions = {
    display: true,
    color: greenNumixs,
    font: {
        size: 22,
        style: 'normal',
        weight: 'normal',
        family: "Agency FB"
    }
};

const isCloseHourExactly = placeData.minutes_fermeture === "00";
const rangeOpeningHours = Math.abs(Number(placeData.heure_fermeture) - Number(placeData.heure_ouverture) - (isCloseHourExactly ? 1 : 0) + 1);
const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + placeData.heure_ouverture).map((item) => String(item));

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

export const chartScales = (xTitle: string, titleSize: number = 12, stacked = false) => {
    return {
        y: {
            ticks: {
                color: "white",
                stepSize: 1,
                font: {
                    size: 12
                }
            },

            grid: {
                color: (ctx: ScriptableScaleContext) => {
                    if (ctx.index === 0) {
                        return "rgba(255, 255, 255, 1)";
                    }
                },
                drawOnChartArea: true,
                lineWidth: 1,
            },
            title: {
                display: true,
                text: "Visites uniques",
                color: "white",
                font: {
                    size: titleSize
                }
            },
            beginAtZero: true,
            stacked,
        },
        x: {
            stacked,
            ticks: {
                color: "white",
                font: {
                    size: 12
                }
            },
            grid: {
                color: (ctx: ScriptableScaleContext) => {
                    if (ctx.index === 0) {
                        return "rgba(255, 255, 255, 1)";
                    }
                },
                drawOnChartArea: true,
                lineWidth: 1,
            },
            title: {
                display: true,
                text: xTitle,
                color: "white",
                font: {
                    size: titleSize
                },
            }
        },
    }
}

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

const configData: ChartConfigData = {
    "jour": {
        ...baseConfigData.jour,
        id: "dailyChart",
        chartTitle: `Visites uniques du ${daySelected.toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?jour=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Tranche horaire',
        xLabels: baseConfigData.jour.listColumns!,
    },
    "semaine": {
        ...baseConfigData.semaine,
        id: "weeklyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("week").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("week").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?semaine=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Jours',
        xLabels: baseConfigData.semaine.listColumns!,
    },
    "mois": {
        ...baseConfigData.mois,
        id: "monthlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("month").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("month").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?mois=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Semaines',
        xLabels: baseConfigData.mois.listColumns!,
    },
    "annee": {
        ...baseConfigData.annee,
        id: "yearlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("year").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("year").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?annee=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Mois',
        xLabels: baseConfigData.annee.listColumns!,
    }
}

const listCharts = Object.values(configData);

; (() => {
    listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xLabels, xValuesSuffix }) => {
        const ctx = document.getElementById(id)! as HTMLCanvasElement;

        const apiQueryParams = new URLSearchParams({
            filtre: apiKey,
            jour: daySelected.toFormat("yyyy-LL-dd"),
            ...((placeParam === "tous" || !placeParam) ? {} : { lieu: placeParam }),
        });

        const req = await fetch(`/api?${apiQueryParams.toString()}`);
        const res = await req.json();

        const listVisitsGrouped = Object.groupBy(res.data as VisitRaw[], (item) => {
            return item.groupe;
        });

        let eventData: number[] = [];
        let listEventsHours = [];

        const reqEvent = await fetch(`/api/evenements?${apiQueryParams.toString()}`);
        const resEvent = await reqEvent.json();

        if (resEvent.data) {
            resEvent.data.forEach((item) => {
                const [heure_ouverture_heure] = item.heure_ouverture.split(":");
                const [heure_fermeture_heure, heure_fermeture_minutes] = item.heure_fermeture.split(":");

                const isEventCloseAfterRegularHours = placeData.heure_fermeture > parseInt(heure_fermeture_heure);
                const minutesToUse = isEventCloseAfterRegularHours ? placeData.minutes_fermeture : heure_fermeture_minutes;

                listEventsHours.push({
                    date: item.date,
                    groupe: item.groupe,
                    heure_fermeture: Math.max(parseInt(heure_fermeture_heure), placeData.heure_fermeture),
                    heure_ouverture: Math.min(parseInt(heure_ouverture_heure), placeData.heure_ouverture),
                    is_close_hour_exactly: minutesToUse === "00",
                })
            });

            eventData = new Array(xLabels.length).fill(0);

            if (apiKey === "jour") {
                const {
                    heure_fermeture = placeData.heure_fermeture,
                    heure_ouverture = placeData.heure_ouverture,
                    is_close_hour_exactly: isCloseHourExactly = false,
                } = listEventsHours?.[0] || {}

                const rangeOpeningHours = Math.abs(heure_fermeture - heure_ouverture - (isCloseHourExactly ? 1 : 0) + 1);
                xLabels = Array.from(new Array(rangeOpeningHours), (_, i) => i + heure_ouverture).map((item) => String(item));

                eventData = new Array(xLabels.length).fill(0);

                configData.jour = {
                    ...configData.jour,
                    xLabels,
                }
            } else if (apiKey === "semaine") {
                xLabels = [
                    ...xLabels,
                    ...resEvent.data.map((item: EventRaw) => item.jour)
                ].sort((itemA, itemB) => itemA.id - itemB.id);

                xLabels = Array.from(new Set(xLabels.map((item) => JSON.stringify(item)))).map((item) => JSON.parse(item))

                eventData = new Array(xLabels.length).fill(0);

                configData.semaine = {
                    ...configData.semaine,
                    xLabels,
                }
            }
        }

        ctx.dataset.chartData = JSON.stringify(listVisitsGrouped);

        const regularData: number[] = new Array(xLabels.length).fill(0);

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
                if (visit.liste_evenements === "/") {
                    regularData[idx] += 1;
                } else {
                    eventData[idx] += 1;
                }
            })
        })

        const chartLabels = xLabels.map((item) => {
            if (typeof item === 'object') {
                return `${item.name}${xValuesSuffix || ""}`;
            }

            return `${item}${xValuesSuffix || ""}`;
        })

        new Chart(
            ctx,
            {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: "Visites régulières",
                            data: regularData,
                            backgroundColor: `rgba(213, 217, 22, 0.5)`,
                            borderColor: greenNumixs,
                            borderWidth: 1.5
                        },
                        {
                            label: "Visites évènement",
                            data: eventData,
                            backgroundColor: `rgba(255, 255, 255, 0.5)`,
                            borderColor: "white",
                            borderWidth: 1.5,
                        }
                    ]
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
                                family: "Calibri"
                            },
                            padding: {
                                bottom: eventData.filter(Boolean).some((item) => item !== 0) ? 0 : 20
                            },
                        },
                        tooltip: {
                            enabled: true,
                        },
                        ...(eventData.filter(Boolean).some((item) => item !== 0) ? {
                            legend: {
                                display: true,
                                labels: {
                                    color: '#FFF',
                                },
                                title: {
                                    display: true,
                                    text: "Visites",
                                    color: '#FFF',
                                }
                            }
                        } : {
                            legend: {
                                display: false,
                            }
                        })
                        ,
                        totalVisitors: {
                            text: 'Total : ' + res.data.length,
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
        linkDownloadDetailedChartData.href = `${downloadLink}&groupe` || "";

        const tableDetailsChartTableHeadRow = tableDetailsChart.querySelector("thead tr[data-tr-period]")! as HTMLTableRowElement;
        tableDetailsChartTableHeadRow.innerHTML = "";

        const tableDetailsChartTableHeadVisitTypeRow = tableDetailsChart.querySelector("thead tr[data-tr-visit-type]")! as HTMLTableRowElement;
        tableDetailsChartTableHeadVisitTypeRow.innerHTML = "";

        const tableDetailsChartTableBody = tableDetailsChart.querySelector("tbody")! as HTMLTableSectionElement;
        tableDetailsChartTableBody.innerHTML = "";

        const lineChartDatasets: LineChartEntry[] = [];

        const chartDataPivotTable = getPivotTable(chartData, xLabels as [], { columnSuffix: xValuesSuffix })

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

                    for (let indexHead = 0; indexHead < 2; indexHead++) {
                        const th = document.createElement("th");
                        th.classList.add("px-2")
                        if (cellIndex !== 0) {
                            th.textContent = indexHead % 2 ? "Evènement" : "Régulière";
                        }
                        tableDetailsChartTableHeadVisitTypeRow.append(th);
                    }

                } else {
                        const td = document.createElement("td");

                        if (Array.isArray(cell)) {
                            cell.forEach((val, idx) => {
                                if(idx === 0) {
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

                const flatData = lineData.map((item) => item.reduce((acc, value) => acc+value, 0))
                lineChartDatasets.push({
                    label: row[0] as string,
                    data: flatData as number[],
                    borderColor: listBusinessSector.find((item) => item.name === row[0] as string)!.lineColor,
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
                            }
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
                            text: 'Total : ' + totalVisits,
                            fontSize: "18px",
                            totalColor: greenNumixs,
                        },
                        datalabels: {
                            color: "white",
                            align: "end",
                            // borderColor: "white",
                            // borderRadius: 10,
                            // borderWidth: 1,
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
            const modalChart = Chart.getChart('detailsChart')
            modalChart?.destroy();
        } catch (e) {
        }
    }
})


