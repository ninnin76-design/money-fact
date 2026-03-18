const Metro = require('metro');
const path = require('path');
const fs = require('fs');

async function buildBundle() {
    const root = process.cwd();
    console.log('Starting MasterKey Bundle Build at:', root);

    const config = await Metro.loadConfig();

    // [코다리 부장] 윈도우 경로 잘림 버그를 피해갈 수 있도록 
    // 프로젝트 루트와 모든 폴더를 절대 경로로 강제 주입합니다!
    config.projectRoot = root;
    config.watchFolders = [root];

    const bundleOptions = {
        entryFile: 'index.js',
        platform: 'android',
        dev: false,
        minify: true,
        out: path.join(root, 'android/app/src/main/assets/index.android.bundle')
    };

    try {
        console.log('Building bundle to:', bundleOptions.out);
        // assets 폴더가 없을 수도 있으니 미리 만들어 둡니다.
        const assetsDir = path.dirname(bundleOptions.out);
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        await Metro.runBuild(config, bundleOptions);
        console.log('BUILD SUCCESS!!! 코다리 부장이 해냈습니다! 🥂');
    } catch (err) {
        console.error('Build Error:', err);
        process.exit(1);
    }
}

buildBundle();
