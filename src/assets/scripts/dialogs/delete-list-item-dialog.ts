const deleteModal = document.querySelector("[data-delete-item-dialog]") as HTMLDialogElement;

deleteModal?.addEventListener("toggle", async (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        const sourceItem = toggleEvent.source! as HTMLButtonElement;
        const itemId = sourceItem.dataset.itemId;

        (deleteModal.querySelector("input[type='hidden']") as HTMLInputElement).value = String(itemId);
    }
});
