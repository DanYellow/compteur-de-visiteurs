import { NewMemberSchema } from "#scripts/schemas.ts";
import { listBusinessSector } from "#scripts/utils.ts"

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;
const formSuccessTplRaw = document.querySelector("[data-template-id='form-success']") as HTMLTemplateElement;
const formErrorTplRaw = document.querySelector("[data-template-id='form-error']") as HTMLTemplateElement;
const formResetEvent = new Event("formreset", { bubbles: true });

const listFormKeys = [
    "prenom",
    "nom",
    "numero_telephone",
    "email",
    "adresse",
    "ville",
    "code_postal",
    ...listBusinessSector.map((item) => item.value),
    "extra_infos",
    "reglement",
    "donnees_personnelles",
    "signature",
]

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    (e.currentTarget as HTMLFormElement).dataset.isDirty = "";

    if (!validForm(e)) {
        return;
    }
    dialog.showModal();
    const form = (e.currentTarget as HTMLFormElement);
    const formData = new FormData(form);

    listBusinessSector.forEach(({ value }) => {
        if (formData.has(value)) {
            formData.delete(value);
            formData.append(value, "oui")
        } else {
            formData.append(value, "non")
        }
    });

    const formDataComputed = new FormData();
    listFormKeys.forEach((key) => {
        if (formData.has(key)) {
            formDataComputed.append(key, formData.get(key) as string)
        } else {
            formDataComputed.append(key, "");
        }
    })

    formDataComputed.append("date_inscription", new Date(Date.now()).toISOString());

    const req = await fetch("/", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(Array.from(formDataComputed.entries()))),
    })
    const res = await req.json();
    const dialogSwapContainer = dialog.querySelector("[data-swap-content]") as HTMLDivElement;
    dialogSwapContainer.innerHTML = "";
    if (res.success) {
        dialogSwapContainer.append(formSuccessTplRaw.content.cloneNode(true))
        form.reset();
        document.dispatchEvent(formResetEvent);
    } else {
        dialogSwapContainer.append(formErrorTplRaw.content.cloneNode(true))
    }
};

const validForm = (e: Event) => {
    const form = (e.currentTarget as HTMLFormElement)
    if (!("isDirty" in form.dataset)) {
        return
    }

    const formData = new FormData(form);
    const validator = NewMemberSchema.safeParse(Object.fromEntries(formData));

    form.querySelectorAll(`input.error`).forEach((item) => {
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
                const inputRelated = form.querySelector(`input[name="${String(path)}"]`);

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
