import { fido2Get, fido2Create } from '@ownid/webauthn';

import { SignInActivationSchema } from "#scripts/schemas.ts";

const form = document.querySelector("form") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const passkeyItems = document.querySelectorAll("[data-passkey-toggle]") as NodeListOf<HTMLElement>

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
    const validator = SignInActivationSchema.safeParse(Object.fromEntries(formData));

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

form?.addEventListener("submit", submitForm);
form?.addEventListener("input", validForm);

Array.from(passkeyItems).forEach(async (item) => {
    if (!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) {
        // (item.parentNode as HTMLElement)!.classList.replace("md:grid-cols-[1fr_auto_1fr]", "md:grid-cols-1");
        // item.remove();
    }
})

document.querySelector("[data-passkey-register]")?.addEventListener("click", async () => {
    const publicKey = await fetch('/passkey/start', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: "ddd" })
    })

    const fidoData = await fido2Create(await publicKey.json(), "ddd");
    console.log("publicKey", fidoData)

    const response = await fetch('/passkey/finish', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fidoData)
    })

    console.log(response);
})
