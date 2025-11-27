const deleteModal = document.getElementById("delete-place") as HTMLDialogElement;

deleteModal?.addEventListener("toggle", async (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        const sourceItem = toggleEvent.source! as HTMLButtonElement;
        const placeId = sourceItem.dataset.placeId;

        (deleteModal.querySelector("input[type='hidden']") as HTMLInputElement).value = String(placeId);
    }
});
