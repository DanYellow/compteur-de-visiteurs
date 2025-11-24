import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend, SubTitle, type ScriptableScaleContext } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime, Info } from "luxon";

import type { ChartConfigData, CustomTitleOptions, LineChartEntry, TotalVisitorsPluginOptions, Visit } from "#types";
import { capitalizeFirstLetter, configData, getPivotTable, listGroups as listBusinessSector } from './utils.shared';

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const linkDownloadChartData = document.querySelector("[data-download-chart-data='simple']") as HTMLLinkElement;
const linkDownloadDetailedChartData = document.querySelector("[data-download-chart-data='detailed']") as HTMLLinkElement;
const tableDetailsChart = document.getElementById("table-details-chart") as HTMLTemplateElement;

const placeData = JSON.parse(document.querySelector("[data-place]")?.dataset.place || "{}")

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

if (Object.keys(placeData).length > 0) {
    const rangeOpeningHours = Math.abs(Number(placeData.heure_fermeture) - Number(placeData.heure_ouverture) + 1);
    const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + placeData.heure_ouverture).map((item) => String(item));

    configData.jour = {
        ...configData.jour,
        listColumns: listTimeSlots
    }

    const listClosedDaysIndex = placeData.jours_fermeture.map(Number);

    configData.semaine = {
        ...configData.semaine,
        listColumns: Info.weekdays('long', { locale: 'fr' })
            .map((item, idx) => {
                if (listClosedDaysIndex.includes(idx + 1)) {
                    return null
                }
                return {
                    name: capitalizeFirstLetter(item),
                    id: idx + 1
                }
            }).filter(Boolean)
    }
} else {
    const openingHoursLimitsReq = await fetch(`/api/lieux`);
    const openingHoursLimitsRes = (await openingHoursLimitsReq.json()).data || { heure_ouverture: "08:00", heure_fermeture: "20:00", jours_fermeture: ["6", "7"] };

    const [heure_ouverture_heure] = openingHoursLimitsRes.heure_ouverture.split(":");
    const [heure_fermeture_heure] = openingHoursLimitsRes.heure_fermeture.split(":");

    const rangeOpeningHours = Math.abs(parseInt(heure_fermeture_heure) - parseInt(heure_ouverture_heure) + 1);
    const listTimeSlots = Array.from(new Array(rangeOpeningHours), (_, i) => i + parseInt(heure_ouverture_heure)).map((item) => String(item));

    configData.jour = {
        ...configData.jour,
        listColumns: listTimeSlots
    }
    console.log(openingHoursLimitsRes.jours_fermeture)
    const listClosedDaysIndex = openingHoursLimitsRes.jours_fermeture.map(Number);

    const listOpenedDays = Info.weekdays('long', { locale: 'fr' })
        .map((item, idx) => {
            if (listClosedDaysIndex.includes(idx + 1)) {
                return null
            }
            return {
                name: capitalizeFirstLetter(item),
                id: idx + 1
            }
        }).filter(Boolean)

    configData.semaine = {
        ...configData.semaine,
        listColumns: listOpenedDays
    }
}

const TotalVisitors = {
    id: 'totalVisitors',
    beforeDraw: (chart: Chart, _args: any, options: TotalVisitorsPluginOptions) => {
        const { ctx } = chart;
        const { text = "", fontSize = "14px" } = options;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.font = `${fontSize} Calibri`;
        ctx.fillStyle = "white";

        let x = 6;
        const idxColon = text.indexOf(":")
        for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i)!;

            if (i > idxColon) {
                ctx.fillStyle = greenNumixs;
            }
            ctx.fillText(ch, x, chart.height - 10);
            x += ctx.measureText(ch).width;
        }

        ctx.restore();
    }
};

const chartScales = (xTitle: string, titleSize: number = 12) => {
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
        },
        x: {
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


const urlParams = new URLSearchParams(window.location.search);
const placeParam = urlParams.get('lieu');

const placeQueryParams = new URLSearchParams({
    ...((placeParam === "tous" || !placeParam) ? {} : { lieu: placeParam }),
});
const downloadLinkSuffix = placeQueryParams.toString().length ? `&${placeQueryParams.toString()}` : '';

const configDataRaw: ChartConfigData = {
    "jour": {
        ...configData.jour,
        id: "dailyChart",
        chartTitle: `Visites uniques du ${daySelected.toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?jour=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Tranche horaire',
        xLabels: configData.jour.listColumns,
    },
    "semaine": {
        ...configData.semaine,
        id: "weeklyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("week").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("week").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?semaine=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Jours',
        xLabels: configData.semaine.listColumns,
    },
    "mois": {
        ...configData.mois,
        id: "monthlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("month").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("month").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?mois=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Semaines',
        xLabels: configData.mois.listColumns,
    },
    "annee": {
        ...configData.annee,
        id: "yearlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("year").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("year").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?annee=${daySelected.toFormat("yyyy-LL-dd")}${downloadLinkSuffix}`,
        xTitle: 'Mois',
        xLabels: configData.annee.listColumns,
    }
}

const listCharts = Object.values(configDataRaw);

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

        const listVisitsGrouped = Object.groupBy(res.data as Visit[], (item) => {
            return item.groupe;
        });

        ctx.dataset.chartData = JSON.stringify(listVisitsGrouped);

        const chartData = xLabels.map((item) => {
            let key = item;
            if (typeof key === 'object') {
                key = String((item as { name: string; id: number; }).id);
            }

            if (listVisitsGrouped[key]) {
                const visitsForGroup = listVisitsGrouped[key];
                return visitsForGroup?.length;
            }
            return 0;
        });

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
                            label: "Visites uniques",
                            data: chartData,
                            backgroundColor: `rgba(213, 217, 22, 0.5)`,
                            borderColor: greenNumixs,
                            borderWidth: 1.5
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
                                bottom: 20
                            },
                        },
                        tooltip: {
                            enabled: true,
                        },
                        legend: {
                            display: false,
                        },
                        totalVisitors: {
                            text: 'Total : ' + res.data.length,
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
                    scales: chartScales(xTitle),
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
        const chartSelected = sourceBtn.dataset.detailsChart;
        const chartData = JSON.parse(sourceBtn.closest("div")?.querySelector("canvas")?.dataset.chartData || "{}");
        const { xLabels = [], xTitle = "", xValuesSuffix = "", chartTitle, downloadLink } = listCharts.find((item) => item.apiKey === chartSelected) || {};
        const totalVisits = Object.values(chartData).flat().length;

        linkDownloadChartData.href = downloadLink || "";
        linkDownloadDetailedChartData.href = `${downloadLink}&groupe` || "";

        const tableDetailsChartTableHeadRow = tableDetailsChart.querySelector("thead tr")! as HTMLTableRowElement;
        tableDetailsChartTableHeadRow.innerHTML = "";

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
                    tableDetailsChartTableHeadRow.append(th);
                } else {
                    const td = document.createElement("td");
                    td.textContent = String(cell);
                    if (cellIndex === 0) {
                        td.style.paddingLeft = "0.2rem";
                    }
                    if (cellIndex > 0) {
                        td.style.textAlign = "center";
                    }
                    td.style.color = Number(cell) > 0 ? greenNumixs : "";

                    if (cellIndex === listRows.length - 1) {
                        td.style.borderLeft = "2px solid white";
                    }

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

                lineChartDatasets.push({
                    label: row[0] as string,
                    data: lineData as number[],
                    borderColor: listBusinessSector.find((item) => item.name === row[0] as string)!.lineColor,
                    tension: 0,
                    fill: true,
                });
            }

            if (index > 0) {
                tableDetailsChartTableBody.append(trBody);
            }
        })

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


