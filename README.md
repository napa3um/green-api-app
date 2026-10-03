# Запуск web-приложения

## Для локального запуска/разработки

Выполнить в терминале:
```bash
git clone git@github.com:napa3um/green-api-app.git
cd green-api-app
npm i
npm run dev
```

В появится что-то типа:
```
> green-api-app@1.0.0 dev
> vite

Re-optimizing dependencies because lockfile has changed

  VITE v5.4.21  ready in 110 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Открыть ссылку http://localhost:5173/

## Развёрнутое приложение

https://napa3um.github.io/green-api-app/

## Работа с приложением

Заполнить поля idInstance и apiTokenInstance, взятые из настроек инстанса Green-API, заполнить номер телефона абонента, с которым хотим переписываться, нажать кнопку "OK". Если номер валидный, то можно отправлять и получать сообщения.
