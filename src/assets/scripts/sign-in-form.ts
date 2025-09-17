import * as z from "zod";

const form = document.querySelector("[data-sign-in-form]") as HTMLFormElement;

const submitForm = (e: SubmitEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    console.log(formData);
};

form?.addEventListener("submit", submitForm);
