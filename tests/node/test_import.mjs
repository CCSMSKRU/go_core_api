/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev,
 * With possible, negligent participation of  claude.ai  and/or ChatGPT
 * Copyright (c) 2026.
 * Powered by GoCore (go-core.com)
 */

import { initGoCoreQuery } from '../../dist/index.js';

console.log('Testing Node.js (ESM) import...');
if (typeof initGoCoreQuery === 'function') {
    console.log('SUCCESS: initGoCoreQuery is a function');
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
        console.log('Instance creation failed:', e.message);
    }
} else {
    console.error('FAILED: initGoCoreQuery is', typeof initGoCoreQuery);
    process.exit(1);
}
