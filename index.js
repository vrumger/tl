const fs = require('fs/promises');
const path = require('path');
const fetch = require('node-fetch');

const SCHEMES_DIR = 'schemes';
const RAW_SCHEME =
    'https://raw.githubusercontent.com/telegramdesktop/tdesktop/dev/Telegram/Resources/tl/api.tl';

const fileExists = async file => {
    try {
        const stat = await fs.stat(file);
        if (stat.isFile()) {
            return true;
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }

    return false;
};

const sortSchemes = schemes => {
    return schemes.sort((a, b) => {
        const [, aN = 0] = a.slice(0, -3).split('-');
        const [, bN = 0] = b.slice(0, -3).split('-');
        return Number(aN) - Number(bN);
    });
};

const main = async () => {
    const request = await fetch(RAW_SCHEME);
    const scheme = await request.text();

    try {
        await fs.stat(SCHEMES_DIR);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(SCHEMES_DIR, { recursive: true });
        } else {
            throw error;
        }
    }

    let [, layer] = scheme.match(/^\/\/ LAYER (\d+)$/m);
    if (!layer) {
        console.error('Unknown layer');
        process.exit(1);
    } else if (isNaN(layer)) {
        console.error('Invalid layer:', layer);
        process.exit(1);
    }

    let schemeFilePath = path.join(SCHEMES_DIR, `${layer}.tl`);
    if (await fileExists(schemeFilePath)) {
        const previousSchemes = sortSchemes(
            (await fs.readdir(SCHEMES_DIR)).filter(
                file => file === `${layer}.tl` || file.startsWith(`${layer}-`),
            ),
        );

        const oldFile = await fs.readFile(
            path.join(SCHEMES_DIR, previousSchemes.pop()),
            { encoding: 'utf-8' },
        );

        if (oldFile === scheme) {
            console.log("Scheme hasn't changed");
            return;
        }

        let count = 1;
        while (await fileExists(schemeFilePath)) {
            schemeFilePath = path.join(SCHEMES_DIR, `${layer}-${count}.tl`);
            count++;
        }
    }

    await fs.writeFile(schemeFilePath, scheme);
    await fs.writeFile(path.join(SCHEMES_DIR, 'latest.tl'), scheme);

    const files = await fs.readdir(SCHEMES_DIR);
    const allJson = files
        .filter(file => file !== 'all.json')
        .reduce((all, file) => {
            if (file === 'latest.tl') {
                return all;
            }

            const [baseLayer, layerVersion = 0] = file.slice(0, -3).split('-');
            if (!(baseLayer in all)) {
                all[baseLayer] = [];
            }

            if (layerVersion === 0) {
                all[baseLayer].unshift(file);
            } else {
                all[baseLayer].push(file);
            }

            return all;
        }, {});

    await fs.writeFile(
        path.join(SCHEMES_DIR, 'all.json'),
        JSON.stringify(allJson, null, 2),
    );
};

main().catch(error => {
    console.error(error);
    process.exit(1);
});
