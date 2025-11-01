const listDownloadButtons = document.querySelectorAll("[data-download-chart]");

listDownloadButtons.forEach((item) => {
    item.addEventListener("click", (e: MouseEvent) => {
        const element = e.currentTarget as HTMLButtonElement;
        const chartId = element.dataset.downloadChart!;

        const link = document.createElement("a");
        const chart = document.getElementById(chartId) as HTMLCanvasElement;
        link.download = "test.png";
        link.href = chart.toDataURL("image/jpeg", 1);
        link.click();
    });
});
