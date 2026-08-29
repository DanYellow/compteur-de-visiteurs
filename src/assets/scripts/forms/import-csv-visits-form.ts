import { VisitCsvSchema } from "#scripts/schemas/index";

const form = document.querySelector("[data-import-csv-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    const form = (e.currentTarget as HTMLFormElement);
    form.dataset.isDirty = "";

    const isFormValid = await validForm(e);
    if (!isFormValid) {
        return;
    }

    form.submit();
};

const validForm = async (e: Event) => {
    const form = (e.currentTarget as HTMLFormElement)
    if (!("isDirty" in form.dataset)) {
        return
    }

    const formData = new FormData(form);
    const validator = await VisitCsvSchema.safeParseAsync(Object.fromEntries(formData));

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
                const inputRelated = form.querySelector(`input[name="${String(path)}"], textarea[name="${String(path)}"], select[name="${String(path)}"]`);

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
