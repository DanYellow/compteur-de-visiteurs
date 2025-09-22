const ws = new WebSocket(`ws://localhost:${import.meta.env.VITE_PORT}`);

const rowTplRaw = document.querySelector("tr[data-member-row]") as HTMLTableRowElement;
const notificationTplRaw = document.querySelector("[data-template-id='new-member-notification']") as HTMLTemplateElement;
const notificationsContainer = document.querySelector("[data-notifications-container]");
const nbMembers = document.querySelector("[data-nb-members]");

const createNotification = (member: { nom: string, prenom: string }) => {
    const notification = notificationTplRaw.content.cloneNode(true) as HTMLDivElement;
    (notification.querySelector("[data-notification-text]") as HTMLParagraphElement).textContent = `${member.prenom} ${member.nom.toUpperCase()} vient de souscrire à la charte du FacLab®`;
    (notification.querySelector("[data-dismiss-notification-btn]") as HTMLButtonElement).addEventListener("click", (e) => {
        const element = e.target as HTMLButtonElement;
        element?.closest("[data-notification]")?.classList.add("close")
        element?.closest("[data-notification]")?.addEventListener("transitionend", (evt) => {
            const element = evt.target as HTMLDivElement;
            element.parentNode?.removeChild(element);
        })
    });

    notificationsContainer?.append(notification);
}

ws.addEventListener("message", (event) => {
    const { payload, type } = JSON.parse(event.data);

    if (type === "MEMBER_ADDED") {
        const tbody = rowTplRaw.parentElement;
        const rowTpl = rowTplRaw.cloneNode(true) as HTMLTableRowElement;

        Object.entries(payload).forEach(([key, value]) => {
            const cell = rowTpl.querySelector(`[data-row-key="${key}"]`);
            if (cell) {
                cell.textContent = String(value);
            }
        });
        tbody!.appendChild(rowTpl);

        nbMembers!.textContent = String(Number(nbMembers!.textContent) + 1);

        createNotification(payload);
    }
});
