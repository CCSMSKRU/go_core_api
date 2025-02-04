if (typeof window === 'object' && window) {
    console.log('IS_WINDOW');
}
else {
    console.log('NO WINDOW');
}
/**

 Доработали установку токена в сторадж при успешной авторизации.
 Прокинули возможность задавать условия и поле при инифциализации (loginCommand loginObject loginTokenFieldName skipSetTokenOnLogin).

 Переделали ответ функции init (основной). Теперь это объект а не сама функция api! У него два поля: api:fn и instance сам класс.

 */ 
