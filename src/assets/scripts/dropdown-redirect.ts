const listDropdowns = document.querySelectorAll("[data-select-redirect]") as NodeListOf<HTMLSelectElement>;
listDropdowns.forEach((item) => {
    item.addEventListener("change", (e: Event) => {
        const dropdown = e.target as HTMLSelectElement;
        const name = dropdown.dataset.selectRedirect as string;

        const params = new URLSearchParams(window.location.search);
        if (params.has(name)) {
            if (dropdown.value) {
                params.set(name, dropdown.value)
            } else {
                params.delete(name)
            }
        } else {
            params.set(name, dropdown.value)
        }

        if (params.toString().length) {
            window.location.search = `?${params.toString()}`;
        } else {
            window.location.search = "";
        }
    })
})
