import express from 'express';
import { loadEnvFile } from 'node:process';
import { DateTime } from 'luxon';
import nunjucks from 'nunjucks';

import { renderEmail } from '#server/utils.server';

loadEnvFile(`${process.cwd()}/.env.local`);

const router = express.Router();

router.get('/', async (_, res) => {
    const listRoutes = router.stack.map((item) => {
        return item.route!.path;
    })

    res.render("emails/index.njk", {
        list_routes: listRoutes,
    });
});

router.get('/passkey', async (req, res) => {
    const activationLink = `${req.protocol}://${req.get(
        'host'
    )}/passkey/activation/`;
    if ('text' in req.query) {
        return res.send(
            nunjucks.render('emails/new-passkey.txt.njk', {
                date: DateTime.now().toFormat("dd/LL/yyyy 'à' HH:mm"),
                activation_link: activationLink,
            })
        );
    }

    return res.send(
        renderEmail('emails/new-passkey.njk', {
            date: DateTime.now().toFormat("dd/LL/yyyy 'à' HH:mm"),
            activation_link: activationLink,
            nom: 'Thomas',
            prenom: 'Marc',
            host_path: `${req.protocol}://${req.get('host')}`,
        })
    );
});

router.get('/changement-mdp', async (req, res) => {
    const activationLink = `${req.protocol}://${req.get(
        'host'
    )}/passkey/activation/`;

    if ('text' in req.query) {
        return res.send(
            nunjucks.render('emails/new-password.txt.njk', {
                date: DateTime.now().toFormat("dd/LL/yyyy 'à' HH:mm"),
                activation_link: activationLink,
            })
        );
    }
    return res.send(
        renderEmail('emails/new-password.njk', {
            date: DateTime.now().toFormat("dd/LL/yyyy 'à' HH:mm"),
            activation_link: activationLink,
            nom: 'Thomas',
            prenom: 'Marc',
            host_path: `${req.protocol}://${req.get('host')}`,
        })
    );
});

router.get('/approbation', async (req, res) => {
    const activationLink = `${req.protocol}://${req.get(
        'host'
    )}/passkey/approbation/`;

    if ('text' in req.query) {
        return res.send(
            nunjucks.render('emails/user-approved.txt.njk', {
                date: DateTime.now().toFormat("dd/LL/yyyy 'à' HH:mm"),
                activation_link: activationLink,
            })
        );
    }
    return res.send(
        renderEmail('emails/user-approved.njk', {
            date: DateTime.now().toFormat("dd/LL/yyyy 'à' HH:mm"),
            activation_link: activationLink,
            nom: 'Thomas',
            prenom: 'Marc',
            host_path: `${req.protocol}://${req.get('host')}`,
        })
    );
});

export default router;
