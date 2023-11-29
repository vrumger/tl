const fs = require('fs/promises');
const path = require('path');
const { default: simpleGit } = require('simple-git');

const SCHEMES_DIR = 'schemes';

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
    return schemes.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
    );
};

const checkCommit = async () => {
    const scheme = await fs.readFile(
        '/tmp/tdesktop/Telegram/SourceFiles/mtproto/scheme/api.tl',
        'utf-8',
    );
    const layerFile = await fs.readFile(
        '/tmp/tdesktop/Telegram/SourceFiles/mtproto/scheme/layer.tl',
        'utf-8',
    );

    let [, layer = 'unknown'] = layerFile.match(/^\/\/ LAYER (\d+)$/m) || [];

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
    await fs.writeFile(
        path.join(SCHEMES_DIR, 'layer.json'),
        JSON.stringify({ layer, file: schemeFilePath }),
    );
};

const updateAllJson = async () => {
    const files = sortSchemes(await fs.readdir(SCHEMES_DIR));
    const allJson = files
        .filter(file => file !== 'all.json' && file !== 'layer.json')
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

const main = async () => {
    let git = simpleGit();
    await git.clone(
        'https://github.com/telegramdesktop/tdesktop',
        '/tmp/tdesktop',
    );

    git = simpleGit('/tmp/tdesktop');

    const lastCommit = await fs.readFile('last-commit.txt', 'utf-8');

    await git.checkout('dev');
    const commits = await git.raw(
        'log',
        '--reverse',
        `${lastCommit}...HEAD`,
        '--pretty=format:%H',
        '--',
        'Telegram/SourceFiles/mtproto/scheme/',
    );

    if (!commits) {
        console.log('No new commits');
        return;
    }

    for (const commit of commits.split('\n')) {
        console.log('Checking commit', commit);
        await git.checkout(commit);
        await checkCommit();
        await fs.writeFile('last-commit.txt', commit);
    }

    await updateAllJson();
};

main().catch(error => {
    console.error(error);
    process.exit(1);
});
