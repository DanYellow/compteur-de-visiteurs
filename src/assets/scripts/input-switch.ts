const listInputsSwitch = document.querySelectorAll("[data-input-switch-toggle]") as NodeListOf<HTMLInputElement>;

const onChange = (e: Event) => {
    const element = e.currentTarget! as HTMLInputElement;
    const recipient = document.querySelector(`[data-input-switch-toggle-recipient="${element.dataset.inputSwitchToggle}"]`)

    if (recipient) {
        recipient.classList.toggle("hidden", !element.checked)
    }
};

const setDefaultRecipientState = (element: HTMLInputElement) => {
    const recipient = document.querySelector(`[data-input-switch-toggle-recipient="${element.dataset.inputSwitchToggle}"]`);
    if (recipient) {
        if (element.checked) {
            recipient.classList.remove("hidden")
        } else {
            recipient.classList.add("hidden")
        }
    }
}

listInputsSwitch.forEach((item) => {
    item.addEventListener("input", onChange);
    setDefaultRecipientState(item);
});
