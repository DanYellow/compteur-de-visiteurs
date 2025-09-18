export const listBusinessSector = [
    {
        "name": "Éducation / formation (ateliers pédagogiques)",
        "value": "education"
    },
    {
        "name": "Entrepreneur",
        "value": "entrepreneur"
    },
    {
        "name": "Artisan / Artiste",
        "value": "artisan_artiste"
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
    {
        "name": "Habitant",
        "value": "habitant"
    }
]

export const getCurrentFormattedTime = () => {
    const now = Date.now();

    const dateTime = new Date(now);
    const day = String(dateTime.getDate() + 1).padStart(2, "0");
    const month = String(dateTime.getMonth() + 1).padStart(2, "0");
    const year = dateTime.getFullYear();

    return `${day}/${month}/${year}`
}
