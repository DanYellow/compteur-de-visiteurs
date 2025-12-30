import { createNotification } from '#scripts/notifications-manager.ts';

const listSwitches = document.querySelectorAll(
    "[data-change-user-status]"
) as NodeListOf<HTMLInputElement>;

const toggleUserStatus = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const userPayload = JSON.parse(input.dataset.changeUserStatus!);

    const req = await fetch("/api/utilisateur/statut", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            [userPayload.key]: input.checked,
            userId: userPayload.id,
        }),
    });
    console.log(await req.json());
};

Array.from(listSwitches).forEach((item) => {
    item.addEventListener("change", toggleUserStatus);
});

const listActivationButtons = document.querySelectorAll(
    "[data-send-activation-email]"
) as NodeListOf<HTMLButtonElement>;

Array.from(listActivationButtons).forEach((item) => {
    item.addEventListener("click", async (e: Event) => {
        const element = e.currentTarget as HTMLButtonElement;
        const userId = element.dataset.sendActivationEmail;

        const req = await fetch("/api/utilisateur/statut", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                userId,
                approuve: true,
            }),
        });
        const res = await req.json();

        createNotification(`Email d'approbation envoyé à "${res.utilisateur.email}"`)
    });
});
