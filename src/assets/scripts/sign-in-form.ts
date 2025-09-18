import * as z from "zod";

import { listBusinessSector } from "#scripts/utils.ts"

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;
const formSuccessTplRaw = document.querySelector("[data-template-id='form-success'") as HTMLTemplateElement;

const PHONE_NUMBER_REGEX = /(\d{2}\s?){5}|\d{2}\+\s?\d{1}\s?(\d{2}\s?){3}/;
const ZIP_CODE_REGEX = /^\d{4,5}$/;

type BusinessSectorPayload = {
    habitant?: string;
    faclab?: string;
    association?: string;
    entrepreneur?: string;
    artisan_artiste?: string;
    collectivite?: string;
    education?: string;
}

type BusinessSectorSchema = {
    habitant?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    faclab?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    association?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    entrepreneur?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    artisan_artiste?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    collectivite?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    education?: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}

const hasSelectedABusinessSector = (data: BusinessSectorPayload) => {
    return (
        "habitant" in data ||
        "association" in data ||
        "faclab" in data ||
        "entrepreneur" in data ||
        "artisan_artiste" in data ||
        "collectivite" in data ||
        "collectivite" in data ||
        "education" in data
    )
}

const listBusinessSectorValidator: BusinessSectorSchema = listBusinessSector.map(({ value }) => ({ [value]: z.string().optional().or(z.literal('')) })).reduce((obj, item) => {
    return { ...obj, ...item }
}, {})


const NewMemberSchema = z.object({
    prenom: z.string().min(1, { message: "Vous devez mettre votre prénom" }),
    nom: z.string().min(1, { message: "Vous devez mettre votre nom de famille" }),
    numero_telephone: z.string().regex(new RegExp(PHONE_NUMBER_REGEX), { message: "Vous devez mettre un numéro de téléphone valide" }).optional().or(z.literal('')),
    email: z.email({ error: "Vous devez mettre une adresse e-mail valide" }),
    adresse: z.string().min(1, { message: "Vous devez mettre votre adresse" }).optional().or(z.literal('')),
    ville: z.string().min(1, { message: "Vous devez mettre votre ville" }).optional().or(z.literal('')),
    // region: z.string(),
    code_postal: z.string().regex(new RegExp(ZIP_CODE_REGEX), { message: "Vous devez un code postal valide" }),
    // Secteur activité
    ...listBusinessSectorValidator,

    reglement: z.string().optional().or(z.literal('')),
    signature: z.string().optional().or(z.literal('')),
}).refine((data) => {
    return hasSelectedABusinessSector(data);
}, {
    error: "Vous devez choisir au moins un secteur d'activité",
}).refine((data) => {
    return "reglement" in data;
}, {
    error: "Vous devez accepter le règlement intérieur du FacLab® numixs",
}).refine((data) => {
    return "signature" in data;
}, {
    error: "Vous devez signer le formulaire",
})

const submitForm = async (e: SubmitEvent) => {
    e.preventDefault();

    (e.currentTarget as HTMLFormElement).dataset.isDirty = "";

    if (!validForm(e)) {
        return;
    }

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    listBusinessSector.forEach(({ value }) => {
        if (formData.has(value)) {
            formData.delete(value);
            formData.append(value, "oui")
        } else {
            formData.append(value, "non")
        }
    });

    const req = await fetch("/", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(Array.from(formData.entries()))),
    })
    const res = await req.text();
    console.log(res)
    // dialog.showModal();

    // const dialogSwapContainer = dialog.querySelector("[data-swap-content]") as HTMLDivElement;
    // dialogSwapContainer.innerHTML = "";
    // dialogSwapContainer.append(formSuccessTplRaw.content.cloneNode(true))
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

            const inputRelated = form.querySelector(`input[name="${String(item.path[0])}"]`);
            if (inputRelated) {
                inputRelated.classList.add("error");
                inputRelated.ariaInvalid = "true";
            }

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
