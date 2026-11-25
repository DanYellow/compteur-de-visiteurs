import type { NextFunction, Request, Response } from "express";
// import fs from "fs";
// import fsp from "fs/promises";
// import path from "path";

// const normalizeIp = (ip: string) =>
//     ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;

// const filePath = path.join(process.cwd(), 'whitelist-ip.tmp.txt');

// let whitelistIp = await fsp.readFile(filePath, 'utf-8');

// fs.watchFile(filePath, { interval: 500 }, async (curr, prev) => {
//     if (curr.mtime !== prev.mtime) {
//         whitelistIp = await fsp.readFile(filePath, 'utf-8');
//     }
// });

export const checkIpAdress = (req: Request, res: Response, next: NextFunction) => {
    return next();
    // const userIp = normalizeIp(req.ip!);

    // if (process.env.NODE_ENV === "development") {
    //     return next();
    // }

    // const listAllowedIPs = new Set((whitelistIp || "").split(/[,\n]/).map((item) => item.trim()));

    // if (!listAllowedIPs.has(userIp)) {
    //     return res.status(403).render("pages/not-allowed.njk", {
    //         ip: userIp
    //     });
    // }

    // next();
}
