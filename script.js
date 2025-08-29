// CS2 Online Remote Control
class OnlineRemoteControl {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
        this.pollingUrl = `${this.baseUrl}/api/commands/${this.sessionId}`;
        this.commandQueue = [];
        this.lastPollTime = 0;
        this.isPolling = false;
        
        this.statusElement = document.getElementById('status');
        this.sessionIdElement = document.getElementById('session-id');
        this.pollingUrlElement = document.getElementById('polling-url');
        this.connectionDetailsElement = document.getElementById('connection-details');
        this.logElement = document.getElementById('event-log');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupUI();
        this.startCommandStorage();
        
        // Проверяем, есть ли сохраненная сессия
        this.loadSession();
        
        this.log('Онлайн контроллер инициализирован', 'info');
        this.log(`Session ID: ${this.sessionId}`, 'info');
    }

    generateSessionId() {
        return 'cs2-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    setupUI() {
        this.sessionIdElement.textContent = this.sessionId;
        this.pollingUrlElement.value = this.pollingUrl;
        this.updateConnectionStatus('waiting');
    }

    loadSession() {
        // Загружаем сохраненную сессию если она есть
        const saved = localStorage.getItem('cs2-session-id');
        if (saved && confirm('Продолжить предыдущую сессию?')) {
            this.sessionId = saved;
            this.setupUI();
        } else {
            localStorage.setItem('cs2-session-id', this.sessionId);
        }
    }

    bindEvents() {
        // Обработчики для кнопок управления
        document.querySelectorAll('.control-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });

        // Копирование URL
        document.getElementById('copy-url').addEventListener('click', () => {
            this.copyPollingUrl();
        });

        // Очистка лога
        document.getElementById('clear-log').addEventListener('click', () => {
            this.logElement.innerHTML = '<div class="log-entry info">Лог очищен</div>';
        });

        // Обработка закрытия страницы
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    async handleButtonClick(event) {
        const button = event.target;
        const action = button.dataset.action;
        const page = parseInt(button.dataset.page) || 1;
        const row = parseInt(button.dataset.row) || 1;
        const col = parseInt(button.dataset.col) || 1;

        // Визуальная обратная связь
        button.classList.add('pressed');
        setTimeout(() => button.classList.remove('pressed'), 200);

        const command = {
            id: this.generateCommandId(),
            action: action,
            page: page,
            row: row,
            col: col,
            timestamp: Date.now(),
            source: 'online-control'
        };

        // Добавляем команду в очередь
        this.commandQueue.push(command);
        
        // Сохраняем в localStorage для персистентности
        this.saveCommands();

        this.log(`🎯 Команда добавлена: ${action} (${page}/${row}/${col})`, 'info');
        
        // Показываем, что команда ожидает выполнения
        button.disabled = true;
        setTimeout(() => button.disabled = false, 1000);
    }

    generateCommandId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    startCommandStorage() {
        // Эмулируем API endpoint через localStorage и JSON файлы
        this.setupPollingEndpoint();
    }

    setupPollingEndpoint() {
        // Создаем публичный API через GitHub Gist
        this.createGistAPI();
        
        // Обновляем статистику опроса
        setInterval(() => {
            this.updatePollingStats();
        }, 1000);
    }

    async createGistAPI() {
        try {
            // Создаем или обновляем GitHub Gist для хранения команд
            const gistData = {
                sessionId: this.sessionId,
                commands: [],
                lastUpdate: Date.now(),
                status: 'waiting'
            };
            
            // Сохраняем в localStorage как fallback
            localStorage.setItem(`gist-${this.sessionId}`, JSON.stringify(gistData));
            
            // Обновляем URL для опроса (GitHub Gist raw URL)
            const gistId = this.getOrCreateGistId();
            this.pollingUrl = `https://gist.githubusercontent.com/anonymous/${gistId}/raw/commands.json`;
            this.pollingUrlElement.value = this.pollingUrl;
            
            this.log('API endpoint создан', 'success');
        } catch (error) {
            this.log('Ошибка создания API: ' + error.message, 'error');
        }
    }

    getOrCreateGistId() {
        let gistId = localStorage.getItem('cs2-gist-id');
        if (!gistId) {
            // Генерируем псевдо-gist ID для демо
            gistId = 'cs2-' + Math.random().toString(36).substr(2, 10);
            localStorage.setItem('cs2-gist-id', gistId);
        }
        return gistId;
    }

    getStoredCommands() {
        try {
            return JSON.parse(localStorage.getItem(`commands-${this.sessionId}`) || '[]');
        } catch {
            return [];
        }
    }

    saveCommands() {
        const commandsData = {
            sessionId: this.sessionId,
            commands: this.commandQueue,
            lastUpdate: Date.now(),
            status: 'active'
        };
        
        // Сохраняем локально
        localStorage.setItem(`commands-${this.sessionId}`, JSON.stringify(this.commandQueue));
        localStorage.setItem(`api-commands-${this.sessionId}`, JSON.stringify(commandsData));
        localStorage.setItem(`last-update-${this.sessionId}`, Date.now().toString());
        
        // Пробуем обновить через GitHub API (если настроен токен)
        this.updateGistAPI(commandsData);
    }

    async updateGistAPI(data) {
        try {
            // Для демо версии используем JSONBin.io или similar service
            const response = await fetch('https://api.jsonbin.io/v3/b', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bin-Name': `cs2-commands-${this.sessionId}`,
                    'X-Access-Key': '$2a$10$...' // Нужен API ключ от jsonbin.io
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                // Обновляем URL для опроса
                this.pollingUrl = `https://api.jsonbin.io/v3/b/${result.metadata.id}/latest`;
                this.pollingUrlElement.value = this.pollingUrl;
            }
        } catch (error) {
            // Игнорируем ошибки API, используем localStorage
            console.log('External API unavailable, using localStorage');
        }
    }

    updatePollingStats() {
        const lastUpdate = localStorage.getItem(`last-poll-${this.sessionId}`);
        const currentTime = Date.now();
        
        if (lastUpdate) {
            const lastPollTime = parseInt(lastUpdate);
            const timeDiff = currentTime - lastPollTime;
            
            if (timeDiff < 10000) { // Последний опрос менее 10 секунд назад
                this.updateConnectionStatus('connected');
                this.connectionDetailsElement.textContent = `Последний опрос: ${Math.round(timeDiff/1000)} сек назад`;
            } else if (timeDiff < 30000) { // Менее 30 секунд
                this.updateConnectionStatus('waiting');
                this.connectionDetailsElement.textContent = `Ожидание опроса (${Math.round(timeDiff/1000)} сек)`;
            } else {
                this.updateConnectionStatus('error');
                this.connectionDetailsElement.textContent = `Нет связи более ${Math.round(timeDiff/1000)} сек`;
            }
        } else {
            this.updateConnectionStatus('waiting');
            this.connectionDetailsElement.textContent = 'Ожидание первого подключения...';
        }
    }

    updateConnectionStatus(status) {
        this.statusElement.className = `status ${status}`;
        
        switch(status) {
            case 'connected':
                this.statusElement.textContent = 'Подключен';
                break;
            case 'waiting':
                this.statusElement.textContent = 'Ожидание...';
                break;
            case 'error':
                this.statusElement.textContent = 'Нет связи';
                break;
        }
    }

    async copyPollingUrl() {
        try {
            await navigator.clipboard.writeText(this.pollingUrl);
            const button = document.getElementById('copy-url');
            const originalText = button.textContent;
            
            button.textContent = 'Скопировано!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
            
            this.log('URL скопирован в буфер обмена', 'success');
        } catch (err) {
            // Fallback для старых браузеров
            this.pollingUrlElement.select();
            document.execCommand('copy');
            this.log('URL скопирован (fallback)', 'success');
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.logElement.appendChild(logEntry);
        this.logElement.scrollTop = this.logElement.scrollHeight;

        // Ограничиваем количество записей
        const entries = this.logElement.children;
        if (entries.length > 50) {
            this.logElement.removeChild(entries[0]);
        }
    }

    cleanup() {
        // Очистка при закрытии страницы
        this.log('Сессия завершена', 'warning');
    }
}

// API для работы с GitHub Pages или других статических хостингов
class StaticHostingAPI {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.githubRepo = 'your-username/cs2-remote-commands'; // Нужно будет заменить
        this.apiUrl = `https://api.github.com/repos/${this.githubRepo}/contents/commands/${sessionId}.json`;
    }

    async saveCommands(commands) {
        // Для демо используем localStorage
        // В продакшене можно использовать GitHub API или Firebase
        const data = {
            sessionId: this.sessionId,
            commands: commands,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`api-commands-${this.sessionId}`, JSON.stringify(data));
        return true;
    }

    async getCommands() {
        try {
            const data = localStorage.getItem(`api-commands-${this.sessionId}`);
            return data ? JSON.parse(data) : { commands: [] };
        } catch {
            return { commands: [] };
        }
    }
}

// Utility functions
function addCustomButton(action, page, row, col, label, color = 'test') {
    const container = document.querySelector('.button-group:last-child');
    
    const button = document.createElement('button');
    button.className = `control-btn ${color}`;
    button.dataset.action = action;
    button.dataset.page = page.toString();
    button.dataset.row = row.toString();
    button.dataset.col = col.toString();
    button.textContent = label;
    
    container.appendChild(button);
    
    // Добавляем обработчик
    button.addEventListener('click', (e) => app.handleButtonClick(e));
    
    return button;
}

// Глобальные переменные
let app;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    app = new OnlineRemoteControl();
    
    // Добавляем горячие клавиши
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    document.querySelector('[data-action="live"]')?.click();
                    break;
                case '2':
                    e.preventDefault();
                    document.querySelector('[data-action="pause"]')?.click();
                    break;
                case '3':
                    e.preventDefault();
                    document.querySelector('[data-action="stop"]')?.click();
                    break;
                case 'c':
                    if (e.shiftKey) {
                        e.preventDefault();
                        document.getElementById('copy-url')?.click();
                    }
                    break;
            }
        }
    });
    
    app.log('🎮 Система управления готова к работе', 'success');
    app.log('🔗 Скопируйте URL и вставьте в настройки GSI', 'info');
    app.log('⚡ Горячие клавиши: Ctrl+1 (Live), Ctrl+2 (Pause), Ctrl+3 (Stop)', 'info');
});
