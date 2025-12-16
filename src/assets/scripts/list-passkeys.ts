import {
    getPasskeyOptions,
    createPasskey,
    togglePasskeysVisibility,
} from "#scripts/passkey-manager.ts";

togglePasskeysVisibility();

const createPasskeyBtn = document.querySelector(
    "[data-passkey-register]"
) as HTMLButtonElement;

createPasskeyBtn?.addEventListener("click", async (e: Event) => {
    const email = (e.currentTarget as HTMLButtonElement).dataset
        .passkeyRegister;

    if (email) {
        const serializedPublicKey = await getPasskeyOptions(email);
        const passkey = await createPasskey(serializedPublicKey);

        if (passkey.redirected) {
            window.location.href = passkey.url;
        } else {
            alert("Une erreur est survenue");
        }
    }
});

const editPasskeyModal = document.getElementById(
    "manage-passkey"
) as HTMLDialogElement;

editPasskeyModal.addEventListener("toggle", (e) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    const idInput = editPasskeyModal.querySelector("#id") as HTMLInputElement;
    const nameInput = editPasskeyModal.querySelector(
        "#nom"
    ) as HTMLInputElement;
    const passkeyData = JSON.parse(e.source?.dataset.passkey || "{}");

    if (isOpened) {
        idInput!.value = passkeyData.id;
        nameInput!.value = passkeyData.nom;
    }
});

const deletePasskeyModal = document.getElementById(
    "delete-passkey"
) as HTMLDialogElement;

deletePasskeyModal.addEventListener("toggle", (e) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    const idInput = deletePasskeyModal.querySelector(
        "#passkeyId"
    ) as HTMLInputElement;
    const passkeyId = e.source?.dataset.itemId;
    if (isOpened && passkeyId) {
        idInput!.value = passkeyId;
    }
});

const passwordActivationSwitch = document.querySelector(
    "[data-change-user-pass-activation]"
) as HTMLInputElement;

passwordActivationSwitch.addEventListener("change", async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const userId = input.dataset.userId;

    await fetch("/api/utilisateur/mdp-activation", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            userId,
        }),
    });
});
