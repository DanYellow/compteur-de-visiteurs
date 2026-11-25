import { Chart, type ChartEvent, type LegendItem, type ScriptableScaleContext } from 'chart.js';
import type { CustomTitleOptions } from "#types";

export const chartScales = (xTitle: string, titleSize: number = 12, stacked = false) => {
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
            stacked,
        },
        x: {
            stacked,
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

const greenNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-green-numixs');

export const chartTitleStyle: CustomTitleOptions = {
    display: true,
    color: greenNumixs,
    font: {
        size: 22,
        style: 'normal',
        weight: 'normal',
        family: 'Agency FB'
    }
};

export const syncLegend = (_e: ChartEvent, legendItem: LegendItem, legend: { chart: Chart }, listCharts: Chart[], synced = true) => {
    const datasetIndex = legendItem.datasetIndex;

    if (datasetIndex === undefined) {
        return;
    }

    if (!synced) {
        legend.chart.setDatasetVisibility(
            datasetIndex,
            !legend.chart.isDatasetVisible(datasetIndex)
        );
        legend.chart.update();

        return;
    }

    listCharts.forEach((chart: Chart) => {
        chart.setDatasetVisibility(
            datasetIndex,
            !chart.isDatasetVisible(datasetIndex)
        );
        chart.update();
    });
};
