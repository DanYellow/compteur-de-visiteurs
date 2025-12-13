import { LoginSchema } from "#scripts/schemas.ts";

const form = document.querySelector("form") as HTMLFormElement;
const errorsContainer = document.querySelector(
    "[data-form-errors]"
) as HTMLUListElement;

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
    const validator = LoginSchema.safeParse(Object.fromEntries(formData));

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

const passkeyLoginButton = document.querySelector("[data-passkey-login]") as HTMLButtonElement;
passkeyLoginButton?.addEventListener("click", async () => {
    const publicKey = await fetch("/passkey/connexion-options", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const options = PublicKeyCredential.parseRequestOptionsFromJSON(
        await publicKey.json()
    );

    const credential = (await navigator.credentials.get({
        publicKey: options,
    })) as PublicKeyCredential;

    const serializedPublicKey = JSON.stringify(credential.toJSON());

    const response = await fetch("/passkey/connexion", {
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
});
