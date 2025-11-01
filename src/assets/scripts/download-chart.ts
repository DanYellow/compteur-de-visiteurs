import { DateTime } from "luxon";

const listDownloadButtons = document.querySelectorAll("[data-download-chart]");

const DATE_FORMAT = "dd-LL-yyyy";
const grayNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-black-numixs')
const SCALE_FACTOR = 1;
const LOGO_SCALE_FACTOR = 0.65;

const getChartFilename = (type: string): string => {
    const today = DateTime.now();

    let filename = "";
    switch (type) {
        case "yearlyChart":
            filename = `visites-annuelles-${today.startOf("year").toFormat("dd/LL/yyyy")}-${today.endOf("year").toFormat("dd/LL/yyyy")}`
            break;
        case "weeklyChart":

            break;
        case "dailyChart":
            filename = `visites-quotidienne-${today.toFormat(DATE_FORMAT)}`
            break;

        default:
            filename = `visites-quotidienne-${today.toFormat(DATE_FORMAT)}`
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

        const chartClone = chart.cloneNode(true) as HTMLCanvasElement;
        const cloneCtx = chartClone.getContext("2d");
        if (cloneCtx) {
            chartClone.width = chart.width * SCALE_FACTOR + 50;
            chartClone.height = chart.height * SCALE_FACTOR + 50;

            cloneCtx.drawImage(chart,
                (chartClone.width - chart.width) / 2, 0,
                chart.width * SCALE_FACTOR, chart.height * SCALE_FACTOR
            );

            // cloneCtx.fillStyle = grayNumixs;
            // cloneCtx.globalCompositeOperation = 'destination-over';
            // cloneCtx.fillRect(0, 0, chartClone.width * SCALE_FACTOR, chartClone.height * SCALE_FACTOR);

            const img = new Image();
            img.src = '/images/faclab-logo-light.svg';
            img.onload = function () {
                cloneCtx.drawImage(img, chartClone.width - img.width, chartClone.height - img.height, img.width * LOGO_SCALE_FACTOR, img.height * LOGO_SCALE_FACTOR);

                cloneCtx.fillStyle = grayNumixs;
                cloneCtx.globalCompositeOperation = 'destination-over';
                cloneCtx.fillRect(0, 0, chartClone.width * SCALE_FACTOR, (chartClone.height * SCALE_FACTOR));
                download();
            }
        }

        function download() {
            link.download = getChartFilename(chartId);
            link.href = chartClone.toDataURL("image/jpeg", 1);
            link.click();
        }
    });
});
