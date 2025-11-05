import type { Align, TitleOptions } from "chart.js";
import type { DateTime } from "luxon";

export interface LineChartEntry {
    label: string;
    data: Number[];
    borderColor: string;
}


export interface WeekMonth {
    id: number;
    name: string;
}

export interface TotalVisitorsPluginOptions {
    text?: string;
    fontSize?: string;
}

export type CustomTitleOptions = Omit<TitleOptions, 'fullSize' | 'text' | "align" | "padding" | "position"> & {
    fullSize?: boolean;
    position?: 'top' | 'left' | 'bottom' | 'right';
    align?: Align;
    padding?: number | { top: number; bottom: number };
};

export type Result = Record<string, Record<string, string>>;

export interface PivotTableOptions {
    columnSuffix: string;
}

export interface Visit {
    id: number;
    heure?: number;
    date_passage: DateTime;
    lieu?: string;
}
