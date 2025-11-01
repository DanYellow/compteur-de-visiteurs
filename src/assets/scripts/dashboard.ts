import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { DateTime } from "luxon";

import type { LineChartEntry } from "#types";
import { listBusinessSector, listTimeSlots, listDays, listMonths, getWeeksRangeMonth } from "#scripts/utils.ts"

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement, Legend);

const greenNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-green-numixs')

const chartTitleStyle = {
    display: true,
    color: greenNumixs,
    font: {
        size: 22,
        style: 'normal',
        weight: 'normal',
        family: "Agency FB"
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
                // font: {
                //     weight: "bold"
                // }
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

;(() => {
    listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xLabels, xValuesSuffix }) => {
        const ctx = document.getElementById(id)!;

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
                            color: "white",
                            label: "Visites",
                            data: chartData,
                            backgroundColor: greenNumixs
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
                    },
                    scales: chartScales(xTitle),
                },
            }
        );
    })
})();

const detailsChartCtx = document.getElementById("detailsChart")!;
detailsChartsDialog?.addEventListener("toggle", async (e) => {
    const isOpened = e.newState === "open";

    if (isOpened) {
        const sourceBtn = e.source! as HTMLButtonElement;
        const chartSelected = sourceBtn.dataset.detailsChart;
        const chartData = JSON.parse(sourceBtn.closest("div")?.querySelector("canvas")?.dataset.chartData || "{}");
        const {xLabels, xValuesSuffix, chartTitle} = listCharts.find((item) => item.apiKey === chartSelected) || {};

        const lineChartDatasets:LineChartEntry[] = [];
        listBusinessSector.forEach((business) => {
            const visitorPerTypeAndPeriod = {
                [business.value]: new Array(xLabels.length).fill(0)
            };
            Object.entries(chartData).forEach(([xValueIndex, listVisitors], index) => {
                const he = listVisitors.reduce(
                    (acc, visitor) => ((acc[business.value] = (acc[business.value] || 0) + ((visitor[business.value] === "oui") ? 1 : 0)), acc),
                {});

                const indexArray = xLabels.findIndex((label) => {
                    if (typeof label === "object") {
                        return Number(label.id) === Number(xValueIndex)
                    }
                    return Number(label) === Number(xValueIndex);
                })

                visitorPerTypeAndPeriod[business.value][indexArray] = he[[business.value]]
            });

            lineChartDatasets.push({
                label: business.name,
                data: visitorPerTypeAndPeriod[business.value],
                borderColor: business.lineColor,
                tension: 0.1,
                fill: true,
            })
        })

        const chartLabels = xLabels.map((item) => {
            if (typeof item === 'object') {
                return `${item.name}${xValuesSuffix || ""}`;
            }

            return `${item}${xValuesSuffix || ""}`;
        })

        const data = {
            labels: chartLabels,
            datasets: lineChartDatasets,
        };

        // https://www.youtube.com/watch?v=jlgeG5K6bBg
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
                            ...chartTitleStyle
                        },
                    }
                }
            }
        )
    } else {
        try {
            const modalChart = Chart.getChart('detailsChart')
            modalChart?.destroy();
        } catch(e) {
        }
    }
})


