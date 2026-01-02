import { VisitorSchema } from "#scripts/schemas.ts";
import { VisitSchema, DepartmentSchema, AgeSchema, GenderSchema } from "#scripts/schemas/index.ts";
import type { ZodObject } from "zod";

import { cancellableSleep } from "./utils";

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;
const formSuccessTplRaw = document.querySelector("[data-template-id='form-success']") as HTMLTemplateElement;
const formErrorTplRaw = document.querySelector("[data-template-id='form-error']") as HTMLTemplateElement;
const formSubmittingTplRaw = document.querySelector("[data-template-id='form-submitting']") as HTMLTemplateElement;

const listAllStepValidationButtons = document.querySelectorAll("[data-button-step]") as NodeListOf<HTMLButtonElement>;

const wizard = document.getElementById('wizard-steps') as HTMLDivElement;
const containerSteps = document.getElementById('steps-container') as HTMLDivElement;
const listFormSteps = wizard.querySelectorAll('[data-step]');

let sleepController = new AbortController();


let currentStep = 0;
let currentStepName = "";

const listStepsSchemas: Record<string, ZodObject> = {
    group: VisitSchema,
    gender: GenderSchema,
    department: DepartmentSchema,
    age: AgeSchema,
}

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    // const form = (e.currentTarget as HTMLFormElement);
    // form.dataset.isDirty = "";

    // if (!validForm(e)) {
    //     return;
    // }

    // dialog.showModal();
    // const dialogSwapContainer = dialog.querySelector("[data-swap-content]") as HTMLDivElement;
    // dialogSwapContainer.innerHTML = "";
    // dialogSwapContainer.append(formSubmittingTplRaw.content.cloneNode(true));

    // const formData = new FormData(form);

    // const req = await fetch("/", {
    //     method: "POST",
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(Object.fromEntries(Array.from(formData.entries()))),
    // });

    // const res = await req.json();

    // dialogSwapContainer.innerHTML = "";

    // if (res.success) {
    //     e.submitter?.blur();
    //     form.reset();
    //     const tplSuccess = formSuccessTplRaw.content.cloneNode(true) as HTMLDivElement;
    //     const placeName = tplSuccess.querySelector("[data-place]")! as HTMLSpanElement;

    //     placeName.textContent = res.data.nom;
    //     dialogSwapContainer.append(tplSuccess);
    // } else {
    //     dialogSwapContainer.append(formErrorTplRaw.content.cloneNode(true));
    // }

    // try {
    //     await cancellableSleep(Number(import.meta.env.FORM_RESULT_TIMEOUT), sleepController.signal);
    //     dialog.close();
    // } finally {
    // }
};

const validForm = (form: HTMLFormElement) => {
    // const form = (e.currentTarget as HTMLFormElement)
    if (!("isDirty" in form.dataset)) {
        return
    }

    const formData = new FormData(form);
    const validator = listStepsSchemas[currentStepName].safeParse(Object.fromEntries(formData));

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

        errorsContainer.scrollIntoView({ behavior: "auto" });
        // if (e.type === "submit") {
        //     errorsContainer.scrollIntoView({ behavior: "auto" });
        // }

        return false;
    }

    return true;
}

dialog.addEventListener("toggle", (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (!isOpened && !sleepController.signal.aborted) {
        form.removeAttribute('data-is-dirty');
        sleepController.abort();
        sleepController = new AbortController();
    }
})

form?.addEventListener("submit", submitForm);
form?.addEventListener("input", () => validForm(form));

function updateWizardHeight() {
    let maxHeight = 0;

    listFormSteps.forEach(step => {
        maxHeight = Math.max(maxHeight, step.offsetHeight);
    });

    wizard.style.height = maxHeight + 'px';
}

// Initial calculation
updateWizardHeight();

listFormSteps[0].classList.add("active");

listAllStepValidationButtons.forEach((item: HTMLButtonElement) => {
    item.addEventListener("click", (e: Event) => {
        currentStepName = item.dataset.stepName!;
        const form = (item.form as HTMLFormElement);

        form.dataset.isDirty = "";

        if (!validForm(form)) {
            return;
        }
        // const index = Array.from(containerSteps.children).indexOf(item.closest("[data-step]")!);

        listFormSteps[currentStep].classList.remove("active");
        currentStep += 1;
        listFormSteps[currentStep].classList.add("active");

        listFormSteps[currentStep].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    })
})
