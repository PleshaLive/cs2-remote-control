# Firebase Setup Guide для CS2 Remote Control

## 📋 Пошаговая настройка Firebase

### 1. Создание проекта Firebase
1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Нажмите "Add project" или "Добавить проект"
3. Введите название проекта: `cs2-remote-control`
4. Отключите Google Analytics (не нужен для этого проекта)
5. Нажмите "Create project"

### 2. Настройка Realtime Database
1. В консоли Firebase выберите **Realtime Database** в левом меню
2. Нажмите "Create Database"
3. Выберите регион (желательно ближе к вам, например Europe)
4. Выберите режим безопасности: **"Start in test mode"** (можно изменить позже)
5. База данных будет создана с URL типа: `https://your-project-default-rtdb.europe-west1.firebasedatabase.app/`

### 3. Регистрация веб-приложения
1. В консоли Firebase нажмите на иконку `</>` (веб)
2. Введите nickname для приложения: `cs2-remote-controller`
3. **НЕ ставьте галочку** "Firebase Hosting" (мы используем другой хостинг)
4. Нажмите "Register app"
5. Скопируйте конфигурацию JavaScript

### 4. Настройка файлов
Откройте файл `firebase-script.js` и замените конфигурацию:

```javascript
const firebaseConfig = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ваш-проект.firebaseapp.com",
    databaseURL: "https://ваш-проект-default-rtdb.region.firebasedatabase.app/",
    projectId: "ваш-проект-id",
    storageBucket: "ваш-проект.appspot.com",
    messagingSenderId: "ваш-sender-id",
    appId: "ваш-app-id"
};
```

### 5. Настройка правил безопасности (опционально)
В Realtime Database → Rules замените на:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".write": "auth == null",
        ".read": "auth == null",
        ".indexOn": "timestamp"
      }
    }
  }
}
```

### 6. Деплой на GitHub Pages

#### A. Создание репозитория
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/cs2-remote-control.git
git push -u origin main
```

#### B. Активация GitHub Pages
1. В репозитории перейдите в Settings
2. Прокрутите до раздела "Pages"
3. В Source выберите "Deploy from a branch"
4. Выберите ветку `main` и папку `/ (root)`
5. Нажмите Save

Сайт будет доступен по адресу: `https://USERNAME.github.io/cs2-remote-control/firebase.html`

### 7. Настройка в CS2 GSI Companion
1. Откройте веб-интерфейс GSI Companion: `http://localhost:2828`
2. В разделе "Connection Settings" найдите поле "Remote Controller URL"
3. Введите URL вашего Firebase Database API:
   ```
   https://ваш-проект-default-rtdb.region.firebasedatabase.app/sessions/{session}/commands.json
   ```
4. Сохраните настройки

### 8. Тестирование

1. **Откройте онлайн-контроллер**: `https://USERNAME.github.io/cs2-remote-control/firebase.html`
2. **Скопируйте Session ID** из интерфейса
3. **Проверьте в Firebase Console**:
   - Зайдите в Realtime Database
   - Убедитесь, что создался узел `sessions/your-session-id`
4. **Запустите GSI Companion** с настроенным Remote URL
5. **Нажмите любую кнопку** в онлайн-контроллере
6. **Проверьте статус**: должен изменится на "🟢 Подключен"

## 🔧 Альтернативные варианты деплоя

### Netlify
```bash
# Создайте build folder
mkdir build
cp firebase.html build/index.html
cp firebase-script.js build/
cp style.css build/

# Задеплойте через Netlify CLI или веб-интерфейс
```

### Vercel
```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/",
      "destination": "/firebase.html"
    }
  ]
}
```

### Firebase Hosting (если хотите всё в одном месте)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📊 Monitoring и отладка

### Firebase Console
- **Realtime Database** → Data: просмотр команд в реальном времени
- **Usage**: статистика использования API
- **Rules**: настройка доступа

### Browser DevTools
- Console: JavaScript ошибки и логи
- Network: запросы к Firebase API
- Application → Local Storage: session data

### GSI Companion Logs
Проверьте логи в консоли GSI Companion на наличие ошибок подключения к Firebase.

## 🚨 Troubleshooting

### Проблема: "Permission denied"
**Решение**: Проверьте правила безопасности в Firebase Console

### Проблема: CORS ошибки
**Решение**: Firebase автоматически настраивает CORS для веб-приложений

### Проблема: Команды не приходят в GSI
**Решение**: Убедитесь, что Remote Controller URL правильно настроен с placeholder `{session}`

### Проблема: Session не создается
**Решение**: Проверьте настройки Firebase конфигурации в firebase-script.js

## 📈 Мониторинг производительности

Firebase предоставляет встроенную аналитику:
- Количество подключений
- Частота команд
- Время отклика

Все данные доступны в Firebase Console → Analytics.

---

**🎯 Результат**: У вас будет полнофункциональный онлайн-контроллер с реальным временем, интегрированный с CS2 GSI Companion через Firebase!
