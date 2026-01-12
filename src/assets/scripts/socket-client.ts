import { SOCKET_EVENTS } from "#scripts/utils.shared.ts";
import { createNotification } from '#scripts/notifications-manager.ts';

const ws = new WebSocket(`ws://${window.location.host}`);

ws.addEventListener("message", (event) => {
    const { type } = JSON.parse(event.data);

    if (type === SOCKET_EVENTS.VISITOR_REGISTERED) {
        // createNotification("U");
    } else if (type === SOCKET_EVENTS.NEW_USER) {
        createNotification("Un nouvel utilisateur vient de s'inscrire. Veuillez approuver ou supprimer ce compte.");
    }
});
