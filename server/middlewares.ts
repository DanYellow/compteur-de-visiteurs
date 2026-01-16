import type { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import jwt from "jsonwebtoken";

import { LIST_ROLES } from "#scripts/utils.shared";
import type { CustomSession, UserTokenData } from "#types";
import { flashMessageCookieOptions } from ".";
import { User as UserModel } from "#models/index";

export const requireRoleMiddleware = (role: string = "") => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (role === "") {
            return next();
        }

        const routeRoleWeight = LIST_ROLES.find((item) => item.value === role);
        if (!routeRoleWeight) {
            return res.redirect("/interdit");
        }

        try {
            const token = jwt.verify(req.cookies.token, String(process.env.JWT_SECRET)) as UserTokenData;
            const userRoleData = LIST_ROLES.find((item) => item.value === token.role);

            res.locals = {
                ...res.locals,
                user_role: userRoleData || {},
            }

            if (userRoleData && userRoleData.weight >= routeRoleWeight?.weight) {
                return next();
            } else {
                res.redirect("/interdit")
            }
        } catch (error) {
            res.cookie('flash_message', "not_logged", flashMessageCookieOptions);
            (req.session as CustomSession).return_to = req.originalUrl;

            res.redirect("/connexion")

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

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = jwt.verify(req.cookies.token, String(process.env.JWT_SECRET)) as UserTokenData;
        const user = await UserModel.findByPk(token.id, {
            attributes: ['id', 'nom', 'email', 'prenom', "role", "actif"]
        });

        if (user && user.actif === true) {
            res.locals.current_user = user.toJSON();
            req.current_user = user.toJSON();
        } else {
            res.cookie('flash_message', "forced_logout", flashMessageCookieOptions)
            res.clearCookie("token");

            return res.redirect('/connexion');
        }
    } catch (error) {
        res.locals.current_user = null;
    }

    next();
}

export { checkIpAdress } from "#server/middlewares/check-ip";
