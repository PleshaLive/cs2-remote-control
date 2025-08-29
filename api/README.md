# API Directory

Эта папка содержит заглушки для API endpoints, которые GitHub Pages не может обрабатывать напрямую.

GSI Companion будет опрашивать URL типа:
`https://pleshalive.github.io/cs2-remote-control/api/{session}`

Но GitHub Pages - это статический хостинг, поэтому мы используем альтернативные подходы:

1. **GitHub Gist** - для хранения команд
2. **Firebase** - для реального времени  
3. **JSONBin.io** - для простого API

В онлайн контроллере команды сохраняются в одном из этих сервисов, а GSI Companion их получает по API.

## Текущий статус

✅ GSI Companion настроен на опрос: `https://pleshalive.github.io/cs2-remote-control/api/{session}`

✅ Онлайн контроллер отправляет команды через:
- GitHub Gist API (основной)
- Firebase Realtime Database (альтернативный)
- LocalStorage (локальное тестирование)

## Для пользователей

Просто откройте контроллер и используйте:
https://pleshalive.github.io/cs2-remote-control/

GSI Companion автоматически получит команды!
