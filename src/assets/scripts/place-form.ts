import "choices.js/public/assets/styles/choices.css";
import Choices from "choices.js";

import { PlaceSchema } from "#scripts/schemas.ts";

const form = document.querySelector("[data-place-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dropdownDays = document.getElementById("jours") as HTMLSelectElement;

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    const form = (e.currentTarget as HTMLFormElement);
    form.dataset.isDirty = "";

    if (!validForm(e)) {
        return;
    }

    form.submit();
};

const validForm = (e: Event) => {
    const form = (e.currentTarget as HTMLFormElement)
    if (!("isDirty" in form.dataset)) {
        return
    }

    const formData = new FormData(form);
    formData.set("jours_fermeture", JSON.stringify(formData.getAll("jours_fermeture")));

    const validator = PlaceSchema.safeParse(Object.fromEntries(formData));

    form.querySelectorAll(".error").forEach((item) => {
        item.classList.remove("error");
        item.removeAttribute("aria-invalid");
        item.removeAttribute("aria-errormessage");
    })

    errorsContainer.innerHTML = "";

    if (!validator.success) {
        validator.error.issues.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item.message;
            item.path.forEach((path) => {
                const inputRelated = form.querySelector(`input[name="${String(path)}"], textarea[name="${String(path)}"]`);

                if (inputRelated) {
                    inputRelated.classList.add("error");
                    inputRelated.ariaInvalid = "true";
                }
            })

            errorsContainer.appendChild(li);
        })

        if (e.type === "submit") {
            errorsContainer.scrollIntoView({ behavior: "auto" });
        }

        return false;
    }

    return true;
}

form?.addEventListener("submit", submitForm);
form?.addEventListener("input", validForm);

new Choices(dropdownDays, {
    addItems: false,
    paste: false,
    removeItemButton: true,
    itemSelectText: 'Cliquer pour sélectionner',
    noChoicesText: 'Plus de propositions',
    maxItemCount: 6,
    maxItemText: 'Un jour ouvrable est impératif',
    noResultsText: 'Pas de résultat trouvé',
    sorter: function (a, b) {
        return Number(a.value) - Number(b.value);
    },
});
