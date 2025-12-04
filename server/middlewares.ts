import type { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";

export const authenticateMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
        next();
    } else {
        next();
        // res.sendStatus(401);
    }
};

export const parseManifest = async (manifest: string) => {
    if (process.env.NODE_ENV !== "production") {
        return {};
    }

    const manifestPath = path.join(
        path.resolve(),
        "dist",
        manifest
    );

    const manifestFile = await fs.readFile(manifestPath);

    return JSON.parse(manifestFile.toString());
};
