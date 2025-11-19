import "../styles/main.css";
import "../styles/notification.css";
import "../styles/calendar.css";
import "choices.js/public/assets/styles/choices.css";

import "./select-place.ts";
import "./calendar.ts";
import "./members-poll.ts";

document.querySelectorAll("dialog").forEach((item) => {
    item.addEventListener("click", (e) => {
        if ("closeDialog" in (e.target! as HTMLElement).dataset) {
            (e.currentTarget! as HTMLDialogElement).close();
        }
    })
})
