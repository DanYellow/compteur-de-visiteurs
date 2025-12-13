// Remove passkey options if not exists
if (
    window.PublicKeyCredential &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
) {
    const passkeyItems = document.querySelectorAll(
        "[data-passkey-toggle]"
    ) as NodeListOf<HTMLElement>;

    Promise.all([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        PublicKeyCredential.isConditionalMediationAvailable(),
    ]).then((results) => {
        if (results.some((r) => r === false)) {
            Array.from(passkeyItems).forEach(async (item) => {
                (item.parentNode as HTMLElement)!.classList.replace(
                    "md:grid-cols-[1fr_auto_1fr]",
                    "md:grid-cols-1"
                );
                item.remove();
            });
        }
    });
}

// Create passkey

const createPasskeyBtn = document.querySelector(
    "[data-passkey-register]"
) as HTMLButtonElement;

createPasskeyBtn?.addEventListener("click", async () => {
    const publicKey = await fetch("/passkey/creation-options", {
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

    const response = await fetch("/passkey/creation", {
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
        alert("Une erreur est survenue");
    }

    // console.log(response);
});
