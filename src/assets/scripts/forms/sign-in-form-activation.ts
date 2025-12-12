import { SignInActivationSchema } from "#scripts/schemas.ts";

const form = document.querySelector("form") as HTMLFormElement;
const errorsContainer = document.querySelector(
    "[data-form-errors]"
) as HTMLUListElement;
const passkeyItems = document.querySelectorAll(
    "[data-passkey-toggle]"
) as NodeListOf<HTMLElement>;
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

Promise.all([
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
    PublicKeyCredential.isConditionalMediationAvailable(),
]).then((results) => {
    if (results.some((r) => r === false)) {
        Array.from(passkeyItems).forEach(async (item) => {
            // (item.parentNode as HTMLElement)!.classList.replace("md:grid-cols-[1fr_auto_1fr]", "md:grid-cols-1");
            // item.remove();
        });
    }
});

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
    const publicKey = await fetch("/passkey/enregistrement", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailInput.value }),
    });

    const options = PublicKeyCredential.parseCreationOptionsFromJSON(
        await publicKey.json()
    );

    const credential = (await navigator.credentials.create({
        publicKey: options,
    })) as PublicKeyCredential;

    const serializedPublicKey = JSON.stringify(credential.toJSON());

    const response = await fetch("/passkey/retour", {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        body: serializedPublicKey,
    });

    if (response.redirected) {
        window.location.href = response.url;
    } else {
        alert("Une erreur est survenue")
    }

    // console.log(response);
});
