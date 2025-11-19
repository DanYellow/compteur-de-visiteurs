import { DateTime } from "luxon";
import { Chart } from 'chart.js';
import { loadImage, slugify } from "./utils";

const listDownloadButtons = document.querySelectorAll("[data-download-chart]");
const placeData = JSON.parse(document.querySelector("[data-place]")?.dataset.place || "{}")

const grayNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-black-numixs')
const WATERMARK_SCALE_FACTOR = 0.85;

const [width, height] = (import.meta.env.CHART_EXPORT_SIZE || "1200x800").split("x");
const SIZE_EXPORT = {
    width,
    height,
}

const today = DateTime.now();


listDownloadButtons.forEach((item) => {
    (item as HTMLButtonElement).addEventListener("click", async (e: MouseEvent) => {
        const element = e.currentTarget as HTMLButtonElement;
        const chartId = element.dataset.downloadChart!;

        const link = document.createElement("a");
        const chart = document.getElementById(chartId) as HTMLCanvasElement;
        chart.style.opacity = "0";
        const chartInstance = Chart.getChart(chart)!;

        const originalSize = { width: chart.style.width, height: chart.style.height };
        const startDatalabelsSize = (chartInstance.options!.plugins!.datalabels!.font! as any).size;
        const chartXTitleFontSize = (chartInstance.config!.options!.scales!.x! as any).title!.font.size;
        const chartYTitleFontSize = (chartInstance.config!.options!.scales!.y! as any).title!.font.size;
        const chartTitleFontSize = (chartInstance.config!.options!.plugins!.title!.font! as any).size!;

        const chartScaleOptions = chartInstance!.config!.options!.scales!;

        chartInstance.options.plugins!.totalVisitors!.fontSize = "18px";
        (chartScaleOptions.x! as any).title!.font!.size = 20;
        (chartScaleOptions.y! as any).title!.font!.size = 20;
        (chartInstance.config!.options!.plugins!.title!.font! as any).size = 32;

        // (chartInstance.options!.plugins!.datalabels!.font! as any).size = 24;
        // chartInstance.options!.plugins!.datalabels!.backgroundColor = grayNumixs;
        chartInstance.options.plugins!.tooltip!.enabled = false;
        chartInstance.resize(SIZE_EXPORT.width, SIZE_EXPORT.height);

        const download = () => {
            const filename = slugify(chartInstance.config!.options!.plugins!.title!.text as string)

            link.download =  `${filename}_${String(Date.now()).slice(-6)}.jpg`;
            link.href = chartClone.toDataURL("image/jpeg", 1);
            link.click();
        }

        const chartClone = chart.cloneNode(true) as HTMLCanvasElement;
        const cloneCtx = chartClone.getContext("2d");
        if (cloneCtx) {
            chartClone.width = chartClone.width + 75;
            const table = chart.closest("dialog")?.querySelector("table");
            chartClone.height = chartClone.height + 75;
            if (table) {
                chartClone.height += table.offsetHeight;
            }

            cloneCtx.drawImage(chart,
                (Math.abs(chart.width - chartClone.width)) / 2, 0,
                chart.width, chart.height
            );

            const watermark = new Image();
            watermark.src = '/images/watermark.svg';
            await loadImage(watermark);

            cloneCtx.drawImage(watermark, chartClone.width - watermark.width, chartClone.height - watermark.height - 12, watermark.width * WATERMARK_SCALE_FACTOR, watermark.height * WATERMARK_SCALE_FACTOR);
            cloneCtx.font = "12px Calibri";
            cloneCtx.fillStyle = "white";
            cloneCtx.fillText(`Généré le ${today.toFormat("dd/LL/yyyy à HH:mm")}`, 12, chartClone.height - 7);

            const placeName = placeData.nom || "Tous"
            cloneCtx.fillText(placeName, chartClone.width - (cloneCtx.measureText(placeName).width + 12), chartClone.height - 7);

            if (chart.closest("dialog")) {
                const table = chart.closest("dialog")?.querySelector("table");
                const tableDetailsSVG = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${chart.width}px" height="${chart?.offsetHeight}">
                        <foreignObject width="100%" height="100%">
                            <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-family: Calibri, sans-serif;">
                                ${table?.outerHTML}
                            </div>
                        </foreignObject>
                    </svg>
                `;

                const tableDetailsImg = new Image();
                const svg = new Blob([tableDetailsSVG], { type: 'image/svg+xml;charset=utf-8' });
                const url = window.URL.createObjectURL(svg);
                tableDetailsImg.src = url;
                await loadImage(tableDetailsImg);

                cloneCtx.drawImage(tableDetailsImg, chartClone.width - tableDetailsImg.width, chart.height + 10);
                window.URL.revokeObjectURL(url);
            }

            // Background
            cloneCtx.fillStyle = grayNumixs;
            cloneCtx.globalCompositeOperation = 'destination-over';
            cloneCtx.fillRect(0, 0, chartClone.width, chartClone.height);

            download();

            (chartInstance.options.plugins!.datalabels!.font! as any).size = startDatalabelsSize;
            chartInstance.options!.plugins!.datalabels!.backgroundColor = "";

            (chartInstance.config!.options!.scales!.x! as any).title!.font.size = chartXTitleFontSize;
            (chartInstance.config!.options!.scales!.y! as any).title.font.size = chartYTitleFontSize;
            (chartInstance.config!.options!.plugins!.title!.font! as any).size = chartTitleFontSize;
            chartInstance.options.plugins!.totalVisitors!.fontSize = "14px";

            chartInstance.options.plugins!.tooltip!.enabled = true;
            chartInstance.resize();
            chartInstance.update();
            chartInstance.reset();

            setTimeout(() => {
                chart.style.width = originalSize.width;
                chart.style.height = originalSize.height;
                chart.style.opacity = "1";
            }, 300)
        }
    });
});
