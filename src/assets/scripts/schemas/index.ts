import * as z from "zod";

import { REQUIRED_MESSAGE } from '#scripts/utils.shared.ts';

export { VisitSchema, DepartmentSchema, AgeSchema, GenderSchema, GroupSchema, VisitCodeSchema } from "./visit.ts";
export { PlaceSchema } from "./place.ts";
export { EventSchema } from "./event.ts";

// https://github.com/colinhacks/zod/discussions/4051
export const SignInSchema = z.object({
    email: z.email({
        error: `Email : ${REQUIRED_MESSAGE}`
    }),
})

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&|;,_-])[A-Za-z\d@$!%*#?&|;,_-]{6,}$/

export const SignInActivationSchema = z.object({
    email: z.email({
        error: `Email : ${REQUIRED_MESSAGE}`
    }),
    password: z.string({
        error: `Mot de passe : ${REQUIRED_MESSAGE}`
    })
        .refine((value) => PASSWORD_REGEX.test(value ?? ""), 'Le mot de passe ne correspond pas aux critères attendus : un nombre et un caractère spécial minimum'),
    confirm_password: z.string({
        error: `Confirmer mot de passe : ${REQUIRED_MESSAGE}`
    })
}).superRefine(({ confirm_password, password }, ctx) => {
    if (confirm_password !== password) {
        ctx.addIssue({
            code: "custom",
            message: "Les mots de passe ne correspondent pas",
            path: ['confirm_password']
        });
    }
});

export const LoginSchema = z.object({
    email: z.email({
        error: `Identifiant : ${REQUIRED_MESSAGE}`
    }),
    mot_de_passe: z.string({
        error: `Mot de passe : ${REQUIRED_MESSAGE}`
    }),
});

export const UserSchema = z.object({
    email: z.email({
        error: `Email : ${REQUIRED_MESSAGE}`
    }),
    nom: z.string().optional(),
    prenom: z.string().optional(),
    mot_de_passe: z.string({
        error: `Mot de passe : ${REQUIRED_MESSAGE}`
    }).optional(),
});

export const PasswordRecoverySchema = LoginSchema.pick({ email: true })
export const ChangePasswordSchema = SignInActivationSchema.omit({ email: true }).superRefine(({ confirm_password, password }, ctx) => {
    if (confirm_password !== password) {
        ctx.addIssue({
            code: "custom",
            message: "Les mots de passe ne correspondent pas",
            path: ['confirm_password']
        });
    }
});
