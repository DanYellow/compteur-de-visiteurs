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

export type Result = Record<string, string>;

export interface PivotTableOptions {
    columnSuffix: string;
}

type Groups = {
    [key: string]: string;
}

export type Visit = Groups & {
    id: number;
    heure?: number;
    date_passage: string;
    lieu?: string;
    groupe: string;
}

export interface GroupVisit {
    [key: number]: Visit[];
}

export interface BaseConfigData {
    [key: string]: {
        apiKey: string;
        xValuesSuffix?: string;
        listColumns: string[] | { id: number; name: string; }[];
    }
}

export type ChartConfigData = BaseConfigData & {
    [key: string]: {
        id: string;
        chartTitle: string;
        downloadLink: string;
        xTitle: string;
        xLabels: string[] | { id: number; name: string; }[];
    }
}
