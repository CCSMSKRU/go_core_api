# ccs.go_core_query

Пакет для подключения к ядру GoCore через сокеты или обычные HTTP(S) запросы.
Работает в различных средах: браузер (современный и устаревший), Node.js (CommonJS и ESM).

## Установка

```sh
npm i go_core_query --save
```

## Поддерживаемые среды и форматы

Библиотека поставляется в нескольких форматах для обеспечения максимальной совместимости:

| Формат | Файл | Среда использования | Метод подключения |
| :--- | :--- | :--- | :--- |
| **ESM (Browser)** | `dist/index.js` | Современные браузеры, React, Vue, Vite, Webpack | `import { initGoCoreQuery } from 'go_core_query'` |
| **Node.js (CJS)** | `dist/index.node.js` | Node.js (стандартный) | `const { initGoCoreQuery } = require('go_core_query')` |
| **Node.js (ESM)** | `dist/index.js` | Современный Node.js | `import { initGoCoreQuery } from 'go_core_query'` |
| **ES5 Legacy** | `dist/indexES5.js` | Устаревшие браузеры (IE11+), прямой импорт через `<script>` | `<script src=".../indexES5.js"></script>` |

---

## Использование

### 1. Современные браузеры (ESM / TypeScript / Bundlers)

Если вы используете Webpack, Vite, React или другой современный инструмент сборки:

```js
import { initGoCoreQuery } from 'go_core_query';

const params = {
    host: 'localhost',
    port: 8080,
    https: true,
    // ... остальные параметры
};

const goCoreQueryObj = initGoCoreQuery(params);
const { api, instance } = goCoreQueryObj; // В goCoreQueryObj также содержится instance

// Пример асинхронного вызова (api теперь async)
const res = await api({ command: 'ping' });
console.log('Response:', res);
```

### 2. Node.js

#### CommonJS (require)
```js
const { initGoCoreQuery } = require('go_core_query');
// ... использование аналогично браузерному (через async/await или .then())
```

#### ESM (import)
В `package.json` вашего проекта должен быть указан `"type": "module"`.
```js
import { initGoCoreQuery } from 'go_core_query';
// ... использование аналогично браузерному (через async/await)
```

### 3. Использование через `<script>` (Legacy / ES5)

Для подключения напрямую в HTML-файл без сборщика:

```html
<!-- Подключаем бандл. Он экспортирует глобальную функцию initGoCoreQuery -->
<script src="node_modules/go_core_query/dist/indexES5.js"></script>

<script>
    const params = {
        host: 'localhost',
        port: 8080,
        https: false,
        afterInitConnect: (socket) => {
            console.log('Connected!');
        }
    };

    const goCoreQueryObj = initGoCoreQuery(params); // В goCoreQueryObj также содержится instance
    const api = goCoreQueryObj.api;
    
    // Теперь можно делать запросы (поддерживается как Promise, так и Callback)
    api({ command: 'ping' }).then(function(res) {
        console.log('Response (Promise):', res);
    });

    // Или старый способ через callback
    api({ command: 'ping' }, function(res) {
        console.log('Response (Callback):', res);
    });
</script>
```

---

## Параметры инициализации (QueryParams)

### Минимальный набор параметров

Для базового подключения достаточно указать только хост. Остальные параметры имеют значения по умолчанию, подходящие для большинства случаев.

```js
const params = {
    host: 'your-server.com', // Хост без протокола
    // По умолчанию: port: 443, https: true
};
```

### Полный список параметров

Ниже приведен полный список всех поддерживаемых параметров:

| Параметр | Тип | По умолчанию | Описание                                                                                                                                          |
| :--- | :--- | :--- |:--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Основные** | | |                                                                                                                                                   |
| `host` | `string` | `''` | Адрес сервера GoCore (без протокола, например: `localhost`)                                                                                       |
| `port` | `number \| string` | `443` или `80` | Порт сервера. По умолчанию 443 если `https: true`, иначе 80                                                                                       |
| `https` | `boolean` | `true` | Использовать ли SSL (HTTPS/WSS). Влияет на значение `port` по умолчанию                                                                           |
| `url` / `path` | `string` | `''` | Дополнительный путь к API                                                                                                                         |
| `lang` | `string` | `'en'` | Язык ответов от сервера (допустимые значения: `'ru'`, `'en'` и др.)                                                                                                   |
| **Авторизация** | | |                                                                                                                                                   |
| `autoAuth` | `boolean` | `false` | Автоматически пытаться авторизоваться при подключении. Использует `login` и `password`                                                            |
| `login` | `string` | `'api_test'` | Логин для автоматической авторизации (используется при `autoAuth: true`)                                                                          |
| `password` | `string` | `'api_test_password'` | Пароль для автоматической авторизации (используется при `autoAuth: true`)                                                                         |
| `token` | `string` | `undefined` | Предустановленный токен авторизации. Не требуется. Можно установить вручную, но тогда и следить за актуальностью надо самостоятельно              |
| `authFn` / `authFunction` | `function` | `undefined` | Callback, вызываемый если требуется авторизация (когда `autoAuth: false`). Происходит если сервер отправил logout, или очередной запрос вернул -4 |
| `tokenStorageKey` | `string` | `'CCSGoCoreToken'` | Ключ для хранения токена в `storage`                                                                                                              |
| `skipSetTokenOnLogin`| `boolean` | `undefined` | Не сохранять токен автоматически после успешного входа                                                                                            |
| `loginCommand` | `string` | `'login'` | Имя команды для выполнения логина                                                                                                                 |
| `loginObject` | `string` | `'user'` | Объект, к которому относится команда логина                                                                                                       |
| `loginTokenFieldName`| `string` | `'token'` | Имя поля в ответе сервера, содержащее токен                                                                                                       |
| **UUID и согласие (GDPR/Cookies)** | | |                                                                                                                                                   |
| `useUUID` | `boolean` | `undefined` | Использовать ли уникальный идентификатор устройства (UUID)                                                                                        |
| `useUUIDIgnoreAgree` | `boolean` | `undefined` | Использовать UUID без явного согласия пользователя (игнорируя `useUUIDAskAgreeFn`)                                                                |
| `useUUIDAskAgreeFn` | `function` | `undefined` | Функция для запроса согласия пользователя на использование UUID (если `useUUIDIgnoreAgree: false`)                                                |
| `uuidStorageKey` | `string` | `'goCoreUUID'` | Ключ для хранения UUID в `storage`                                                                                                                |
| `uuidAgreeStorageKey`| `string` | `'goCoreUUIDAgree'` | Ключ для хранения статуса согласия в `storage`                                                                                                    |
| `useUUIDIgnoreAgreeStorageKey` | `string` | `'goCoreUUIDIgnoreAgree'` | Ключ для хранения флага игнорирования согласия в `browserStorage`                                                                                 |
| **Настройки сети и Socket.io** | | |                                                                                                                                                   |
| `useAJAX` | `any` | `undefined` | Принудительное использование HTTP запросов вместо сокетов                                                                                         |
| `extraHeaders` | `any` | `undefined` | Дополнительные HTTP заголовки                                                                                                                     |
| `transports` | `string[]` | `undefined` | Список транспортов для Socket.io (например `['websocket', 'polling']`)                                                                            |
| `withCredentials` | `any` | `undefined` | Передавать ли cookies в CORS запросах                                                                                                             |
| `afterInitConnect` | `function` | `undefined` | Callback после успешного подключения сокета                                                                                                       |
| **Повторные попытки (Retry logic)** | | |                                                                                                                                                   |
| `tryAuthCount` | `number` | `10` | Количество попыток авторизации при неудаче                                                                                                        |
| `tryAuthPause` | `number` | `500` | Пауза между попытками авторизации (мс)                                                                                                            |
| `tryCount` | `number` | `10` | Количество попыток выполнения обычного запроса                                                                                                    |
| `tryPause` | `number` | `500` | Пауза между попытками запроса (мс)                                                                                                                |
| **Хранилище (Storage)** | | |                                                                                                                                                   |
| `browserStorage` | `string` | `'cookie'` | Тип хранилища в браузере. Допустимые значения: `'cookie'`, `'localStorage'`. Влияет на `tokenStorageKey`, `uuidStorageKey` и др.                  |
| `storeGetFn` | `function` | `undefined` | Кастомная функция получения данных (перекрывает стандартный `browserStorage`)                                                                     |
| `storeSetFn` | `function` | `undefined` | Кастомная функция сохранения данных (перекрывает стандартный `browserStorage`)                                                                    |
| **Отладка и прочее** | | |                                                                                                                                                   |
| `debug` | `boolean` | `undefined` | Включить базовый вывод логов в консоль                                                                                                            |
| `debugFull` | `boolean` | `undefined` | Включить подробный вывод всех логов (включая сетевой трафик)                                                                                      |
| `device_type` | `string` | `'WEB'` | Тип устройства, передаваемый на сервер (например: `'WEB', 'APP', 'API'`)                                                              |
| `device_info` | `any` | `undefined` | Дополнительная информация об устройстве                                                                                                           |
| `env` | `string` | `'browser'` | Среда выполнения. Допустимые значения: `'browser'`, `'node'`                                                                                      |
| `toMainFn` / `toMainFunction` | `function` | `undefined` | Callback для перенаправления на главную. Может быть отправлена с сервера.                                                                         |
| `doNotDeleteCollapseDataParam` | `any` | `undefined` | Не удалять параметры сжатия данных из ответа                                                                                                      |

Полный пример настройки можно найти в исходном коде или документации к ядру GoCore.

## Разработка и сборка

Если вы хотите собрать библиотеку самостоятельно:

- `npm run build:all` — собрать все версии (Browser, Node, ES5).
- `npm run build:browser` — только современная браузерная версия.
- `npm run build:node` — версия для Node.js.
- `npm run build:es5` — версия для старых браузеров с полифиллами.

## Contributing

Complex Cloud Solutions LLC

## License

ISC
