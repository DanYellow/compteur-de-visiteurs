const dropdown = document.getElementById("place-dropdown");

dropdown?.addEventListener("change", (e: Event) => {
    const dropdown = e.target as HTMLSelectElement;
    const params = new URLSearchParams(window.location.search);
    if (params.has("lieu")) {
        if (dropdown.value) {
            params.set("lieu", dropdown.value)
        } else {
            params.delete("lieu")
        }
    } else {
        params.set("lieu", dropdown.value)
    }
    window.location.search = `?${params.toString()}`;
})
