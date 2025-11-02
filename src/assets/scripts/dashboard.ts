import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DateTime } from "luxon";

import type { CustomTitleOptions, LineChartEntry, TotalVisitorsPluginOptions } from "#types";
import { listBusinessSector, listTimeSlots, listDays, listMonths, getWeeksRangeMonth } from "#scripts/utils.ts"

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;
const tableTheadRowTemplateRaw = document.getElementById("table-details-chart-thead-row") as HTMLTemplateElement;

const tableDetailsChart = document.getElementById("table-details-chart") as HTMLTemplateElement;

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement, Legend, ChartDataLabels);

const greenNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-green-numixs')

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

const listCharts = [
    {
        apiKey: "heure",
        id: "dailyChart",
        chartTitle: `Visites du ${today.toFormat("dd/LL/yyyy")}`,
        xTitle: 'Tranche horaire',
        xLabels: listTimeSlots,
        xValuesSuffix: "h",
    },
    {
        apiKey: "jour",
        id: "weeklyChart",
        chartTitle: `Visites du ${today.startOf("week").toFormat("dd/LL/yyyy")} au ${today.endOf("week").toFormat("dd/LL/yyyy")}`,
        xLabels: listDays,
        xTitle: "Jours",
    },
    {
        apiKey: "semaine",
        id: "monthlyChart",
        chartTitle: `Visites du ${today.startOf("month").toFormat("dd/LL/yyyy")} au ${today.endOf("month").toFormat("dd/LL/yyyy")}`,
        xLabels: getWeeksRangeMonth(),
        xTitle: "Semaines",
    },
    {
        apiKey: "mois",
        id: "yearlyChart",
        chartTitle: `Visites du ${today.startOf("year").toFormat("dd/LL/yyyy")} au ${today.endOf("year").toFormat("dd/LL/yyyy")}`,
        xLabels: listMonths,
        xTitle: "Mois",
    }
];

; (() => {
    listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xLabels, xValuesSuffix }) => {
        const ctx = document.getElementById(id)! as HTMLCanvasElement;

        const req = await fetch(`/api?filtre=${apiKey}`);
        const res = await req.json();
        const listVisitsGrouped = Object.groupBy(res.data, (item: { item: Record<string, string | number> }) => {
            return item[apiKey];
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
                            label: "Visites",
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
                            align: "top",
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
        const { xLabels, xValuesSuffix, chartTitle } = listCharts.find((item) => item.apiKey === chartSelected) || {};
        const totalVisits = Object.values(chartData).flat().length;

        const tableDetailsChartTableHeadRow = tableDetailsChart.querySelector("thead tr")! as HTMLTableRowElement;
        const tableDetailsChartTableBody = tableDetailsChart.querySelector("tbody")! as HTMLTableSectionElement;
        tableDetailsChartTableHeadRow.innerHTML = "";

        const tableTheadRowTemplate = tableTheadRowTemplateRaw.content.cloneNode(true);
        tableTheadRowTemplate.querySelector("th")!.textContent = "Groupe"
        tableDetailsChartTableHeadRow.append(tableTheadRowTemplate)

        const valuesPerPeriod: Record<string, number> = {}

        xLabels?.forEach((label) => {
            const tableTheadRowTemplate = tableTheadRowTemplateRaw.content.cloneNode(true);
            if (typeof label === "object") {
                valuesPerPeriod[label.id] = 0;
                tableTheadRowTemplate.querySelector("th").textContent = `${label.name}${xValuesSuffix || ""}`
            } else {
                valuesPerPeriod[label] = 0;
                tableTheadRowTemplate.querySelector("th").textContent = `${label}${xValuesSuffix || ""}`
            }

            tableDetailsChartTableHeadRow.append(tableTheadRowTemplate);
        })


        console.log(xLabels)
        const lineChartDatasets: LineChartEntry[] = [];
        tableDetailsChartTableBody.innerHTML = "";
        listBusinessSector.forEach((business) => {
            const trBody = document.createElement("tr");
            const td = document.createElement("td");

            td.textContent = business.name;
            trBody.append(td);

            const visitorPerTypeAndPeriod = {
                [business.value]: new Array(xLabels?.length || 0).fill(0)
            };
            Object.entries(chartData).forEach(([xValueIndex, listVisitors]) => {
                const visitorsReducer = listVisitors.reduce(
                    (acc, visitor) => ((acc[business.value] = (acc[business.value] || 0) + ((visitor[business.value] === "oui") ? 1 : 0)), acc),
                    {});

                const indexArray = (xLabels || []).findIndex((label) => {
                    if (typeof label === "object") {
                        return Number(label.id) === Number(xValueIndex)
                    }
                    return Number(label) === Number(xValueIndex);
                });
                visitorPerTypeAndPeriod[business.value][indexArray] = visitorsReducer[[business.value]];
            });

            visitorPerTypeAndPeriod[business.value].forEach((item) => {
                const td = document.createElement("td");
                td.textContent = item;
                td.classList.add("text-center");
                td.style.textAlign = "center";
                td.style.color = item > 0 ? greenNumixs : "";
                td.classList.toggle("text-green-numixs", item > 0)
                trBody.append(td)
            })

            tableDetailsChartTableBody.append(trBody)

            lineChartDatasets.push({
                label: business.name,
                data: visitorPerTypeAndPeriod[business.value],
                borderColor: business.lineColor,
                tension: 0.1,
                fill: true,
            });
        });

        // Total row
        const trTotal = document.createElement("tr") as HTMLTableRowElement;
        trTotal.style.fontSize = "1.25rem";
        const td = document.createElement("td") as HTMLTableCellElement;
        td.textContent = "Total";
        td.style.borderTop = "2px solid white";
        td.style.paddingTop = "0.35rem";
        trTotal.append(td);

        Object.entries(chartData).forEach(([key, value]) => {
            valuesPerPeriod[key] = String(value.length)
        });

        Object.values(valuesPerPeriod).forEach((item) => {
            const td = document.createElement("td") as HTMLTableCellElement;
            td.textContent = String(item);
            td.style.textAlign = "center";
            td.style.borderTop = "2px solid white";
            td.style.paddingTop = "0.35rem";
            td.style.color = item > 0 ? greenNumixs : "";
            trTotal.append(td);
        })

        tableDetailsChartTableBody.append(trTotal);

        const chartLabels = xLabels!.map((item) => {
            if (typeof item === 'object') {
                return `${item.name}${xValuesSuffix || ""}`;
            }

            return `${item}${xValuesSuffix || ""}`;
        });

        const data = {
            labels: chartLabels,
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
                            text: `${chartTitle || ""} détaillée`,
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


