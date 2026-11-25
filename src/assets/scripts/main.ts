import "#styles/main.css";
import "#styles/details.css";
import "#styles/notification.css";
import "#styles/calendar.css";

import "#scripts/dropdown-redirect";
import "#scripts/calendar";
import "#scripts/socket-client";
import "#scripts/dialogs/delete-list-item-dialog";

document.querySelectorAll("dialog").forEach((item) => {
    item.addEventListener("click", (e) => {
        if ("closeDialog" in (e.target! as HTMLElement).dataset) {
            (e.currentTarget! as HTMLDialogElement).close();
        }
    })
})
