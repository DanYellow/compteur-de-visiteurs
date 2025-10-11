const inputDate = document.getElementById("current-date") as HTMLInputElement;
inputDate.addEventListener("command", (event) => {
    if (event.command == "--open-date-picker") {
        inputDate.showPicker();
    }
});

inputDate.addEventListener("change", (e) => {
    const form = (e.currentTarget as HTMLInputElement).closest("form");

    if (form) {
        form.submit();
    }
});
