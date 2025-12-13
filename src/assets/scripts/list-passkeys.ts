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
