import { ChartType } from "chart.js";
import type { TotalVisitorsPluginOptions } from "#types";

declare module 'chart.js' {
    interface PluginOptionsByType<TType extends ChartType> {
        totalVisitors?: TotalVisitorsPluginOptions;
    }
}

declare global {
    interface ToggleEvent<T = unknown> {
        source?: HTMLElement | null;
    }

    interface Event<T = unknown> {
        source?: HTMLElement | null;
        command?: string | null;
    }
}
