const listSwitches = document.querySelectorAll("[data-change-user-status]") as NodeListOf<HTMLInputElement>;

const toggleUserStatus = async (e:Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const userId = input.dataset.changeUserStatus;

    const req = await fetch("/api/utilisateur/statut", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            actif: input.checked,
            userId,
        })
    })
    console.log(await req.json())
}

Array.from(listSwitches).forEach((item) => {
    item.addEventListener("change", toggleUserStatus)
})
