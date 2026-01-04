import { GroupSchema, DepartmentSchema, AgeSchema, GenderSchema } from "#scripts/schemas/index.ts";
import type { ZodObject } from "zod";

import '#scripts/label-ripple-effect.ts';

import { cancellableSleep } from "./utils";

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;
const formSuccessTplRaw = document.querySelector("[data-template-id='form-success']") as HTMLTemplateElement;
const formErrorTplRaw = document.querySelector("[data-template-id='form-error']") as HTMLTemplateElement;
const formSubmittingTplRaw = document.querySelector("[data-template-id='form-submitting']") as HTMLTemplateElement;

const listAllStepValidationButtons = document.querySelectorAll("[data-button-step]") as NodeListOf<HTMLButtonElement>;

const wizard = document.getElementById('wizard-steps') as HTMLDivElement;
const listFormSteps = wizard.querySelectorAll('[data-step]');

let sleepController = new AbortController();

let currentStep = 0;
let currentStepName = "";

const listStepsSchemas: Record<string, ZodObject> = {
    group: GroupSchema,
    gender: GenderSchema,
    department: DepartmentSchema,
    age: AgeSchema,
}

const resetSteps = () => {
    form.reset();
    currentStep = 0;
    listFormSteps[0].classList.add("active");

    listFormSteps[0].scrollIntoView({
        behavior: 'instant',
        block: 'start'
    });
}

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    const form = (e.currentTarget as HTMLFormElement);
    form.dataset.isDirty = "";

    dialog.showModal();
    const dialogSwapContainer = dialog.querySelector("[data-swap-content]") as HTMLDivElement;
    dialogSwapContainer.innerHTML = "";
    dialogSwapContainer.append(formSubmittingTplRaw.content.cloneNode(true));

    const formData = new FormData(form);

    const req = await fetch("/", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(Array.from(formData.entries()))),
    });

    const res = await req.json();

    dialogSwapContainer.innerHTML = "";

    if (res.success) {
        e.submitter?.blur();
        resetSteps();
        const tplSuccess = formSuccessTplRaw.content.cloneNode(true) as HTMLDivElement;
        const placeName = tplSuccess.querySelector("[data-place]")! as HTMLSpanElement;

        placeName.textContent = res.data.nom;
        dialogSwapContainer.append(tplSuccess);
    } else {
        dialogSwapContainer.append(formErrorTplRaw.content.cloneNode(true));
    }

    try {
        // await cancellableSleep(Number(import.meta.env.FORM_RESULT_TIMEOUT), sleepController.signal);
        // dialog.close();
    } finally {
    }
};

const validForm = (form: HTMLFormElement) => {
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
                const listInputRelated = form.querySelectorAll(`input[name="${String(path)}"]`);

                if (listInputRelated.length) {
                    listInputRelated.forEach((input) => {
                        input.classList.add("error");
                        input.ariaInvalid = "true";
                    })
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

const updateWizardHeight = () => {
    let maxHeight = 0;

    listFormSteps.forEach(step => {
        maxHeight = Math.max(maxHeight, (step as HTMLDivElement).offsetHeight);
    });

    wizard.style.height = maxHeight + 'px';
}

// Initial calculation
updateWizardHeight();

const resizeObserver = new ResizeObserver(() => {
    updateWizardHeight();
});

listFormSteps.forEach(step => {
    resizeObserver.observe(step);
});

listFormSteps[0].classList.add("active");

listAllStepValidationButtons.forEach((item: HTMLButtonElement) => {
    item.addEventListener("click", () => {
        const stepDirection = item.dataset.buttonStep as "prev" | "next";

        if (stepDirection === "prev") {

        } else {
            currentStepName = item.dataset.stepName!;
            const form = (item.form as HTMLFormElement);

            form.dataset.isDirty = "";

            if (!validForm(form)) {
                return;
            }
        }

        // const index = Array.from(containerSteps.children).indexOf(item.closest("[data-step]")!);

        listFormSteps[currentStep].classList.remove("active");
        currentStep += stepDirection === "prev" ? -1 : 1;

        if (listFormSteps[currentStep]) {
            listFormSteps[currentStep].classList.add("active");

            listFormSteps[currentStep].scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            form.requestSubmit();
        }
    })
})

window.addEventListener("pageshow", () => {
    resetSteps();
});

const req = await fetch("/api/visite/M74"); // QKC CHW
const payload = await req.json();

Object.entries(payload.contenu as Record<string, any>).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (!field) return;

    if (field instanceof HTMLInputElement) {
        switch (field.type) {
            case "checkbox":
                field.checked = value === true || value === "oui" || value === "on";
                break;

            case "radio":
                field.checked = field.value === value;
                break;

            default:
                field.value = value;
        }

        return;
    }

    if (field instanceof RadioNodeList) {
        field.value = value;

        return;
    }
});
