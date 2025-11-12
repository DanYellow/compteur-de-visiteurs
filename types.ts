import type { Align, LineControllerDatasetOptions, TitleOptions } from "chart.js";

export type LineChartEntry = {
    data: Number[];
} & Partial<LineControllerDatasetOptions>;

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
    date_passage: string;
    lieu?: string;
    groupe: string;
    // [key: string]: string;
}

export interface GroupVisit {
    [key: number]: Visit[];
}
