# Создание GitHub репозитория для онлайн контроллера

## 1. Создайте новый репозиторий на GitHub

1. Перейдите на https://github.com/new
2. Название: `cs2-remote-control`
3. Описание: `Online remote control for CS2 GSI Companion`
4. Публичный репозиторий
5. НЕ добавляйте README, .gitignore или лицензию (у нас уже есть файлы)

## 2. Загрузите файлы в репозиторий

```bash
# Перейдите в папку online-controller
cd "c:\projects\cs2-gsi-companion\cs2-gsi-companion-win32-x64\online-controller"

# Инициализируйте git репозиторий
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: CS2 Remote Control Online"

# Подключите к GitHub репозиторию (замените YOUR-USERNAME)
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/cs2-remote-control.git

# Загрузите код
git push -u origin main
```

## 3. Включите GitHub Pages

1. В репозитории перейдите в **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Нажмите **Save**

Через несколько минут ваш сайт будет доступен по адресу:
`https://YOUR-USERNAME.github.io/cs2-remote-control/`

## 4. Настройте GSI Companion

1. Откройте ваш онлайн контроллер по ссылке выше
2. Скопируйте Session URL из интерфейса
3. В GSI Companion откройте `http://localhost:2828/admin/streamdeck`
4. Вставьте URL в поле "Remote Controller URL"
5. Сохраните настройки

## 5. Тестирование

1. Нажмите кнопку "LIVE" в онлайн контроллере
2. В течение 2 секунд должна сработать кнопка 1/2/1 в Stream Deck
3. Статус должен изменится на "Подключен"

## Альтернативные хостинги

### Netlify
1. Перейдите на https://netlify.com
2. Drag & drop папку `online-controller` в Netlify
3. Получите URL вида `https://amazing-name-123456.netlify.app`

### Vercel
1. Установите CLI: `npm i -g vercel`
2. В папке online-controller: `vercel`
3. Следуйте инструкциям

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Кастомизация URL команд

Если используете другой хостинг, обновите в `script.js`:

```javascript
// Измените baseUrl для вашего домена
this.baseUrl = 'https://your-custom-domain.com';
```
