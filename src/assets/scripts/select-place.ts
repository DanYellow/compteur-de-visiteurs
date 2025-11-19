const dropdown = document.getElementById("place-dropdown");

dropdown?.addEventListener("change", (e:Event) => {
    const dropdown = e.target as HTMLSelectElement;
    window.location.search = `lieu=${dropdown.value}`;
})
