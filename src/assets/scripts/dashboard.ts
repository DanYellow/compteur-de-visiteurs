import { Chart, BarElement, BarController, CategoryScale, LinearScale, Title } from 'chart.js';
import { listTimeSlots } from './utils';

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

(async () => {
    const ctx = document.getElementById('dailyChart');

    const req = await fetch("/api");
    const res = await req.json();

    const listVisitsGrouped = Object.groupBy(res.data, ({ groupe }) => groupe);

    const chartData = listTimeSlots.map((item) => {
        if (listVisitsGrouped[item]) {
            return listVisitsGrouped[item].length;
        }
        return 0;
    });

    new Chart(
        ctx,
        {
            type: 'bar',
            data: {
                labels: listTimeSlots.map((item) => `${item}h`),
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
                        text: "Visites quotidiennes",
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
                            text: 'Tranche horaire',
                            color: "white",
                        }
                    },

                }
            }
        }
    );
})()

