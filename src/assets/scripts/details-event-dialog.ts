import { DateTime } from "luxon";
import {
    Chart,
    BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    Title,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
    SubTitle,
    Legend,
    type ScriptableScaleContext,
    type ChartDataset,
} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';

import type EventModel from "#models/event.ts";
import type { Place_Visits, PlaceRaw, VisitRaw } from "#types";
import { TotalVisitors } from "./utils";

Chart.register(
    BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    LineController,
    LineElement,
    PointElement,
    SubTitle,
    ChartDataLabels,
    Legend,
);

const greenNumixs = window
    .getComputedStyle(document.body)
    .getPropertyValue("--color-green-numixs");

const listBarChartColors = [
    greenNumixs,
    "white",
    "#f7633d",
    "#0062f1",
    "#fbd284",
]

const modal = document.getElementById(
    "detail-event"
) as HTMLDialogElement;

const openingDateTime = modal.querySelector("time") as HTMLTimeElement;
const listPlacesContainer = modal.querySelector("ul") as HTMLUListElement;
const name = modal.querySelector("[data-name]") as HTMLParagraphElement;
const description = modal.querySelector(
    "[data-description]"
) as HTMLParagraphElement;
const globalChart = modal.querySelector("#global-chart") as HTMLCanvasElement;

modal?.addEventListener("toggle", async (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        listPlacesContainer.innerHTML = "";
        const sourceItem = toggleEvent.source! as HTMLButtonElement;
        const eventData = JSON.parse(
            sourceItem.dataset.eventData!
        ) as EventModel;

        name.textContent = eventData.nom;
        description.textContent = "";
        description.textContent = eventData.description;

        eventData.listPlaces.forEach((item: PlaceRaw) => {
            const li = document.createElement("li");
            li.textContent = item.nom;

            listPlacesContainer.append(li);
        });

        openingDateTime.dateTime = String(eventData.date);
        const [heure_ouverture_heure, heure_ouverture_minutes] =
            eventData.heure_ouverture.split(":");
        const [heure_fermeture_heure, heure_fermeture_minutes] =
            eventData.heure_fermeture.split(":");

        const date = DateTime.fromJSDate(
            new Date(eventData.date)
        ).toFormat("dd/LL/yyyy", { locale: "fr" });

        openingDateTime.textContent = `${date} de ${heure_ouverture_heure}h${heure_ouverture_minutes} à ${heure_fermeture_heure}h${heure_fermeture_minutes}`;

        const isCloseHourExactly = heure_fermeture_minutes === "00";

        const rangeOpeningHours = Math.abs(
            parseInt(heure_fermeture_heure) -
            parseInt(heure_ouverture_heure) - (isCloseHourExactly ? 1 : 0) +
            1
        );
        const xLabels = Array.from(
            new Array(rangeOpeningHours),
            (_, i) => i + parseInt(heure_ouverture_heure)
        ).map((item) => String(item));

        const req = await fetch(
            `api/evenements/${eventData.id}`
        );
        const res = await req.json();

        const allVisits = res.data.listPlaces
            .reduce((accumulator: Place_Visits[], currentPlace: Place_Visits) => {
                return [...accumulator, currentPlace.listVisits.map((item: VisitRaw) => ({ ...item, lieu: currentPlace.nom }))];
            }, [])
            .flat();

        const listVisitsPerPlace = Object.groupBy(
            allVisits as VisitRaw[],
            (item) => {
                return item.lieu!;
            }
        );

        const chartData: ChartDataset[] = []

        Object.entries(listVisitsPerPlace).forEach(([key, listVisits], idx) => {
            const groupedVisits = Object.groupBy(
                listVisits as VisitRaw[],
                (item) => {
                    return item.groupe;
                }
            );

            const data = xLabels.map((item) => {
                let key = item;

                if (groupedVisits[key]) {
                    const visitsForGroup = groupedVisits[key];
                    return visitsForGroup?.length;
                }
                return 0;
            });

            const color = listBarChartColors[idx % listBarChartColors.length]
            chartData.push({
                label: key,
                data: data,
                backgroundColor: `rgb(from ${color} r g b / 50%)`,
                borderColor: color,
                borderWidth: 1.5,
            })
        });

        ; (modal.querySelector("[data-download-chart]") as HTMLButtonElement)!.dataset.chartData = JSON.stringify({
            nom: `Lieux(x) : ${eventData.listPlaces.map((item: PlaceRaw) => item.nom).join(", ")}`
        });

        new Chart(globalChart, {
            type: "bar",
            data: {
                labels: xLabels.map((item) => `${item}h`),
                datasets: chartData,
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        text: `Visites uniques "${eventData.nom}"`,
                        display: true,
                        color: greenNumixs,
                        font: {
                            size: 26,
                            style: "normal",
                            weight: "normal",
                            family: "Agency FB",
                        },
                        padding: {
                            bottom: 0
                        }
                    },
                    totalVisitors: {
                        text: "Total : " + allVisits.length,
                        totalColor: greenNumixs,
                    },
                    subtitle: {
                        display: true,
                        text: `(${DateTime.fromISO(String(eventData.date)).toFormat("dd/LL/yyyy")})`,
                        color: "white",
                        font: {
                            size: 14,
                            style: 'normal',
                            weight: 'normal',
                            family: "Calibri"
                        },

                    },
                    ...(chartData.length ? {
                        legend: {
                            display: true,
                            labels: {
                                color: '#FFF',
                            },
                            title: {
                                display: true,
                                text: "Lieux",
                                color: '#FFF',
                                padding: {
                                    bottom: 0
                                },
                            }
                        }
                    } : {
                        legend: {
                            display: false,
                        }
                    }),
                    datalabels: {
                        font: {
                            size: 0
                        },
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: "white",
                            stepSize: 1,
                            font: {
                                size: 12,
                            },
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
                                size: 12,
                            },
                        },
                        beginAtZero: true,
                        stacked: true,
                    },
                    x: {
                        stacked: true,
                        ticks: {
                            color: "white",
                            font: {
                                size: 12,
                            },
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
                            text: "Tranche horaire",
                            color: "white",
                            font: {
                                size: 12,
                            },
                        },
                    },
                },
            },
            plugins: [TotalVisitors],
        });
    } else {
        try {
            const modalChart = Chart.getChart('global-chart')
            modalChart?.destroy();
        } catch (error) {

        }
    }
});
