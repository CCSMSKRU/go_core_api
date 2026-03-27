/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev,
 * With possible, negligent participation of  claude.ai  and/or ChatGPT
 * Copyright (c) 2026.
 * Powered by GoCore (go-core.com)
 */

(function() {
    const log = (msg) => console.log(`%c[TEST] ${msg}`, 'color: #36a2eb; font-weight: bold;');
    const success = (msg) => console.log(`%cSUCCESS: ${msg}`, 'color: #4bc0c0; font-weight: bold;');
    const error = (msg) => console.log(`%cERROR: ${msg}`, 'color: #ff6384; font-weight: bold;');
    const step = (msg) => console.log(`%c>>> ${msg}`, 'color: #ff9f40; font-weight: bold;');

    window.runTest = async function(config) {
        if (!window.initGoCoreQuery) {
            error('Библиотека initGoCoreQuery не найдена! Убедитесь, что dist/index.js подключен.');
            return;
        }

        debugger;

        const { api, instance } = window.initGoCoreQuery(config);

        console.log('Конфигурация:', config);

        const mode = config.useAJAX ? 'AJAX' : 'WebSocket';
        log(`--- Запуск теста в режиме ${mode} ---`);

        if (config.useAJAX) {
            await runAJAXTest(api, instance);
        } else {
            await runWSTest(api, instance);
        }
    };

    async function runAJAXTest(api, instance) {
        step('Убедитесь, что локальный сервер ВЫКЛЮЧЕН.');
        console.log('Введите runNext() в консоли, когда сервер будет выключен...');
        await waitNext();

        log('Запуск запроса при выключенном сервере (ожидаем попытки авторизации)...');
        const requestPromise = api({ object: 'test', command: 'ping' });

        step('Теперь ЗАПУСТИТЕ сервер.');
        console.log('Введите runNext() в консоли, когда сервер будет запущен...');
        await waitNext();

        try {
            const res = await requestPromise;
            success('AJAX запрос выполнен успешно!');
            console.log(res);
            await runCommonTests(api, instance);
        } catch (e) {
            error('Ошибка AJAX: ' + e.message);
        }
    }

    async function runWSTest(api, instance) {
        step('Убедитесь, что локальный сервер ЗАПУЩЕН.');
        console.log('Введите runNext() в консоли, когда сервер будет запущен...');
        await waitNext();

        try {
            log('Инициализация соединения...');
            await instance.init();

            log('Выполняем первичный запрос...');
            await api({ object: 'test', command: 'ping' });
            success('Соединение установлено.');

            await runCommonTests(api, instance);

            step('Имитация разрыва соединения. ОСТАНОВИТЕ сервер.');
            console.log('Введите runNext() в консоли, когда сервер будет остановлен...');
            await waitNext();

            log('Запрос при выключенном сервере (ожидаем ошибку или ожидание)...');
            api({ object: 'test', command: 'ping' }).catch(err => log('Ожидаемая ошибка при разрыве.'));

            step('Восстановление. ЗАПУСТИТЕ сервер.');
            console.log('Введите runNext() в консоли, когда сервер будет запущен...');
            await waitNext();

            log('Ждем 3 секунды для реконнекта...');
            await new Promise(r => setTimeout(r, 3000));

            const res = await api({ object: 'test', command: 'ping' });
            success('Запрос после восстановления успешен!');

        } catch (e) {
            error('Ошибка WS: ' + e.message);
        }
    }

    async function runCommonTests(api, instance) {
        step('Тест User.getMe');
        try {
            const res = await api({ object: 'User', command: 'getMe' });
            log('Результат User.getMe:');
            console.log(res);
            if (res && !res.code) success('User.getMe выполнен успешно');
            else error('User.getMe вернул ошибку');
        } catch (e) {
            error('Исключение в User.getMe: ' + e.message);
        }
    }

    let nextResolver = null;
    window.runNext = function() {
        if (nextResolver) {
            const res = nextResolver;
            nextResolver = null;
            res();
        } else {
            console.warn('Ожидание действий не активно.');
        }
    };

    function waitNext() {
        return new Promise(resolve => {
            nextResolver = resolve;
        });
    }

    console.log('%cИнтерактивный тест загружен!', 'color: green; font-size: 14px; font-weight: bold;');
    console.log('Доступные команды:');
    console.log('1. runTest({host: "127.0.0.1", port: 8071, https: false, useAJAX: false, login: "admin", password: "123"}) - запустить тест (WS)');
    console.log('2. runTest({host: "127.0.0.1", port: 8071, https: false, useAJAX: true, login: "admin", password: "123"}) - запустить тест (AJAX)');
    console.log('3. runNext() - подтвердить выполнение действия (запуск/остановка сервера)');
})();
