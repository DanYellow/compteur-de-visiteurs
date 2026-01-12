import type { TotalVisitorsPluginOptions } from "#types";
import type { Chart } from "chart.js";
import { listGenders as _listGenders, listAgeGroups as _listAgeGroups, listDepartments as _listDepartments } from "./utils.shared";

export const loadImage = (obj: HTMLImageElement) => {
    return new Promise((resolve, reject) => {
        obj.onload = () => resolve(obj);
        obj.onerror = reject;
    });
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

const barOpacity = 40;

const genderColors: {[key: string]: string} = {
    0: window.getComputedStyle(document.body).getPropertyValue(`--color-sky-300`),
    1: window.getComputedStyle(document.body).getPropertyValue(`--color-pink-300`),
    2: window.getComputedStyle(document.body).getPropertyValue(`--color-gray-300`),
}

export const listGenders = _listGenders.map((item) => {
    return {
        ...item,
        color: `rgb(from ${genderColors[item.value]} r g b / ${barOpacity}%)`,
        borderColor: genderColors[item.value],
    }
})

const ageGroupsColors: {[key: string]: string} = {
    0: window.getComputedStyle(document.body).getPropertyValue(`--color-blue-300`),
    1: window.getComputedStyle(document.body).getPropertyValue(`--color-red-300`),
    2: window.getComputedStyle(document.body).getPropertyValue(`--color-amber-300`),
    3: window.getComputedStyle(document.body).getPropertyValue(`--color-green-300`),
    4: window.getComputedStyle(document.body).getPropertyValue(`--color-gray-300`),
    5: window.getComputedStyle(document.body).getPropertyValue(`--color-orange-300`),
}

export const listAgeGroups = _listAgeGroups.map((item) => {
    return {
        ...item,
        color: `rgb(from ${ageGroupsColors[item.value]} r g b / ${barOpacity}%)`,
        borderColor: ageGroupsColors[item.value],
    }
})

const departmentColors: {[key: string]: string} = {
    75: window.getComputedStyle(document.body).getPropertyValue(`--color-blue-300`),
    77: window.getComputedStyle(document.body).getPropertyValue(`--color-red-300`),
    78: window.getComputedStyle(document.body).getPropertyValue(`--color-indigo-300`),
    91: window.getComputedStyle(document.body).getPropertyValue(`--color-pink-300`),
    92: window.getComputedStyle(document.body).getPropertyValue(`--color-amber-300`),
    93: window.getComputedStyle(document.body).getPropertyValue(`--color-green-300`),
    94: window.getComputedStyle(document.body).getPropertyValue(`--color-gray-300`),
    95: window.getComputedStyle(document.body).getPropertyValue(`--color-orange-300`),
    99: window.getComputedStyle(document.body).getPropertyValue(`--color-teal-300`),
}

export const listDepartments = _listDepartments.map((item) => {
    return {
        ...item,
        color: `rgb(from ${departmentColors[item.value]} r g b / ${barOpacity}%)`,
        borderColor: departmentColors[item.value],
    }
})

const greenNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-green-numixs');
const whiteNumixs = window.getComputedStyle(document.body).getPropertyValue('--color-white-numixs');

export const listVisits = [{
    label: "Visites régulières",
    value: 0,
    color: `rgb(from ${greenNumixs} r g b / ${barOpacity}%)`,
    borderColor: greenNumixs,
}, {
    label: "Visites évènements",
    value: 1,
    color: `rgb(from ${whiteNumixs} r g b / ${barOpacity}%)`,
    borderColor: whiteNumixs,
}]
