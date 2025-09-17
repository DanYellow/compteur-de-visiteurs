import * as z from "zod";

const MemberSchema = z.object({
    prenom: z.string(
    ).min(1, { message: "You must enter a password" }),
    nom: z.string(),
    numero_telephone: z.string(),
    email: z.string(),
    adresse: z.string(),
    ville: z.string(),
    // region: z.string(),
    code_postal: z.string(),
    habitant: z.string(),
    association: z.string(),
    faclab: z.string(),
}).refine((data) => {
    return false;
}, {
    error: "Choissez",
    path: ["fefee"]
})

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;

const submitForm = (e: SubmitEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const validation = MemberSchema.safeParse(Object.fromEntries(formData));

    console.log(validation);
};

form?.addEventListener("submit", submitForm);
