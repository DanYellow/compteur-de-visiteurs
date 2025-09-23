export const listBusinessSector = [
    {
        "name": "Habitant",
        "value": "habitant"
    },
    {
        "name": "Éducation",
        "value": "education"
    },
    {
        "name": "Entreprise",
        "value": "entreprise"
    },
    {
        "name": "Artiste",
        "value": "artiste"
    },
    {
        "name": "Artisan",
        "value": "artisan"
    },
    {
        "name": "Collectivité",
        "value": "collectivité"
    },
    {
        "name": "Agent CARPF",
        "value": "agent_carpf"
    },
    {
        "name": "Numixs Lab",
        "value": "numixs_lab"
    },
    {
        "name": "FabLab",
        "value": "fablab"
    },
    {
        "name": "Association",
        "value": "association"
    },
    {
        "name": "Retraité",
        "value": "retraité"
    },
    {
        "name": "Autre",
        "value": "autre"
    },
]

export const getCurrentDay = () => {
    const now = Date.now();

    const dateTime = new Date(now);
    const day = String(dateTime.getDate() + 1).padStart(2, "0");
    const month = String(dateTime.getMonth() + 1).padStart(2, "0");
    const year = dateTime.getFullYear();

    return `${day}/${month}/${year}`
}


export const getCurrentTime = (sep = "-") => {
    const now = Date.now();

    const dateTime = new Date(now - new Date().getTimezoneOffset());
    const hours = String(dateTime.getHours());
    const minutes = String(dateTime.getMinutes());
    const seconds = String(dateTime.getSeconds());

    return `${hours}${sep}${minutes}${sep}${seconds}`
}
