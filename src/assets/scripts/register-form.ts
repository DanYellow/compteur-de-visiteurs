import { VisitorSchema } from "#scripts/schemas.ts";
import { cancellableSleep } from "./utils";

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;
const formSuccessTplRaw = document.querySelector("[data-template-id='form-success']") as HTMLTemplateElement;
const formErrorTplRaw = document.querySelector("[data-template-id='form-error']") as HTMLTemplateElement;
const formSubmittingTplRaw = document.querySelector("[data-template-id='form-submitting']") as HTMLTemplateElement;

let sleepController = new AbortController();

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    (e.currentTarget as HTMLFormElement).dataset.isDirty = "";

    if (!validForm(e)) {
        return;
    }

    dialog.showModal();
    const dialogSwapContainer = dialog.querySelector("[data-swap-content]") as HTMLDivElement;
    dialogSwapContainer.innerHTML = "";
    dialogSwapContainer.append(formSubmittingTplRaw.content.cloneNode(true));

    const form = (e.currentTarget as HTMLFormElement);
    const formData = new FormData(form);

    console.log(formData);

    // const req = await fetch("/", {
    //     method: "POST",
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(Object.fromEntries(Array.from(formData.entries()))),
    // });

    // const res = await req.json();

    dialogSwapContainer.innerHTML = "";

    if (true) { // res.success
        form.reset();
        dialogSwapContainer.append(formSuccessTplRaw.content.cloneNode(true));
    } else {
        dialogSwapContainer.append(formErrorTplRaw.content.cloneNode(true));
    }

    try {
        await cancellableSleep(3500, sleepController.signal);
        dialog.close();
    } finally {
    }
    // await new Promise(r => setTimeout(r, Number(import.meta.env.FORM_RESULT_TIMEOUT || 5000)));

    // setTimeout(() => {
    //     dialog.close();
    // }, Number(import.meta.env.FORM_RESULT_TIMEOUT || 5000));
};

const validForm = (e: Event) => {
    const form = (e.currentTarget as HTMLFormElement)
    if (!("isDirty" in form.dataset)) {
        return
    }

    const formData = new FormData(form);
    const validator = VisitorSchema.safeParse(Object.fromEntries(formData));

    form.querySelectorAll("input.error").forEach((item) => {
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

dialog.addEventListener("toggle", (e) => {
    const isOpened = e.newState === "open";

    if (!isOpened && !sleepController.signal.aborted) {
        sleepController.abort();
        sleepController = new AbortController();
    }
})

form?.addEventListener("submit", submitForm);
form?.addEventListener("input", validForm);
