import * as z from "zod";
import Papa from "papaparse";

import { REQUIRED_MESSAGE } from '#scripts/utils.shared';

export const expectedCsvHeaders = ['Janvier', 'Visiteurs'] as const;

export const VisitCsvHeaderSchema = z
    .array(z.string())
    .refine(
        (headers) => {
            const listMissingCols = expectedCsvHeaders.filter(h => !headers.includes(h));
            return listMissingCols.length === 0;
        },
        {
            message: "Le format du fichier ne respecte pas le format attendu. Veuillez vous réferrer au document \"Rapport de visites\".",
        }
    );

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
        .refine((file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const text = reader.result as string;

                    Papa.parse(text, {
                        preview: 1,
                        skipFirstNLines: 1,
                        complete: ({ data }: { data: string[] }) => {
                            const headers = data[0];
                            const headerValidator = VisitCsvHeaderSchema.safeParse(headers)

                            resolve(headerValidator.success);
                        },
                    });
                };
                reader.onerror = reject;
                reader.readAsText(file);
            })
        }, {
            message: "Le format du fichier ne respecte pas le format attendu. Veuillez vous réferrer au document \"Rapport de visites\".",
        })
})
