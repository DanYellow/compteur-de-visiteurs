import * as z from "zod";

import { REQUIRED_MESSAGE } from '#scripts/utils.shared';

export const VisitCsvSchema = z.object({
    lieu: z.string().min(1, {
        error: `Lieu : ${REQUIRED_MESSAGE}`
    }),
    file: z.file()
        .refine((file) => file.size > 0, {
            message: `Fichier csv : ${REQUIRED_MESSAGE}`,
        })
        .refine((file) => file.type === 'text/csv', {
            message: `Fichier csv : Seuls les fichiers .csv sont autorisés`,
        })
})
