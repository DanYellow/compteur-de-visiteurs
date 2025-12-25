import express from "express";
import {
    verifyRegistrationResponse,
    generateRegistrationOptions,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    WebAuthnCredential,
} from "@simplewebauthn/server";
import base64url from "base64url";
import dotenv from "dotenv";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import jwt from "jsonwebtoken";

import {
    User as UserModel,
    UserPublicKeyCredentials as UserPublicKeyCredentialsModel,
} from "#models/index.ts";
import { flashMessageCookieOptions } from "#server/index.ts";
import { CustomSession, UserTokenData } from "#types";

dotenv.config({ path: `${process.cwd()}/.env.local` });

const router = express.Router();

const rpId = process.env.HOSTNAME;

router.post("/passkey/creation-options", async (req, res) => {
    const username = req.body.email;
    const session: CustomSession = req.session;

    if (process.env.NODE_ENV === "development") {
        // await UserPublicKeyCredentialsModel.destroy({
        //     where: {},
        //     truncate: true,
        // });
    }

    try {
        const user = await UserModel.findOne({
            where: {
                email: String(req.body.email),
            },
        });

        if (user) {
            const excludeCredentials = [];

            const listUserCredentials =
                await UserPublicKeyCredentialsModel.findAll({
                    where: {
                        user_id: user.id,
                    },
                });
            for (const cred of listUserCredentials) {
                excludeCredentials.push({
                    id: cred.id_externe,
                    type: 'public-key',
                    // transports: cred.transports,
                });
            }

            const options = await generateRegistrationOptions({
                rpName: "webauthn-app",
                rpID: rpId,
                userID: isoUint8Array.fromUTF8String(String(user.id)),
                userName: username,
                userDisplayName: `${username || ""} - Numixs`,
                attestationType: "none",
                excludeCredentials,
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    requireResidentKey: true,
                    residentKey: "required",
                    userVerification: "preferred",
                },
            });

            session.challenge = options.challenge;
            session.email = username;

            return res.json(options);
        } else {
            return res.status(400).send({ error: "user_not_found" });
        }
    } catch (error: any) {
        console.error(error);
        return res.status(400).send({ error: error.message });
    }
});

router.post("/passkey/creation", async (req, res) => {
    const session: CustomSession = req.session;
    const expectedChallenge = session.challenge!;

    const expectedOrigin = [`${req.protocol}://${req.get("host")}`!];
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
            credential: { publicKey, id: credentialID },
            credentialBackedUp,
        } = registrationInfo;

        const user = await UserModel.findOne({
            where: {
                email: String(session.email),
            },
        });

        if (user) {
            const base64CredentialID = base64url.encode(
                Buffer.from(credentialID)
            );

            const base64PublicKey = base64url.encode(Buffer.from(publicKey));

            await UserPublicKeyCredentialsModel.create({
                user_id: user.id,
                id_externe: base64CredentialID,
                cle_publique: base64PublicKey,
                aaguid,
                compteur: 0,
            });

            try {
                jwt.verify(
                    req.cookies.token,
                    String(process.env.JWT_SECRET)
                ) as UserTokenData;
                res.cookie(
                    "flash_message",
                    "passkey_created",
                    flashMessageCookieOptions
                );

                return res.redirect(
                    `${res.locals.admin_prefix}/utilisateur/moi/passkeys`
                );
            } catch (error) {
                res.cookie(
                    "flash_message",
                    "account_created",
                    flashMessageCookieOptions
                );
                res.cookie("email", session.email, flashMessageCookieOptions);

                return res.redirect("/connexion");
            }
        }

        return res.status(500).send(true);
    }
    return res.status(500).send(false);
});

router.post("/passkey/connexion-options", async (req, res) => {
    const session: CustomSession = req.session;

    try {
        const options = await generateAuthenticationOptions({
            rpID: rpId!,
            allowCredentials: [],
        });

        session.challenge = options.challenge;

        return res.json(options);
    } catch (error) {}
});

router.post("/passkey/connexion", async (req, res) => {
    const session: CustomSession = req.session;
    const payload = req.body;
    const expectedChallenge = session.challenge!;
    const expectedOrigin = [`${req.protocol}://${req.get("host")}`!];
    const expectedRPID = process.env.HOSTNAME!;

    try {
        const credentials = await UserPublicKeyCredentialsModel.findOne({
            where: {
                id_externe: base64url.encode(payload.id),
            },
        });

        if (!credentials) {
            throw new Error("passkey_not_found");
        }

        const user = await UserModel.findOne({
            where: {
                actif: true,
            },
            include: [
                {
                    as: "listPasskeys",
                    model: UserPublicKeyCredentialsModel,
                    where: { id_externe: base64url.encode(payload.id) },
                    attributes: [],
                },
            ],
        });

        if (!user) {
            throw new Error("user_not_found");
        }

        const authenticator: WebAuthnCredential = {
            publicKey: isoBase64URL.toBuffer(credentials.cle_publique),
            id: base64url.encode(credentials.id_externe),
            counter: credentials.compteur,
        };

        const { verified, authenticationInfo } =
            await verifyAuthenticationResponse({
                response: payload,
                expectedChallenge,
                expectedOrigin,
                expectedRPID,
                credential: authenticator,
                requireUserVerification: false,
            });

        if (!verified) {
            throw new Error("auth_failed");
        }

        delete session.challenge;

        const token = jwt.sign(
            { role: user.role, email: user.email, id: user.id },
            String(process.env.JWT_SECRET)
        );

        await user.update({
            derniere_connexion: new Date().toString(),
        });

        if (authenticationInfo.newCounter < credentials.compteur) {
            throw new Error("passkey_cloned");
        }

        await credentials.update({
            compteur: Math.max(
                credentials.compteur,
                authenticationInfo.newCounter
            ),
            derniere_utilisation: new Date().toString(),
        });

        res.cookie(
            "flash_message",
            "successful_login",
            flashMessageCookieOptions
        );
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
        });

        return res.redirect((req.session as CustomSession)?.return_to || `${res.locals.admin_prefix}/tableau-de-bord`);
    } catch (error: any) {
        let errorKey = error.message;
        if ("name" in error) {
            // errorKey = error.name;
        }

        res.cookie("flash_message", errorKey, flashMessageCookieOptions);

        return res.redirect("/connexion");
    }
});

export default router;
