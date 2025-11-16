import { SOCKET_EVENTS } from '#scripts/utils.ts';

const ws = new WebSocket(`ws://localhost:${import.meta.env.VITE_PORT || 3900}`);

const notificationTplRaw = document.querySelector("[data-template-id='new-member-notification']") as HTMLTemplateElement;
const notificationsContainer = document.querySelector("[data-notifications-container]");

const createNotification = () => {
    const notification = notificationTplRaw.content.cloneNode(true) as HTMLDivElement;
    (notification.querySelector("[data-notification-text]") as HTMLParagraphElement).textContent = "Une nouvelle visite a été enregistrée";
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
    const { type } = JSON.parse(event.data);

    if (type === SOCKET_EVENTS.VISITOR_REGISTERED) {
        createNotification();
    }
});
