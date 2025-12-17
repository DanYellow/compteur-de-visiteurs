import { SOCKET_EVENTS } from '#scripts/utils.ts';
import { createNotification } from '#scripts/notifications-manager.ts';

const ws = new WebSocket(`ws://localhost:${import.meta.env.VITE_PORT || 3900}`);

ws.addEventListener("message", (event) => {
    const { type } = JSON.parse(event.data);

    if (type === SOCKET_EVENTS.VISITOR_REGISTERED) {
        createNotification(SOCKET_EVENTS.VISITOR_REGISTERED);
    }
});
