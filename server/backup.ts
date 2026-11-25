import path from "node:path";
import { exec } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";

import cron from "node-cron";

if (!process.env.FILE) {
    throw new Error("Missing db file");
}

const DB_PATH = path.resolve(path.resolve(), "database", process.env.FILE!);
const BACKUP_DIR = path.resolve(path.resolve(), "backups");

const execAsync = promisify(execCb);

await mkdir(BACKUP_DIR, { recursive: true });

const cleanup = async () => {
    await execAsync(`find ${BACKUP_DIR} -type f -mtime +7 -delete`);
}

const enableWAL = async () => {
    try {
        const { stdout } = await execAsync(
            `sqlite3 ${DB_PATH} "PRAGMA journal_mode=WAL;"`
        );

        console.log("📦 SQLite journal mode:", stdout.trim());
    } catch (err) {
        console.error("❌ Failed to enable WAL mode:", err);
    }
};

const runBackup = async () => {
    await cleanup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = `${BACKUP_DIR}/${timestamp}.tmp.sqlite`;

    const cmd = `sqlite3 ${DB_PATH} ".backup '${file}'"`;

    exec(cmd, (err, _stdout, _stderr) => {
        if (err) {
            console.error("❌ Backup failed:", err);
            return;
        }
        console.log(`✅ Backup created: ${file}`);
    });
}

await enableWAL();
await runBackup();

cron.schedule("0 0 * * 6", () => {
    console.log("⏰ Création du backup de la base de données...");

    runBackup();
});
