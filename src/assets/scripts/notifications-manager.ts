const notificationTplRaw = document.querySelector("[data-template-id='new-member-notification']") as HTMLTemplateElement;
const notificationsContainer = document.querySelector("[data-notifications-container]");

export const createNotification = (message: string) => {
    const notification = notificationTplRaw.content.cloneNode(true) as HTMLDivElement;
    (notification.querySelector("[data-notification-text]") as HTMLParagraphElement).textContent = message;
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