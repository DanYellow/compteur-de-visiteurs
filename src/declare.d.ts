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

    interface Window {
        createNotification: (message: string) => void;
    }

    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            FORM_RESULT_TIMEOUT: number;

            JWT_APPROVAL_SECRET: string;
            JWT_APPROVAL_EXPIRE_TIME: string;
            JWT_PASSKEY_SECRET: string;
            JWT_PASSKEY_EXPIRE_TIME: number;
            JWT_PASSWORD_RECOVERY_SECRET: string;
            JWT_PASSWORD_RECOVERY_EXPIRE_TIME: number;

            ADMIN_SUFFIX: string;
            EMAIL_NOREPLY: string;
            EMAIL_PASSWORD_NOREPLY: string;
            EMAIL_SERVER_NOREPLY: string;

            HOSTNAME: string;
            DEFAULT_ADMIN_PASSWORD: string;
        }
    }
}

export { }
