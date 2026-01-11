import { GroupSchema, DepartmentSchema, AgeSchema, GenderSchema, VisitCodeSchema } from "#scripts/schemas/index.ts";
import type { ZodObject } from "zod";

import '#scripts/label-ripple-effect.ts';

import { cancellableSleep } from "#scripts/utils.ts";

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const mainErrorsContainer = document.getElementById("error-container") as HTMLUListElement;
const visiteCodeErrorsContainer = document.getElementById("error-visit-code-container") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;
const formSuccessTplRaw = document.querySelector("[data-template-id='form-success']") as HTMLTemplateElement;
const formErrorTplRaw = document.querySelector("[data-template-id='form-error']") as HTMLTemplateElement;
const formSubmittingTplRaw = document.querySelector("[data-template-id='form-submitting']") as HTMLTemplateElement;

const dialogVisitCodeExplanation = document.getElementById("visit-code-explanation") as HTMLDialogElement;
const dialogVisitCode = document.getElementById("visit-code") as HTMLDialogElement;
const dialogVisitCodeForm = dialogVisitCode?.querySelector("form") as HTMLFormElement;

const listAllStepValidationButtons = document.querySelectorAll("[data-button-step]") as NodeListOf<HTMLButtonElement>;

const wizard = document.getElementById('wizard-steps') as HTMLDivElement;
const listFormSteps = wizard.querySelectorAll('[data-step]');

let sleepController = new AbortController();

let currentStep = 0;
let currentStepName = "";

const FORM_RESULT_TIMEOUT = 10000;

const listStepsSchemas: Record<string, ZodObject> = {
    group: GroupSchema,
    gender: GenderSchema,
    department: DepartmentSchema,
    age: AgeSchema,
}

const resetSteps = () => {
    form.reset();
    currentStep = 0;
    listFormSteps[currentStep].classList.add("active");
    listFormSteps[currentStep].scrollIntoView({
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

        listFormSteps[0].scrollIntoView({
            behavior: 'instant',
            block: 'start'
        });
        const tplSuccess = formSuccessTplRaw.content.cloneNode(true) as HTMLDivElement;
        const placeName = tplSuccess.querySelector("[data-place]")! as HTMLSpanElement;
        const visitCode = tplSuccess.querySelector("[data-visit-code]")! as HTMLParagraphElement;
        const visitCodeExplanationBtn = tplSuccess.querySelector("[data-visit-code-info]")! as HTMLButtonElement;

        visitCodeExplanationBtn.dataset.visitCodeInfo = res.data.code;

        placeName.textContent = res.data.nom;
        visitCode.textContent = res.data.code;
        dialogSwapContainer.append(tplSuccess);
    } else {
        dialogSwapContainer.append(formErrorTplRaw.content.cloneNode(true));
    }

    try {
        await cancellableSleep(FORM_RESULT_TIMEOUT, sleepController.signal);
        dialog.close();
    } finally {
    }
};

const validForm = (form: HTMLFormElement, schema: ZodObject, errorsContainer: HTMLUListElement) => {
    if (!("isDirty" in form.dataset)) {
        return
    }

    const formData = new FormData(form);
    const validator = schema.safeParse(Object.fromEntries(formData));

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
form?.addEventListener("input", () => validForm(form, listStepsSchemas[currentStepName], mainErrorsContainer));

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

            if (!validForm(form, listStepsSchemas[currentStepName], mainErrorsContainer)) {
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


dialogVisitCodeExplanation?.addEventListener("toggle", async (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        const codeLabel = dialogVisitCodeExplanation.querySelector("[data-visit-code]");
        sleepController.abort();
        sleepController = new AbortController();
        if (codeLabel) {
            codeLabel.textContent = (e.source as HTMLButtonElement).dataset.visitCodeInfo!;
        }
    } else {
        await cancellableSleep(FORM_RESULT_TIMEOUT, sleepController.signal);
        dialog.close();
    }
})

dialogVisitCodeForm?.addEventListener("input", (e: Event) => validForm(
    (e.currentTarget as HTMLFormElement),
    VisitCodeSchema,
    visiteCodeErrorsContainer
));
dialogVisitCodeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    dialogVisitCodeForm.dataset.isDirty = "";

    const formData = new FormData(dialogVisitCodeForm);

    const isFormValid = validForm(dialogVisitCodeForm, VisitCodeSchema, visiteCodeErrorsContainer);
    if (!isFormValid) {
        return;
    }

    const code = formData.get("code");

    const req = await fetch(`/api/visite/${code}`);
    const payload = await req.json();

    if (req.status === 404) {
        const li = document.createElement('li');
        li.textContent = `Le code "${code}" n'est associé à aucune visite`;

        visiteCodeErrorsContainer.appendChild(li);

        return;
    }

    dialogVisitCodeForm.removeAttribute('data-is-dirty');
    dialogVisitCode.close()
    dialogVisitCodeForm.reset();
    form.reset();

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

    currentStep = 0;
    listFormSteps[0].classList.add("active");
    listFormSteps[currentStep].scrollIntoView({
        behavior: 'instant',
        block: 'start'
    });
})
