import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title } from 'chart.js';
import { listTimeSlots, listDays, listMonths } from './utils';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Title);

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
    listCharts.forEach(async ({apiKey, id, chartTitle, xTitle, xValues, xValuesSuffix}) => {
        const ctx = document.getElementById(id)!;

        const req = await fetch(`/api?filtre=${apiKey}`);
        const res = await req.json();
        const listVisitsGrouped = Object.groupBy(res.data, (item: { item: Record<string, string|number> }) => {
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
                            label: 'Weekly Sales',
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
                        }
                    },
                    scales: {
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
            }
        );
    })
})()


