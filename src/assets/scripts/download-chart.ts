import { DateTime } from "luxon";

const listDownloadButtons = document.querySelectorAll("[data-download-chart]");

const DATE_FORMAT = "dd-LL-yyyy";
const grayNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-black-numixs')
const SCALE_FACTOR = 1;
const LOGO_SCALE_FACTOR = 0.65;

const today = DateTime.now();

const getChartFilename = (type: string): string => {

    let filename = "";
    switch (type) {
        case "yearlyChart":
            filename = `visites-annuelles-${today.startOf("year").toFormat("dd/LL/yyyy")}-${today.endOf("year").toFormat("dd/LL/yyyy")}`
            break;
        case "weeklyChart":

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

        const chartClone = chart.cloneNode(true) as HTMLCanvasElement;
        const cloneCtx = chartClone.getContext("2d");
        if (cloneCtx) {

cloneCtx.imageSmoothingEnabled = false;
            chartClone.width = (chart.width * SCALE_FACTOR) + 50;
            chartClone.height = (chart.height * SCALE_FACTOR) + 50;

            cloneCtx.drawImage(chart,
                (Math.abs(chart.width - chartClone.width)) / 2, 0,
                (chart.width * SCALE_FACTOR), (chart.height * SCALE_FACTOR)
            );

            const logo = new Image();
            logo.src = '/images/faclab-logo-light.svg';
            logo.onload = function () {
                cloneCtx.drawImage(logo, chartClone.width - logo.width, chartClone.height - logo.height, logo.width * LOGO_SCALE_FACTOR, logo.height * LOGO_SCALE_FACTOR);

                cloneCtx.font = "12px sans-serif";
                cloneCtx.fillStyle = "white";
                cloneCtx.fillText(`Généré le ${today.toFormat("dd/LL/yyyy à HH:mm")}`, 5, chartClone.height - 7);

                cloneCtx.fillStyle = grayNumixs;
                cloneCtx.globalCompositeOperation = 'destination-over';
                cloneCtx.fillRect(0, 0, chartClone.width * SCALE_FACTOR, (chartClone.height * SCALE_FACTOR));

                download();
            }
        }

        const download = () => {
            link.download = getChartFilename(chartId);
            link.href = chartClone.toDataURL("image/jpeg", 1);
            link.click();
        }
    });
});
