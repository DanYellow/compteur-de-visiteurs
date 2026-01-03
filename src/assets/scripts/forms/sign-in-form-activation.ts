import { SignInActivationSchema } from "#scripts/schemas/index.ts";
import {
    getPasskeyOptions,
    createPasskey,
    togglePasskeysVisibility,
} from "#scripts/passkey-manager.ts";

togglePasskeysVisibility();

const form = document.querySelector("form") as HTMLFormElement;
const errorsContainer = document.querySelector(
    "[data-form-errors]"
) as HTMLUListElement;

const errorEmailDialog = document.getElementById("error-email")! as HTMLDialogElement;

const createPasskeyBtn = document.querySelector(
    "[data-passkey-register]"
) as HTMLButtonElement;
const emailInput = document.querySelector('[name="email"]') as HTMLInputElement;

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    form.dataset.isDirty = "";

    if (!validForm(e)) {
        return;
    }

    form.submit();
};

const validForm = (e: Event) => {
    const form = e.currentTarget as HTMLFormElement;
    if (!("isDirty" in form.dataset)) {
        return;
    }

    const formData = new FormData(form);
    const validator = SignInActivationSchema.safeParse(
        Object.fromEntries(formData)
    );

    form.querySelectorAll("input.error").forEach((item) => {
        item.classList.remove("error");
        item.removeAttribute("aria-invalid");
        item.removeAttribute("aria-errormessage");
    });

    errorsContainer.innerHTML = "";

    if (!validator.success) {
        validator.error.issues.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item.message;

            item.path.forEach((path) => {
                const inputRelated = form.querySelector(
                    `input[name="${String(path)}"]`
                );

                if (inputRelated) {
                    inputRelated.classList.add("error");
                    inputRelated.ariaInvalid = "true";
                }
            });

            errorsContainer.appendChild(li);
        });

        if (e.type === "submit") {
            errorsContainer.scrollIntoView({ behavior: "auto" });
        }

        return false;
    }

    return true;
};

form?.addEventListener("submit", submitForm);
form?.addEventListener("input", validForm);

emailInput.addEventListener("input", (e) => {
    const input = e.currentTarget as HTMLInputElement;
    const validator = SignInActivationSchema.pick({ email: true }).safeParse({
        email: input.value,
    });

    if (createPasskeyBtn) {
        createPasskeyBtn.inert = !validator.success;
    }
});

createPasskeyBtn?.addEventListener("click", async () => {
    const email = emailInput.value;

    if (email) {
        const serializedPublicKey = await getPasskeyOptions(email);
        const passkey = await createPasskey(serializedPublicKey);

        if (passkey.redirected) {
            window.location.href = passkey.url;
        } else {
            alert("Une erreur est survenue");
        }
    } else {
        errorEmailDialog.showModal();
    }
})
