import { DateTime } from "luxon";
import { Chart } from 'chart.js';

const listDownloadButtons = document.querySelectorAll("[data-download-chart]");

const DATE_FORMAT = "dd-LL-yyyy";
const grayNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-black-numixs')
const WATERMARK_SCALE_FACTOR = 0.85;

const [width, height] = (import.meta.env.CHART_EXPORT_SIZE || "1200x800").split("x");
const SIZE_EXPORT = {
    width,
    height,
}

const today = DateTime.now();

const getChartFilename = (type: string): string => {

    let filename = "";
    switch (type) {
        case "yearlyChart":
            filename = `visites-annuelle-${today.startOf("year").toFormat("dd/LL/yyyy")}-${today.endOf("year").toFormat("dd/LL/yyyy")}`
            break;
        case "weeklyChart":
            filename = `visites-hebdomadaire-du-${today.startOf("week").toFormat("dd/LL/yyyy")}-au-${today.endOf("week").toFormat("dd/LL/yyyy")}`
            break;
        case "monthlyChart":
            filename = `visites-mensuelle-du-${today.startOf("month").toFormat("dd/LL/yyyy")}-au-${today.endOf("month").toFormat("dd/LL/yyyy")}`
            break;
        case "dailyChart":
            filename = `visites-quotidienne-${today.toFormat(DATE_FORMAT)}`
            break;

        default:
            filename = `visites-detaillees`
            break;
    }

    return `${filename}_${String(Date.now()).slice(-6)}.jpg`
}

listDownloadButtons.forEach((item) => {
    item.addEventListener("click", async (e: MouseEvent) => {
        const element = e.currentTarget as HTMLButtonElement;
        const chartId = element.dataset.downloadChart!;

        const link = document.createElement("a");
        const chart = document.getElementById(chartId) as HTMLCanvasElement;
        chart.style.opacity = "0";
        const chartInstance = Chart.getChart(chart)!;
        const startDatalabelsSize = chartInstance.options.plugins.datalabels.font.size;
        const chartXTitleFontSize = chartInstance.config!.options.scales.x.title.font.size;
        const chartYTitleFontSize = chartInstance.config!.options!.scales!.y!.title!.font.size;
        const chartTitleFontSize = chartInstance.config.options.plugins.title.font.size;

        chartInstance.options.plugins!.totalVisitors.fontSize = "18px"
        chartInstance.config!.options!.scales!.x!.title!.font!.size = 20;
        chartInstance.config!.options!.scales!.y!.title!.font!.size = 20;
        chartInstance.config!.options!.plugins!.title!.font!.size = 32;

        // chartInstance.config.options.scales.x
        chartInstance.options!.plugins!.datalabels!.font!.size = 24;
        chartInstance.options.plugins!.tooltip!.enabled = false;
        chartInstance.resize(SIZE_EXPORT.width, SIZE_EXPORT.height);

        const download = () => {
            link.download = getChartFilename(chartId);
            link.href = chartClone.toDataURL("image/jpeg", 1);
            link.click();
        }

        const chartClone = chart.cloneNode(true) as HTMLCanvasElement;
        const cloneCtx = chartClone.getContext("2d");
        if (cloneCtx) {
            chartClone.width = chartClone.width + 75;
            chartClone.height = chartClone.height + 75;

            cloneCtx.drawImage(chart,
                (Math.abs(chart.width - chartClone.width)) / 2, 0,
                chart.width, chart.height
            );

            const watermark = new Image();
            watermark.src = '/images/watermark.svg';
            watermark.onload = function () {
                cloneCtx.drawImage(watermark, chartClone.width - watermark.width, chartClone.height - watermark.height, watermark.width * WATERMARK_SCALE_FACTOR, watermark.height * WATERMARK_SCALE_FACTOR);

                cloneCtx.font = "12px sans-serif";
                cloneCtx.fillStyle = "white";
                cloneCtx.fillText(`Généré le ${today.toFormat("dd/LL/yyyy à HH:mm")}`, 5, chartClone.height - 7);

                cloneCtx.fillStyle = grayNumixs;
                cloneCtx.globalCompositeOperation = 'destination-over';
                cloneCtx.fillRect(0, 0, chartClone.width, chartClone.height);
                download();

                chartInstance.options.plugins!.datalabels!.font!.size = startDatalabelsSize;
                chartInstance.config.options.scales.x.title.font.size = chartXTitleFontSize;
                chartInstance.config.options.scales.y.title.font.size = chartYTitleFontSize;
                chartInstance.config.options.plugins.title.font.size = chartTitleFontSize;

                chartInstance.options.plugins!.tooltip!.enabled = true;
                chartInstance.resize();
                chartInstance.update();
                chart.style.opacity = "1";
            }
        }
    });
});
