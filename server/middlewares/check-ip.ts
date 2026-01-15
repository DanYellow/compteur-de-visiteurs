import type { NextFunction, Request, Response } from "express";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeIp = (ip: string) =>
    ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;

const filePath = path.join(__dirname, '..', '..', './whitelist-ip.tmp.txt');

let whitelistIp = await fs.readFile(filePath, 'utf-8');
let reloadTimeout: NodeJS.Timeout | null = null;

async function reloadWhitelist() {
    try {
        whitelistIp = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
        console.error('Error reading file:', err);
    }
}

(async () => {
    const watcher = fs.watch(filePath)
    for await (const event of watcher) {
        if (event.eventType !== 'change') continue;
        if (reloadTimeout) clearTimeout(reloadTimeout);

        reloadTimeout = setTimeout(() => {
            reloadWhitelist();
        }, 300)
    }
})()

export const checkIpAdress = (req: Request, res: Response, next: NextFunction) => {
    const userIp = normalizeIp(req.ip!);

    if (process.env.NODE_ENV === "development") {
        return next();
    }

    const listAllowedIPs = new Set((whitelistIp || "").split(/[,\n]/).map((item) => item.trim()));

    if (!listAllowedIPs.has(userIp)) {
        return res.status(403).render("pages/not-allowed.njk", {
            ip: userIp
        });
    }

    next();
}
