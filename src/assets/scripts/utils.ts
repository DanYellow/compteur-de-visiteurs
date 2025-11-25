import type { TotalVisitorsPluginOptions } from "#types";
import type { Chart } from "chart.js";

export const loadImage = (obj: HTMLImageElement) => {
    return new Promise((resolve, reject) => {
        obj.onload = () => resolve(obj);
        obj.onerror = reject;
    });
}

export const slugify = (input: string): string => {
    if (!input)
        return '';

    // make lower case and trim
    var slug = input.toLowerCase().trim();

    // remove accents from charaters
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // replace invalid chars with spaces
    slug = slug.replace(/[^a-z0-9\s-]/g, ' ').trim();

    // replace multiple spaces or hyphens with a single hyphen
    slug = slug.replace(/[\s-]+/g, '-');

    return slug;
}

export const cancellableSleep = (duration: number, signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
        signal.throwIfAborted();

        const timeout = setTimeout(() => {
            resolve();
            signal.removeEventListener('abort', abort);
        }, duration);

        const abort = () => {
            clearTimeout(timeout);
            reject(signal.reason);
        }

        signal.addEventListener('abort', abort);
    });
}

export const SOCKET_EVENTS = {
    VISITOR_REGISTERED: "VISITOR_REGISTERED"
}

export const TotalVisitors = {
    id: 'totalVisitors',
    beforeDraw: (chart: Chart, _args: any, options: TotalVisitorsPluginOptions) => {
        const { ctx } = chart;
        const { text = "", fontSize = "14px", totalColor = "white" } = options;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.font = `${fontSize} Calibri`;
        ctx.fillStyle = "white";

        let x = 6;
        const idxColon = text.indexOf(":")
        for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i)!;

            if (i > idxColon) {
                ctx.fillStyle = totalColor;
            }
            ctx.fillText(ch, x, chart.height - 10);
            x += ctx.measureText(ch).width;
        }

        ctx.restore();
    }
};