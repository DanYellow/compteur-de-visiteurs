const ws = new WebSocket('ws://localhost:3900');

const rowTplRaw = document.querySelector("tr[data-member-row]") as HTMLTemplateElement;

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
        })
        tbody!.appendChild(rowTpl);
    }
});
