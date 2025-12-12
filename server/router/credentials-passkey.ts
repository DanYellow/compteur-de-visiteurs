import express from "express";
import { verifyRegistrationResponse, generateRegistrationOptions, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import base64url from "base64url";
import dotenv from 'dotenv';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

import { User as UserModel, UserPublicKeyCredentials as UserPublicKeyCredentialsModel } from "#models/index.ts";

dotenv.config({ path: `${process.cwd()}/.env.local` })

const router = express.Router();

const getNewChallenge = () => {
    return Math.random().toString(36).substring(2);
}

const convertChallenge = (challenge: string) => {
    return btoa(challenge).replaceAll('=', '');
}

let users = {};
let challenges = {};
const rpId = 'localhost';

router.post('/passkey/enregistrement', async (req, res) => {
    const username = req.body.email;

    try {
        const user = await UserModel.findOne({
            where: {
                email: String(req.body.email),
            }
        })

        if (user) {
            const challenge = getNewChallenge();

            const pubKey = {
                challenge: challenge,
                rp: { id: rpId, name: 'webauthn-app' },
                user: { id: user.id, name: username, displayName: `${username || ''} - Numixs` },
                pubKeyCredParams: [
                    { type: 'public-key', alg: -7 },
                    { type: 'public-key', alg: -257 },
                ],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                    residentKey: 'preferred',
                    requireResidentKey: true,
                }
            };

            const excludeCredentials: AuthenticatorTransportFuture[] = [];

            // const credentials = Credentials.findByUserId(user.id);
            // if (credentials.length > 0) {
            //     for (const cred of credentials) {
            //         excludeCredentials.push({
            //             id: isoBase64URL.toBuffer(cred.id),
            //             type: 'public-key',
            //             transports: cred.transports,
            //         });
            //     }
            // }

            const options = await generateRegistrationOptions({
                rpName: 'webauthn-app',
                rpID: rpId,
                userID: isoUint8Array.fromUTF8String(String(user.id)),
                userName: username,
                userDisplayName: `${username || ''} - Numixs`,
                attestationType: 'none',
                // excludeCredentials,
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    requireResidentKey: true
                },
            });

            req.session.challenge = options.challenge;
            req.session.email = username;
            
            return res.json(options);
            // const external_id = convertChallenge(challenge);

            // await UserPublicKeyCredentialsModel.create({
            //     user_id: user.id,
            //     public_key: "",
            //     external_id: external_id
            // })

            // await user.setListPublicKeys()
        } else {
            return res.status(400).send({ error: "user_not_found" });
        }
    } catch (error: any) {
        console.error(error);
        return res.status(400).send({ error: error.message });
    }

    // await UserPublicKeyCredentialsModel.create({
    //     user_id
    //     public_key: String(req.body.email),
    // });
    // challenges[username] = convertChallenge(challenge);

    return res.status(400).json({});
});

router.post('/passkey/retour', async (req, res) => {
    const expectedChallenge = req.session.challenge;

    const expectedOrigin = [`${req.protocol}://${req.get('host')}`!];
    // Verify the attestation response
    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin,
        });
    } catch (error: any) {
        console.error(error);
        return res.status(400).send({ error: error.message });
    }
    const { verified, registrationInfo } = verification;

    if (verified) {
        const {
            aaguid,
            credential: {
                publicKey,
                id: credentialID,
            },
            credentialBackedUp
        } = registrationInfo;

        const user = await UserModel.findOne({
            where: {
                email: String(req.session.email),
            }
        })

        if (user) {
            const base64CredentialID = base64url.encode(Buffer.from(credentialID));
            const base64PublicKey = base64url.encode(Buffer.from(publicKey));

            const credentials = await UserPublicKeyCredentialsModel.create({
                user_id: user.id,
                external_id: base64CredentialID,
                public_key: base64PublicKey,
                aaguid,
            })

            await user.setListPublicKeys([credentials]);
        }

        return res.status(200).send(true);
    }
    return res.status(500).send(false);
});



export default router;
