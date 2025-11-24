import type { Align, LineControllerDatasetOptions, TitleOptions } from "chart.js";
import type { InferAttributes } from "sequelize";

import type { Place as PlaceModel } from "#models/index.ts";

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

export type Visit = Record<string, string> & {
    id: number;
    heure?: number;
    date_passage: string;
    groupe: string;
}


export type PlaceRaw = InferAttributes<PlaceModel> & {
    regularOpening?: {
        jours_fermeture: string;
        heure_fermeture: string;
        heure_ouverture: string;
    }
};

export type CommonRegularOpening = {
    jours_fermeture: string[] | string;
    heure_ouverture: string;
    heure_fermeture: string;
    jours_fermeture_litteral?: string;
}

export type CSVLinearHeader = Omit<Visit, 'id'> & {
    id: string;
    groupe?: string;
}

export interface GroupVisit {
    [key: number]: Visit[];
}

export interface BaseConfigData {
    [key: string]: {
        apiKey: string;
        xValuesSuffix?: string;
        listColumns?: string[] | { id: number; name: string; }[];
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
