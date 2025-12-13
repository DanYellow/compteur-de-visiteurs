const passkeyItems = document.querySelectorAll(
    "[data-passkey-toggle]"
) as NodeListOf<HTMLElement>;

Promise.all([
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
    PublicKeyCredential.isConditionalMediationAvailable(),
]).then((results) => {
    if (results.some((r) => r === false)) {
        Array.from(passkeyItems).forEach(async (item) => {
            (item.parentNode as HTMLElement)!.classList.replace("md:grid-cols-[1fr_auto_1fr]", "md:grid-cols-1");
            item.remove();
        });
    }
});
