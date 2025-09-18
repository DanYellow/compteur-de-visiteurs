import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
    const listBusinessSector = [
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

    res.render("pages/index.njk", {
        "list_business_sector": listBusinessSector,
    });
});


export default router;
