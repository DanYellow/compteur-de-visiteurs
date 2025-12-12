import express from "express";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import dotenv from 'dotenv';

dotenv.config({ path: `${process.cwd()}/.env.local` })

const router = express.Router();

const getNewChallenge = () => {
    return Math.random().toString(36).substring(2);
}

const convertChallenge = (challenge) => {
    return btoa(challenge).replaceAll('=', '');
}

let users = {};
let challenges = {};
const rpId = 'localhost';
const expectedOrigin = [`http://localhost:${Number(process.env.VITE_PORT || 3900)}`];


router.post('/passkey/start', (req, res) => {
    let username = req.body.email;

    let challenge = getNewChallenge();
    challenges[username] = convertChallenge(challenge);

    const pubKey = {
        challenge: challenge,
        rp: { id: rpId, name: 'webauthn-app' },
        user: { id: username, name: username, displayName: username },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
            requireResidentKey: false,
        }
    };
    res.json(pubKey);
});

router.post('/register/finish', async (req, res) => {
    const username = req.body.username;
    // Verify the attestation response
    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: req.body.data,
            expectedChallenge: challenges[username],
            expectedOrigin: expectedOrigin
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ error: error.message });
    }
    const { verified, registrationInfo } = verification;
    if (verified) {
        users[username] = registrationInfo;
        return res.status(200).send(true);
    }
    res.status(500).send(false);
});



export default router;
