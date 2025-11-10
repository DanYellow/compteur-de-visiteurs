import fs from 'node:fs/promises';

const envFile = ".env.local";
if (process.env.NODE_ENV === "development") {

}

try {
    const data = await fs.readFile(envFile, { encoding: "utf8" });
    const fileContent = data.split('\n').filter(Boolean);
    const result = {}
    fileContent.forEach((item) => {
        const [key, value] = item.split("=");
        const [nocomment] = value.split("#");

        result[key] = nocomment.trim();
    })

    await fs.writeFile('./config.local.json', JSON.stringify(result));
} catch (err) {
    console.error(err);
}
