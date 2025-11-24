import { DateTime } from "luxon";
import type SpecialOpening from "#models/special-opening.ts";
import type { PlaceRaw } from "#types";

const modal = document.getElementById("detail-special-opening") as HTMLDialogElement;

const openingDateTime = modal.querySelector("time") as HTMLTimeElement;
const listPlacesContainer = modal.querySelector("ul") as HTMLUListElement;
// const visitNumber = modal.querySelector("[data-visit-number]") as HTMLSpanElement;
const name = modal.querySelector("[data-name]") as HTMLParagraphElement;

modal?.addEventListener("toggle", (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        listPlacesContainer.innerHTML = "";
        const sourceItem = toggleEvent.source! as HTMLButtonElement;
        const specialOpeningData = JSON.parse(sourceItem.dataset.specialOpeningData!) as SpecialOpening;

        name.textContent = specialOpeningData.nom;
        specialOpeningData.listPlaces.forEach((item:PlaceRaw) => {
            const li = document.createElement("li");
            li.textContent = item.nom;

            listPlacesContainer.append(li);
        })

        openingDateTime.dateTime = String(specialOpeningData.date);
        const [heure_ouverture_heure, heure_ouverture_minutes] = specialOpeningData.heure_ouverture.split(":");
        const [heure_fermeture_heure, heure_fermeture_minutes] = specialOpeningData.heure_fermeture.split(":");

        const date = DateTime.fromJSDate(new Date(specialOpeningData.date)).toFormat("dd/LL/yyyy", {locale: "fr"})

        openingDateTime.textContent = `${date} de ${heure_ouverture_heure}h${heure_ouverture_minutes} à ${heure_fermeture_heure}h${heure_fermeture_minutes}`
    }
})
