import * as z from "zod";

import { REQUIRED_MESSAGE } from '#scripts/utils.shared';

export { VisitSchema, DepartmentSchema, AgeSchema, GenderSchema, GroupSchema, VisitCodeSchema } from "./visit";
export { PlaceSchema } from "./place";
export { EventSchema } from "./event";
export { VisitCsvSchema, VisitCsvHeaderSchema } from "./visit-csv";

// https://github.com/colinhacks/zod/discussions/4051
export const SignInSchema = z.object({
    email: z.email({
        error: `Email : ${REQUIRED_MESSAGE}`
    }),
})

const PASSWORD_REGEX:RegExp = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&|;,_-])[A-Za-z\d@$!%*#?&|;,_-]{6,}$/

const BasePasswordSchema = z.object({
    email: z.email({
        error: `Email : ${REQUIRED_MESSAGE}`
    }),
    password: z.string({
        error: `Mot de passe : ${REQUIRED_MESSAGE}`
    })
        .refine((value: string = "") => PASSWORD_REGEX.test(value), 'Le mot de passe ne correspond pas aux critères attendus : un nombre et un caractère spécial minimum'),
    confirm_password: z.string({
        error: `Confirmer mot de passe : ${REQUIRED_MESSAGE}`
    })
});

const withPasswordMatch =  <T extends z.ZodObject<z.ZodRawShape & { password: z.ZodString; confirm_password: z.ZodString }>>(schema: T) =>
    schema.superRefine(({ confirm_password, password }: z.output<T>, ctx) => {
        if (confirm_password !== password) {
            ctx.addIssue({
                code: "custom",
                message: "Les mots de passe ne correspondent pas",
                path: ['confirm_password']
            });
        }
    });


export const SignInActivationSchema = withPasswordMatch(BasePasswordSchema);

export const LoginSchema = z.object({
    email: z.email({
        error: (issue) =>
            issue.input === undefined
                ? `Identifiant : ${REQUIRED_MESSAGE}`
                : 'Identifiant : E-mail invalide',
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
export const ChangePasswordSchema = withPasswordMatch(BasePasswordSchema.omit({ email: true }));
