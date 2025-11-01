import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { listTimeSlots, listDays, listMonths } from './utils';

const detailsChartsDialog = document.getElementById("detailsChartModal") as HTMLDialogElement;

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title, Tooltip, LineController, LineElement, PointElement);

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
    let modalChart: Chart | undefined = undefined;

    if (isOpened) {

        const chartSelected = e.source!.dataset.detailsChart;
        console.log(chartSelected)

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
            datasets: [{
                label: 'My First Dataset',
                data: [65, 59, 80, 81, 56, 55, 40],
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
        // https://www.youtube.com/watch?v=jlgeG5K6bBg
        modalChart = new Chart(
            detailsChartCtx,
            {
                type: 'line',
                data: data,
                options: {
                    maintainAspectRatio: false,
                    scales: chartScales("Visites")
                }
            }
        )
    } else {
        modalChart?.destroy();
    }
})


