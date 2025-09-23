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
        "name": "Artisan",
        "value": "artisan"
    },
    {
        "name": "FabLab",
        "value": "fablab"
    },
    {
        "name": "Retraité",
        "value": "retraité"
    },
    {
        "name": "Artiste",
        "value": "artiste"
    },
    {
        "name": "Collectivité",
        "value": "collectivite"
    },
    {
        "name": "FacLab",
        "value": "faclab"
    },
    {
        "name": "Association",
        "value": "association"
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
