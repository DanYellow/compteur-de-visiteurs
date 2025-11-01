import { DateTime } from "luxon";

const listDownloadButtons = document.querySelectorAll("[data-download-chart]");

const DATE_FORMAT = "dd-LL-yyyy";
const grayNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-black-numixs')
console.log(grayNumixs)
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
    item.addEventListener("click", (e: MouseEvent) => {
        const element = e.currentTarget as HTMLButtonElement;
        const chartId = element.dataset.downloadChart!;

        const link = document.createElement("a");
        const chart = document.getElementById(chartId) as HTMLCanvasElement;

        const chartClone = chart.cloneNode(true) as HTMLCanvasElement;
        const canvasCtx = chartClone.getContext("2d");
        if (canvasCtx) {
            canvasCtx.drawImage(chart, 0, 0);

            canvasCtx.fillStyle = grayNumixs;
            canvasCtx.globalCompositeOperation = 'destination-over';
            canvasCtx.fillRect(0, 0, chartClone.width, chartClone.height);
        }

        link.download = getChartFilename(chartId);
        link.href = chartClone.toDataURL("image/jpeg", 1);
        link.click();
    });
});
