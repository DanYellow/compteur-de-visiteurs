import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend, type ScaleChartOptions, type ScriptableScaleContext } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime } from "luxon";

import type { CustomTitleOptions, LineChartEntry, TotalVisitorsPluginOptions, Visit } from "#types";
import { configData, getPivotTable, listGroups as listBusinessSector } from './utils.shared';


const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const linkDownloadChartData = document.querySelector("[data-download-chart-data='simple']") as HTMLLinkElement;
const linkDownloadDetailedChartData = document.querySelector("[data-download-chart-data='detailed']") as HTMLLinkElement;
const tableDetailsChart = document.getElementById("table-details-chart") as HTMLTemplateElement;

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement, Legend, ChartDataLabels);

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

const TotalVisitors = {
    id: 'totalVisitors',
    beforeDraw: (chart: Chart, args, options: TotalVisitorsPluginOptions) => {
        const { ctx } = chart;
        const { text = "", fontSize = "14px" } = options;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.font = `${fontSize} Calibri`;
        ctx.fillStyle = "white";
        ctx.fillText(text, 6, chart.height - 10);
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
                text: "Nombre de visites",
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

if (queryParams.has("current_date")) {
    const tmpDate = DateTime.fromISO(queryParams.get("current_date") as string);
    if (tmpDate.isValid) {
        daySelected = tmpDate;
    }
}

const configDataRaw = {
    "jour": {
        ...configData.jour,
        id: "dailyChart",
        chartTitle: `Visites uniques du ${daySelected.toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?jour=${daySelected.toFormat("yyyy-LL-dd")}`,
        xTitle: 'Tranche horaire',
        xLabels: configData.jour.listColumns,
    },
    "semaine": {
        ...configData.semaine,
        id: "weeklyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("week").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("week").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?semaine=${daySelected.toFormat("yyyy-LL-dd")}`,
        xTitle: 'Jours',
        xLabels: configData.semaine.listColumns,
    },
    "mois": {
        ...configData.mois,
        id: "monthlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("month").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("month").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?mois=${daySelected.toFormat("yyyy-LL-dd")}`,
        xTitle: 'Semaines',
        xLabels: configData.mois.listColumns,
    },
    "annee": {
        ...configData.annee,
        id: "yearlyChart",
        chartTitle: `Visites uniques du ${daySelected.startOf("year").toFormat("dd/LL/yyyy")} au ${daySelected.endOf("year").toFormat("dd/LL/yyyy")}`,
        downloadLink: `telecharger?annee=${daySelected.toFormat("yyyy-LL-dd")}`,
        xTitle: 'Mois',
        xLabels: configData.annee.listColumns,
    }
}

const listCharts = Object.values(configDataRaw);

; (() => {
    listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xLabels, xValuesSuffix }) => {
        const ctx = document.getElementById(id)! as HTMLCanvasElement;

        const req = await fetch(`/api?filtre=${apiKey}&jour=${daySelected.toFormat("yyyy-LL-dd")}`);
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
                                bottom: 20
                            }
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
detailsChartsDialog?.addEventListener("toggle", async (e) => {
    const isOpened = e.newState === "open";

    if (isOpened) {
        const sourceBtn = e.source! as HTMLButtonElement;
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
            row.forEach((cell, cellIndex, listRows) => {
                if (index === 0) {
                    const th = document.createElement("th");
                    th.classList.add("px-2")

                    th.textContent = String(cell);
                    tableDetailsChartTableHeadRow.append(th);
                } else {
                    const td = document.createElement("td");
                    td.textContent = String(cell);
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

        configDataRaw

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
                            font: {
                                ...chartTitleStyle.font,
                                size: 26,
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


