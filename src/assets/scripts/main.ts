import "../styles/main.css";

document.querySelectorAll("dialog").forEach((item) => {
    item.addEventListener("click", (e) => {
        if ("closeDialog" in (e.target! as HTMLElement).dataset) {
            (e.currentTarget! as HTMLDialogElement).close();
        }
    })
})