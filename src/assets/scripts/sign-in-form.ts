import * as z from "zod";

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;
const errorsContainer = document.querySelector("[data-form-errors]") as HTMLUListElement;
const dialog = document.querySelector("[data-dialog='form-submitted']") as HTMLDialogElement;

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
    habitant: z.string().optional().or(z.literal('')),
    association: z.string().optional().or(z.literal('')),
    faclab: z.string().optional().or(z.literal('')),
    entrepreneur: z.string().optional().or(z.literal('')),
    artisan_artiste: z.string().optional().or(z.literal('')),
    collectivite: z.string().optional().or(z.literal('')),
    education: z.string().optional().or(z.literal('')),

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

const submitForm = (e: SubmitEvent) => {
    e.preventDefault();

    (e.currentTarget as HTMLFormElement).dataset.isDirty = "";

    if (!validForm(e)) {
        return;
    }

    dialog.showModal();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    console.log(Object.fromEntries(formData))
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
    })

    errorsContainer.innerHTML = "";

    if (!validator.success) {
        validator.error.issues.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item.message;

            const inputRelated = form.querySelector(`input[name="${String(item.path[0])}"]`);
            if (inputRelated) {
                inputRelated.classList.add("error")
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
