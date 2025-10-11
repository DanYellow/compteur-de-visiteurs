import "../styles/main.css";
import "../styles/notification.css";
import "../styles/responsive-table.css";

import "./input-switch.ts";
import "./select-date.ts";

document.querySelectorAll("dialog").forEach((item) => {
    item.addEventListener("click", (e) => {
        if ("closeDialog" in (e.target! as HTMLElement).dataset) {
            (e.currentTarget! as HTMLDialogElement).close();
        }
    })
})
