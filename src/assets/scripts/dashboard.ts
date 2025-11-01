import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import type { LineChartEntry } from "#types";
import { listBusinessSector, listTimeSlots, listDays, listMonths } from "#scripts/utils.ts"

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
                color: "rgba(255, 255, 255, 1)",
                drawOnChartArea: true,
                lineWidth: 0,
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
                color: "rgba(255, 255, 255, 0.05)",
                drawOnChartArea: true,
                lineWidth: 0,
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

const listCharts = [
    {
        apiKey: "heure",
        id: "dailyChart",
        chartTitle: "Visites du jour",
        xTitle: 'Tranche horaire',
        xValues: listTimeSlots,
        xValuesSuffix: "h",
    },
    {
        apiKey: "jour",
        id: "weeklyChart",
        chartTitle: "Visites hebdomadaire",
        xValues: listDays,
        xTitle: "Jours",
    },
    // {
    //     apiKey: "semaine",
    //     id: "weeklyChart",
    //     chartTitle: "Visites mensuelles",
    //     xValues: listDays,
    //     xTitle: "Semaines",
    // },
    {
        apiKey: "mois",
        id: "yearlyChart",
        chartTitle: "Visites mensuelles",
        xValues: listMonths,
        xTitle: "Mois",
    }
];

;(() => {
    listCharts.forEach(async ({ apiKey, id, chartTitle, xTitle, xValues, xValuesSuffix }) => {
        const ctx = document.getElementById(id)!;

        const req = await fetch(`/api?filtre=${apiKey}`);
        const res = await req.json();
        const listVisitsGrouped = Object.groupBy(res.data, (item: { item: Record<string, string | number> }) => {
            return item[apiKey];
        });
        ctx.dataset.chartData = JSON.stringify(listVisitsGrouped);

        const chartData = xValues.map((item) => {
            let key = item;
            if (typeof key === 'object') {
                key = item.id;

            }
            if (listVisitsGrouped[key]) {
                return listVisitsGrouped[key].length;
            }
            return 0;
        });

        const chartLabels = xValues.map((item) => {
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
                        }
                    },
                    scales: chartScales(xTitle),
                }
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
        const chartData = JSON.parse(sourceBtn.parentNode?.querySelector("canvas")?.dataset.chartData || "{}");

        const chartConfig = listCharts.find((item) => item.apiKey === chartSelected) || {};
        const xPlaceholderValues = new Array(chartConfig.xValues.length).fill(0);

        // const payload = {}
        // Object.entries(chartData).forEach(([key, listVisitors]) => {
        //     // console.log(key, value)
        //     const foo = {}
        //     listBusinessSector.forEach((business) => {
        //         foo[business.value] = 0
        //     })
        //     listVisitors.forEach((visitor) => {
        //         listBusinessSector.forEach((business) => {
        //             foo[business.value] += ((visitor[business.value] === "oui") ? 1 : 0) as number
        //         })
        //     })
        //     console.log(foo)
        // });
        // window.chartData = chartData;
        // console.log("chartData", chartData)
        const lineChartDatasets:LineChartEntry[] = [];

        listBusinessSector.forEach((business) => {
            const visitorPerTypeAndPeriod = {
                [business.value]: new Array(chartConfig.xValues.length).fill(0)
            };
            Object.entries(chartData).forEach(([xValueIndex, listVisitors]) => {
                console.log("xValueIndex", xValueIndex)
                const he = listVisitors.reduce(
                    (acc, visitor) => ((acc[business.value] = (acc[business.value] || 0) + ((visitor[business.value] === "oui") ? 1 : 0)), acc),
                {});
                visitorPerTypeAndPeriod[business.value][Number(xValueIndex)] = he[[business.value]]

            })

            lineChartDatasets.push({
                label: business.name,
                data: visitorPerTypeAndPeriod[business.value],
            })
        })
        console.log("hello", lineChartDatasets)

        const labels = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
        ];
        const data = {
            labels: labels,
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
                            text: `${chartConfig?.chartTitle || ""} détaillée`,
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


