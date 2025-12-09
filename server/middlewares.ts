import type { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import jwt from "jsonwebtoken";

import { LIST_ROLES } from "#scripts/utils.shared.ts";
import type { UserToken } from "#types";

export const requireRoleMiddleware = (role: string = "") => {
    return function (req: Request, res: Response, next: NextFunction) {
        if (role === "") {
            return next();
        }

        const routeRoleWeight = LIST_ROLES.find((item) => item.value === role);
        if (!routeRoleWeight) {
            return res.redirect("/interdit");
        }

        try {
            const userToken = jwt.verify(req.cookies.token, String(process.env.JWT_SECRET)) as UserToken;
            const userRole = LIST_ROLES.find((item) => item.value === userToken.role);

            res.locals = {
                ...res.locals,
                user_role: userRole || {},
            }

            if (userRole && userRole.weight >= routeRoleWeight?.weight) {
                return next();
            } else {
                res.redirect("/interdit")
            }
        } catch (error) {
            //         if (req.user?.role !== role) {
            res.redirect("/interdit")
            console.log("error", error)
        }
    };
};

export const parseManifest = async (manifest: string) => {
    if (process.env.NODE_ENV !== "production") {
        return {};
    }

    const manifestPath = path.join(path.resolve(), "dist", manifest);
    const manifestFile = await fs.readFile(manifestPath);

    return JSON.parse(manifestFile.toString());
};
