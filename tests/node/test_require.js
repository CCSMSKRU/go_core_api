/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev,
 * With possible, negligent participation of  claude.ai  and/or ChatGPT
 * Copyright (c) 2026.
 * Powered by GoCore (go-core.com)
 */

const { initGoCoreQuery } = require('../../dist/index.node.js');

async function runTest() {
    console.log('Testing Node.js (CJS) require...');
    if (typeof initGoCoreQuery === 'function') {
        console.log('SUCCESS: initGoCoreQuery is a function');
        // Можно попробовать вызвать базовый метод, если он не требует сложной настройки
        try {
            const { instance } = initGoCoreQuery({
                address: 'localhost',
                port: 8080,
                useAJAX: true
            });
            console.log('SUCCESS: Instance created');
            if (instance && typeof instance.destroy === 'function') {
                await instance.destroy();
                console.log('SUCCESS: Instance destroyed');
            }
        } catch (e) {
            console.log('Instance creation failed (expected if config is missing):', e.message);
        }
    } else {
        console.error('FAILED: initGoCoreQuery is', typeof initGoCoreQuery);
        process.exit(1);
    }
}

runTest().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
