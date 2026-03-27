/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev,
 * With possible, negligent participation of  claude.ai  and/or ChatGPT
 * Copyright (c) 2026.
 * Powered by GoCore (go-core.com)
 */

/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Interactive Testing Script for go_core_api
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Простая функция для загрузки .env
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    } else {
        console.warn('Предупреждение: Файл .env не найден. Используются значения по умолчанию или .env.example');
    }
}

loadEnv();

const libPath = path.resolve(__dirname, '../dist/index.js');
let init;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));
const log = (msg) => console.log(`\n[TEST] ${msg}`);
const step = (msg) => console.log(`\x1b[36m\n>>> ${msg}\x1b[0m`);
const success = (msg) => console.log(`\x1b[32m\nSUCCESS: ${msg}\x1b[0m`);
const error = (msg) => console.log(`\x1b[31m\nERROR: ${msg}\x1b[0m`);

const getConfig = () => ({
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 8080,
    https: process.env.HTTPS === 'true',
    autoAuth: process.env.AUTO_AUTH === 'true',
    login: process.env.LOGIN || 'api_test',
    password: process.env.PASSWORD || 'api_test_password',
    token: process.env.TOKEN || '',
    useAJAX: process.env.USE_AJAX === 'true',
    debug: true,
    tryAuthCount: 3,
    tryAuthPause: 2000
});

async function runCommonTests(api, instance) {
    step('Тест User.getMe');
    try {
        const res = await api({ object: 'User', command: 'getMe' });
        log('Результат User.getMe:');
        console.log(res);
        if (res && !res.code) success('User.getMe выполнен успешно');
        else error('User.getMe вернул ошибку: ' + JSON.stringify(res));
    } catch (e) {
        error('Исключение в User.getMe: ' + e.message);
    }

    step('Тест User.logout');
    try {
        const res = await api({ object: 'User', command: 'logout' });
        log('Результат User.logout:');
        console.log(res);
        success('Запрос User.logout отправлен');
    } catch (e) {
        error('Исключение в User.logout: ' + e.message);
    }

    step('Тест User.login');
    try {
        const config = getConfig();
        const res = await api({
            object: 'User',
            command: 'login',
            params: { login: config.login, password: config.password }
        });
        log('Результат User.login:');
        console.log(res);
        if (res && !res.code) success('User.login выполнен успешно');
        else error('User.login вернул ошибку: ' + JSON.stringify(res));
    } catch (e) {
        error('Исключение в User.login: ' + e.message);
    }
}

async function testAJAX() {
    log('--- Тест режима AJAX ---');
    step('Убедитесь, что локальный сервер ВЫКЛЮЧЕН.');
    await question('Нажмите Enter, когда сервер будет выключен...');

    const config = getConfig();
    console.log(`[DEBUG] Подключение к ${config.https ? 'https' : 'http'}://${config.host}:${config.port}`);
    config.useAJAX = true;
    const { api, instance } = init(config);

    log('Запуск запроса при выключенном сервере (ожидаем попытки авторизации)...');
    const requestPromise = api({ object: 'test', command: 'ping' });

    step('Теперь ЗАПУСТИТЕ сервер.');
    await question('Нажмите Enter, когда сервер будет запущен...');

    try {
        const res = await requestPromise;
        success('AJAX запрос выполнен успешно!');
        console.log(res);

        await runCommonTests(api, instance);
    } catch (e) {
        error('Ошибка AJAX: ' + e.message);
    }
}

async function testWebSocket() {
    log('--- Тест режима WebSocket ---');
    step('Убедитесь, что локальный сервер ЗАПУЩЕН.');
    await question('Нажмите Enter, когда сервер будет запущен...');

    const config = getConfig();
    console.log(`[DEBUG] Подключение к ${config.https ? 'https' : 'http'}://${config.host}:${config.port}`);
    config.useAJAX = false;
    const { api, instance } = init(config);

    await instance.init();

    try {
        log('Выполняем первичный запрос...');
        await api({ object: 'test', command: 'ping' });
        success('Соединение установлено.');

        await runCommonTests(api, instance);

        step('Имитация разрыва соединения. ОСТАНОВИТЕ сервер.');
        await question('Нажмите Enter, когда сервер будет остановлен...');

        log('Запрос при выключенном сервере (ожидаем ошибку или ожидание)...');
        api({ object: 'test', command: 'ping' }).catch(err => log('Ожидаемая ошибка при разрыве.'));

        step('Восстановление. ЗАПУСТИТЕ сервер.');
        await question('Нажмите Enter, когда сервер будет запущен...');
        log('Ждем 3 секунды для реконнекта...');
        await new Promise(r => setTimeout(r, 3000));

        const res = await api({ object: 'test', command: 'ping' });
        success('Запрос после восстановления успешен!');

        step('Тест серверного события LOGOUT.');
        log('Сейчас библиотека ожидает событие "logout" от сервера.');
        log('Пожалуйста, удалите сессию этого пользователя в админ-панели сервера или через БД.');

        instance.socket.once('logout', () => {
            success('Событие LOGOUT получено от сервера!');
            log('Библиотека должна начать переавторизацию...');
        });

        await question('Нажмите Enter после того, как "убьете" сессию на сервере (или для пропуска)...');

        log('Пробуем выполнить запрос после предполагаемого logout...');
        const res2 = await api({ object: 'User', command: 'getMe' });
        console.log('Результат после logout/auth:', res2);

    } catch (e) {
        error('Ошибка WS: ' + e.message);
    }
}

async function main() {
    console.log('\x1b[1m--- Интерактивное тестирование go_core_api ---\x1b[0m');

    // Проверка .env
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        step('.env файл не найден. Копирую из .env.example...');
        const examplePath = path.resolve(process.cwd(), '.env.example');
        if (fs.existsSync(examplePath)) {
            fs.copyFileSync(examplePath, envPath);
            log('.env создан. Пожалуйста, проверьте и заполните его корректными данными.');
        } else {
            error('.env.example не найден. Создайте .env вручную.');
        }
        await question('Нажмите Enter, когда .env будет заполнен...');
        loadEnv(); // Перезагружаем переменные окружения
    }

    step('Выбор среды окружения...');
    console.log('1 - Browser (откройте src/index.html в браузере)');
    console.log('2 - Node.js (нативное окружение)');
    const envChoice = await question('Выберите вариант (по умолчанию 2): ') || '2';

    if (envChoice === '1') {
        log('Для тестирования в браузере:');
        log('1. Убедитесь, что выполнили "npm run build".');
        log('2. Откройте файл src/index.html в вашем браузере.');
        log('3. Следуйте инструкциям в консоли браузера.');
        log(`\nПуть к файлу: ${path.resolve(__dirname, '../src/index.html')}`);

        await question('\nНажмите Enter, чтобы выйти из этого скрипта...');
        process.exit(0);
    }

    step('Проверка сборки библиотеки...');
    log('Убедитесь, что вы выполнили "npm run buildNode".');
    await question('Нажмите Enter, когда сборка будет готова...');

    // Переинициализируем загрузку библиотеки после подтверждения сборки
    try {
        log('Используется нативное Node.js окружение.');
        
        const lib = require(libPath);
        init = lib.default || lib.initGoCoreQuery || lib;
    } catch (e) {
        error('Ошибка: Не удалось загрузить библиотеку из dist/index.js.');
        error(e.stack || e.message);
        process.exit(1);
    }

    console.log('Конфигурация загружена из .env (или используются значения по умолчанию):');
    const currentConfig = getConfig();
    console.log(`  HOST: ${currentConfig.host}`);
    console.log(`  PORT: ${currentConfig.port}`);
    console.log(`  HTTPS: ${currentConfig.https}`);
    console.log(`  LOGIN: ${currentConfig.login}`);
    console.log(`  USE_AJAX: ${currentConfig.useAJAX}`);
    console.log('-----------------------------------------------------------------------');

    while (true) {
        console.log('\nДоступные тесты:');
        console.log('1 - AJAX (сценарий с ожиданием запуска сервера)');
        console.log('2 - WebSocket (сценарий с разрывом и logout)');
        console.log('q - Выход');

        const mode = await question('\nВыберите вариант: ');

        if (mode === '1') {
            await testAJAX();
        } else if (mode === '2') {
            await testWebSocket();
        } else if (mode === 'q') {
            break;
        } else {
            console.log('Неверный выбор.');
        }
    }

    log('Тестирование завершено.');
    rl.close();
    process.exit(0);
}

main();
