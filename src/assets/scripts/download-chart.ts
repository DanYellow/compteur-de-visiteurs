import { DateTime } from "luxon";
import { Chart } from 'chart.js';
import { loadImage, slugify } from "./utils";

const listDownloadButtons = document.querySelectorAll("[data-download-chart]");
const placeData = JSON.parse((document.querySelector("[data-place]") as HTMLDivElement)?.dataset.place || "{}")

const grayNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-black-numixs')
const WATERMARK_SCALE_FACTOR = 0.85;

const CHART_SIZE = {
    width: 1900,
    height: 950,
}

const PADDING = {
    x: 10,
    y: 12,
}

const today = DateTime.now();

listDownloadButtons.forEach((item) => {
    (item as HTMLButtonElement).addEventListener("click", async (e: MouseEvent) => {
        const element = e.currentTarget as HTMLButtonElement;
        const chartId = element.dataset.downloadChart!;
        const chartData = JSON.parse(element.dataset.chartData || "{}");

        const link = document.createElement("a");
        const chart = document.getElementById(chartId) as HTMLCanvasElement;
        chart.style.opacity = "0";
        const chartInstance = Chart.getChart(chart)!;

        // Compute export canvas size
        const dialog = chart.closest("dialog");
        const table = dialog?.querySelector("table") as HTMLTableElement | null;

        const TOP_MARGIN = 20;
        const CHART_TABLE_GAP = 20;
        const BOTTOM_MARGIN = 40;
        const SIDE_PADDING = 40;

        const tableWidth = table ? table.offsetWidth : 0;
        const tableHeight = table ? table.offsetHeight : 0;

        const exportWidth = Math.max(
            CHART_SIZE.width + SIDE_PADDING * 2,
            tableWidth + SIDE_PADDING * 2
        );
        const exportHeight =
            TOP_MARGIN +
            CHART_SIZE.height +
            (table ? CHART_TABLE_GAP + tableHeight : 0) +
            BOTTOM_MARGIN;

        // Create offscreen canvas for chart only
        const offscreenChart = document.createElement("canvas");
        offscreenChart.width = CHART_SIZE.width;
        offscreenChart.height = CHART_SIZE.height;
        const offscreenCtx = offscreenChart.getContext("2d")!;

        // Clone config with TypeScript fix
        const baseConfig = chartInstance.config;

        const exportedChartConfig: any = {
            type: baseConfig.type,
            data: {
                ...baseConfig.data,
                datasets: baseConfig.data.datasets.map(ds => ({ ...ds })),
            },
            options: {
                ...baseConfig.options,
                responsive: false,
                maintainAspectRatio: false,
                animation: false as const,
            },
            plugins: baseConfig.plugins,
        };

        // Update font sizes for export
        exportedChartConfig.options.plugins.totalVisitors.fontSize = "18px";
        exportedChartConfig.options.scales.x.title.font.size = 20;
        exportedChartConfig.options.scales.y.title.font.size = 20;
        exportedChartConfig.options.plugins.title.font.size = 32;
        exportedChartConfig.options.plugins.subtitle.font.size = 16;

        exportedChartConfig.options.plugins.legend = {
            ...exportedChartConfig.options.plugins.legend,
            title: {
                ...exportedChartConfig.options.plugins.legend.title,
                font: {
                    ...exportedChartConfig.options.plugins.legend.title?.font,
                    size: 20
                }
            },
            labels: {
                ...exportedChartConfig.options.plugins.legend.labels,
                font: {
                    ...exportedChartConfig.options.plugins.legend.labels?.font,
                    size: 18
                }
            }
        }

        // Create offscreen chart
        const exportChart = new Chart(offscreenCtx, exportedChartConfig);

        // Force synchronous render
        exportChart.update();

        // Wait one frame to ensure render completes
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Create final export canvas
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = exportWidth;
        exportCanvas.height = exportHeight;
        const ctx = exportCanvas.getContext("2d")!;

        // Draw chart centered at top
        const chartX = (exportWidth - CHART_SIZE.width) / 2;
        const chartY = TOP_MARGIN;

        ctx.drawImage(
            offscreenChart,
            chartX,
            chartY,
            CHART_SIZE.width,
            CHART_SIZE.height
        );

        // Draw table if exists
        if (table) {
            const tableDetailsSVG = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${tableWidth}px" height="${tableHeight}px">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-family: Calibri, sans-serif;">
                            ${table.outerHTML}
                        </div>
                    </foreignObject>
                </svg>
            `;

            const svg = new Blob([tableDetailsSVG], { type: "image/svg+xml;charset=utf-8" });
            const url = window.URL.createObjectURL(svg);
            const tableImg = new Image();
            tableImg.src = url;
            await loadImage(tableImg);

            const tableX = (exportWidth - tableWidth) / 2;
            const tableY = chartY + CHART_SIZE.height + CHART_TABLE_GAP;
            ctx.drawImage(tableImg, tableX, tableY, tableWidth, tableHeight);

            window.URL.revokeObjectURL(url);
        }

        // Draw watermark
        const watermark = new Image();
        watermark.src = "/images/watermark.svg";
        await loadImage(watermark);

        ctx.drawImage(
            watermark,
            exportWidth - watermark.width * WATERMARK_SCALE_FACTOR - PADDING.x,
            exportHeight - watermark.height * WATERMARK_SCALE_FACTOR - PADDING.y - 12,
            watermark.width * WATERMARK_SCALE_FACTOR,
            watermark.height * WATERMARK_SCALE_FACTOR
        );

        // Draw footer text
        ctx.font = "12px Calibri";
        ctx.fillStyle = "white";
        ctx.fillText(
            `Généré le ${today.toFormat("dd/LL/yyyy à HH:mm")}`,
            PADDING.x,
            exportHeight - PADDING.y
        );

        const placeName = placeData.nom || chartData.nom || "Tous";
        ctx.fillText(
            placeName,
            exportWidth - (ctx.measureText(placeName).width + PADDING.x),
            exportHeight - PADDING.y
        );

        // Background
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = grayNumixs;
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // Export
        const filename = slugify(chartInstance.config!.options!.plugins!.title!.text as string);
        link.download = `${filename}_${String(Date.now()).slice(-6)}.jpg`;
        link.href = exportCanvas.toDataURL("image/jpeg", 1);
        link.click();

        // Cleanup
        exportChart.destroy();

        // Restore UI
        setTimeout(() => {
            chart.style.opacity = "1";
        }, 300);
    });
});
