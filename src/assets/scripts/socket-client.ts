import { SOCKET_EVENTS } from '#scripts/utils.ts';
import { createNotification } from '#scripts/notifications-manager.ts';

const ws = new WebSocket(`ws://localhost:${import.meta.env.VITE_PORT || 3900}`);

ws.addEventListener("message", (event) => {
    const { type } = JSON.parse(event.data);

    if (type === SOCKET_EVENTS.VISITOR_REGISTERED) {
        // createNotification("U");
    } else if (type === SOCKET_EVENTS.NEW_USER) {
        createNotification("Un nouvel utilisateur vient de s'inscrire. Veuillez valider ou supprimer ce compte.");
    }
});
