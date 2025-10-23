const inputDate = document.getElementById("current-date") as HTMLInputElement;
inputDate?.addEventListener("command", (event) => {
    if (event.command == "--open-date-picker") {
        inputDate.showPicker();
    }
});

// let previousValue = inputDate.value;
inputDate?.addEventListener("input", (e) => {
    const input = (e.currentTarget as HTMLInputElement);
    const form = input.closest("form");
    // const previousDay = previousValue.split("-").at(-1)

    if (form ) { // && input.value.split("-").at(-1) != previousDay
        form.submit();
    } else {
        // previousValue = inputDate.value;
    }
});
