import type { Align, LineControllerDatasetOptions, TitleOptions } from "chart.js";
import type { InferAttributes } from "sequelize";

import type { Place as PlaceModel, Visit as VisitModel, Event as EventModel } from "#models/index.ts";

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
    totalColor?: string;
}

export type CustomTitleOptions = Omit<TitleOptions, 'fullSize' | 'text' | "align" | "padding" | "position"> & {
    fullSize?: boolean;
    position?: 'top' | 'left' | 'bottom' | 'right';
    align?: Align;
    padding?: number | { top: number; bottom: number };
};

export interface PivotTableOptions {
    columnSuffix: string;
    simplified: boolean;
}

export type VisitRaw = InferAttributes<VisitModel> & {
    id: number;
    heure?: number;
    lieu?: string;
    date_passage: string;
    groupe: string;
    liste_evenements?: string;
}

export type EventRaw = InferAttributes<EventModel> & {
    groupe: string;
    jour?: {
        id: number;
        name: string;
    };
    aujourdhui?: boolean;
    listPlaces: PlaceRaw[];
}

export type PlaceRaw = InferAttributes<PlaceModel> & {
    regularOpening?: {
        jours_fermeture: string;
        heure_fermeture: string;
        heure_ouverture: string;
    };
    listEvents: EventRaw[];
};

export type Place_Visits = InferAttributes<PlaceModel> & {
    listVisits: VisitRaw[];
};


export type CommonRegularOpening = {
    jours_fermeture: string[] | string;
    heure_ouverture: string;
    heure_fermeture: string;
    jours_fermeture_litteral?: string;
}

export type CSVLinearHeader = Omit<VisitRaw, 'id'> & {
    id: string;
    groupe?: string;
    order?: number;
}

export interface GroupVisit {
    [key: number]: VisitRaw[];
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
