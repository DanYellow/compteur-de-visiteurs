import { DateTime } from "luxon";
import { listGroups as listBusinessSector } from './utils.shared';

const modal = document.getElementById("detail-visit") as HTMLDialogElement;

const visitTime = modal.querySelector("time") as HTMLTimeElement;
const visitGroupContainer = modal.querySelector("ul") as HTMLUListElement;
const visitNumber = modal.querySelector("[data-visit-number]") as HTMLSpanElement;
const visitEvents = modal.querySelector("[data-visit-events]") as HTMLSpanElement;
const placeName = modal.querySelector("[data-place-name]") as HTMLSpanElement;

modal?.addEventListener("toggle", (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        visitGroupContainer.innerHTML = "";
        const sourceItem = toggleEvent.source! as HTMLButtonElement;
        const visitData = JSON.parse(sourceItem.dataset.visitData!);

        const listKeysBusiness = listBusinessSector.map((item) => item.value)
        const listBusinessSectorSelected = Object.entries(visitData).filter(([key, value]) => value === "oui" && listKeysBusiness.includes(key));

        Object.entries(Object.fromEntries(listBusinessSectorSelected)).forEach(([key]) => {
            const li = document.createElement("li");
            const groupData = listBusinessSector.find((item) => item.value === key);
            li.textContent = `${groupData?.name || ""} ${groupData?.fullName || ""}`;

            visitGroupContainer.append(li);
        })
        visitNumber.textContent = String(visitData.order);
        visitTime.dateTime = visitData.date_passage;
        visitTime.textContent = DateTime.fromJSDate(new Date(visitData.date_passage)).toFormat("EEEE dd LLLL yyyy à HH:mm:ss", {locale: "fr"});

        placeName.textContent = visitData["place.nom"];
        visitEvents.textContent = visitData["liste_evenements"];
    }
})
