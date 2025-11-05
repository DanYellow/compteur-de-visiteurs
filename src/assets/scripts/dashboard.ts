import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime, Info } from "luxon";

import { listGroups as listBusinessSector } from "#scripts/list-groups.ts";
import type { CustomTitleOptions, LineChartEntry, TotalVisitorsPluginOptions } from "#types";
import { listTimeSlots, getWeeksRangeMonth, getPivotTable } from "#scripts/utils.ts";
import { getLinearCSV } from './utils.shared';


const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const linkDownloadChartData = document.querySelector("[data-download-chart-data]") as HTMLLinkElement;
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

const chartScales = (xTitle: string) => {
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
                color: (ctx) => {
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
                    size: 12
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
                color: (ctx) => {
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
                    size: 14
                }
            }
        },
    }
}

const today = DateTime.now();

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

const listCharts = [
    // {
    //     apiKey: "heure",
    //     id: "dailyChart",
    //     chartTitle: `Visites uniques du ${today.toFormat("dd/LL/yyyy")}`,
    //     xTitle: 'Tranche horaire',
    //     xLabels: listTimeSlots,
    //     xValuesSuffix: "h",
    //     downloadLink: `visiteurs/telecharger?jour=${today.toFormat("yyyy-LL-dd")}`
    // },
    // {
    //     apiKey: "jour",
    //     id: "weeklyChart",
    //     chartTitle: `Visites uniques du ${today.startOf("week").toFormat("dd/LL/yyyy")} au ${today.endOf("week").toFormat("dd/LL/yyyy")}`,
    //     xLabels: listDays,
    //     xTitle: "Jours",
    //     downloadLink: `visiteurs/telecharger?semaine=${today.toFormat("yyyy-LL-dd")}`
    // },
    // {
    //     apiKey: "semaine",
    //     id: "monthlyChart",
    //     chartTitle: `Visites uniques du ${today.startOf("month").toFormat("dd/LL/yyyy")} au ${today.endOf("month").toFormat("dd/LL/yyyy")}`,
    //     xLabels: getWeeksRangeMonth(),
    //     xTitle: "Semaines",
    //     downloadLink: `visiteurs/telecharger?mois=${today.toFormat("yyyy-LL")}`
    // },
    {
        apiKey: "mois",
        id: "yearlyChart",
        chartTitle: `Visites uniques du ${today.startOf("year").toFormat("dd/LL/yyyy")} au ${today.endOf("year").toFormat("dd/LL/yyyy")}`,
        xLabels: listMonths,
        xTitle: "Mois",
        downloadLink: `visiteurs/telecharger?annee=${today.toFormat("yyyy")}`
    }
];

; (() => {
    listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xLabels, xValuesSuffix }) => {
        const ctx = document.getElementById(id)! as HTMLCanvasElement;

        const req = await fetch(`/api?filtre=${apiKey}`);
        const res = await req.json();

        // const csvHeader = Object.keys(res.data[0]);
        // csvHeader[1] = "Période";
        // csvHeader.pop()

        // const csvTotal = ["Total", "/", "/", ...new Array(listBusinessSector.filter((item) => (!("listInDb" in item) || item.listInDb)).length).fill(0)];
        // const csv = [csvHeader];

        // res.data.forEach((item) => {
        //     let groupName = xLabels[item.groupe];
        //     if (typeof groupName === 'object') {
        //         groupName = groupName.name;
        //     }

        //     Object.values(item).forEach((value, idx) => {
        //         if (value === "oui") {
        //             csvTotal[idx] += 1
        //         }
        //     });

        //     const rowData = Object.values({
        //         ...item,
        //         groupe: groupName
        //     })
        //     rowData.pop()
        //     csv.push(rowData);
        // });

        // csv.splice(1, 0, csvTotal);
        console.log(getLinearCSV(res.data))

        const listVisitsGrouped = Object.groupBy(res.data, (item: { item: Record<string, string | number> }) => {
            return item.groupe;
        });

        ctx.dataset.chartData = JSON.stringify(listVisitsGrouped);

        const chartData = xLabels.map((item) => {
            let key = item;
            if (typeof key === 'object') {
                key = item.id;
            }

            if (listVisitsGrouped[key]) {
                return listVisitsGrouped[key].length;
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
                            ...chartTitleStyle
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
        const { xLabels, xValuesSuffix, chartTitle, downloadLink } = listCharts.find((item) => item.apiKey === chartSelected) || {};
        const totalVisits = Object.values(chartData).flat().length;

        linkDownloadChartData.href = downloadLink || "";

        const tableDetailsChartTableHeadRow = tableDetailsChart.querySelector("thead tr")! as HTMLTableRowElement;
        tableDetailsChartTableHeadRow.innerHTML = "";

        const tableDetailsChartTableBody = tableDetailsChart.querySelector("tbody")! as HTMLTableSectionElement;
        tableDetailsChartTableBody.innerHTML = "";

        const lineChartDatasets: LineChartEntry[] = [];

        const chartDataPivotTable = getPivotTable(chartData, xLabels as [], {columnSuffix: xValuesSuffix || ""})

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
                    // borderColor: business.lineColor,
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
                    scales: chartScales("Visites"),
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: '#FFF'
                            }
                        },
                        title: {
                            text: `${(chartTitle || "").replace("uniques", "")} détaillées`,
                            ...chartTitleStyle,
                            font: {
                                ...chartTitleStyle.font,
                                size: 26,
                            }
                        },
                        totalVisitors: {
                            text: 'Total : ' + totalVisits,
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


