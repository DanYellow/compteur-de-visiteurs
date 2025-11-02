import type { Align, TitleOptions } from "chart.js";

export interface LineChartEntry {
    label: string;
    data: Number[];
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
