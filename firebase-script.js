// Firebase Configuration для CS2 Remote Control
const firebaseConfig = {
    apiKey: "AIzaSyC8Q5X9x0X9x0X9x0X9x0X9x0X9x0X9x0X",  // Замените на ваш API Key
    authDomain: "cs2-remote-control.firebaseapp.com",     // Замените на ваш домен
    databaseURL: "https://cs2-remote-control-default-rtdb.firebaseio.com/", // Замените на ваш URL
    projectId: "cs2-remote-control",                      // Замените на ваш Project ID
    storageBucket: "cs2-remote-control.appspot.com",     // Замените на ваш Storage Bucket
    messagingSenderId: "123456789012",                    // Замените на ваш Sender ID
    appId: "1:123456789012:web:abcdef123456789abcdef"     // Замените на ваш App ID
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

class FirebaseRemoteControl {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.commandsSent = 0;
        this.startTime = Date.now();
        this.isConnected = false;
        
        // UI элементы
        this.statusElement = document.getElementById('status');
        this.sessionIdElement = document.getElementById('session-id');
        this.pollingUrlElement = document.getElementById('polling-url');
        this.connectionDetailsElement = document.getElementById('connection-details');
        this.logElement = document.getElementById('event-log');
        this.commandsSentElement = document.getElementById('commands-sent');
        this.sessionTimeElement = document.getElementById('session-time');
        
        this.init();
    }

    generateSessionId() {
        return 'cs2-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.bindEvents();
        this.setupUI();
        this.setupFirebaseListeners();
        this.startSessionTimer();
        
        this.log('🔥 Firebase контроллер инициализирован', 'success');
        this.log(`📋 Session ID: ${this.sessionId}`, 'info');
    }

    setupUI() {
        this.sessionIdElement.textContent = this.sessionId;
        this.pollingUrlElement.value = `https://cs2-remote-control-default-rtdb.firebaseio.com/sessions/${this.sessionId}/commands.json`;
        this.updateConnectionStatus('waiting');
    }

    setupFirebaseListeners() {
        // Создаем сессию в Firebase
        const sessionRef = database.ref(`sessions/${this.sessionId}`);
        
        // Инициализируем сессию
        sessionRef.set({
            created: firebase.database.ServerValue.TIMESTAMP,
            status: 'active',
            commands: [],
            lastPoll: null
        });

        // Слушаем изменения в lastPoll (когда GSI опрашивает команды)
        sessionRef.child('lastPoll').on('value', (snapshot) => {
            const lastPoll = snapshot.val();
            if (lastPoll) {
                this.updateConnectionStatus('connected');
                const timeDiff = Date.now() - lastPoll;
                this.connectionDetailsElement.textContent = `Последний опрос: ${Math.round(timeDiff/1000)} сек назад`;
                
                if (!this.isConnected) {
                    this.isConnected = true;
                    this.log('✅ GSI Companion подключился!', 'success');
                }
            }
        });

        // Слушаем выполненные команды
        sessionRef.child('executed').on('child_added', (snapshot) => {
            const executedCommand = snapshot.val();
            this.log(`✅ Команда выполнена: ${executedCommand.action} (${executedCommand.page}/${executedCommand.row}/${executedCommand.col})`, 'success');
        });

        // Очищаем сессию при закрытии страницы
        window.addEventListener('beforeunload', () => {
            sessionRef.child('status').set('closed');
        });
    }

    bindEvents() {
        // Кнопки управления
        document.querySelectorAll('.control-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });

        // Копирование URL
        document.getElementById('copy-url').addEventListener('click', () => {
            this.copyPollingUrl();
        });

        // Лог управление
        document.getElementById('clear-log').addEventListener('click', () => {
            this.logElement.innerHTML = '<div class="log-entry info">Лог очищен</div>';
        });

        document.getElementById('export-log').addEventListener('click', () => {
            this.exportLog();
        });

        // Добавление пользовательской кнопки
        document.getElementById('add-custom-btn').addEventListener('click', () => {
            this.addCustomButton();
        });

        // Горячие клавиши
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
                }
            }
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
        button.disabled = true;
        
        setTimeout(() => {
            button.classList.remove('pressed');
            button.disabled = false;
        }, 1000);

        const command = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            action: action,
            page: page,
            row: row,
            col: col,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            executed: false
        };

        try {
            // Отправляем команду в Firebase
            await database.ref(`sessions/${this.sessionId}/commands`).push(command);
            
            this.commandsSent++;
            this.commandsSentElement.textContent = this.commandsSent;
            
            this.log(`🎯 Команда отправлена: ${action} → ${page}/${row}/${col}`, 'info');
        } catch (error) {
            this.log(`❌ Ошибка отправки: ${error.message}`, 'error');
            button.disabled = false;
        }
    }

    addCustomButton() {
        const label = document.getElementById('custom-label').value.trim();
        const page = parseInt(document.getElementById('custom-page').value) || 1;
        const row = parseInt(document.getElementById('custom-row').value) || 1;
        const col = parseInt(document.getElementById('custom-col').value) || 0;

        if (!label) {
            alert('Введите название кнопки');
            return;
        }

        const container = document.getElementById('custom-buttons');
        const button = document.createElement('button');
        button.className = 'control-btn test';
        button.dataset.action = `custom-${Date.now()}`;
        button.dataset.page = page.toString();
        button.dataset.row = row.toString();
        button.dataset.col = col.toString();
        button.innerHTML = `🎯 ${label}<br><small>${page}/${row}/${col}</small>`;

        // Добавляем кнопку удаления
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm('Удалить эту кнопку?')) {
                button.remove();
            }
        });

        button.addEventListener('click', (e) => this.handleButtonClick(e));
        container.appendChild(button);

        // Очищаем форму
        document.getElementById('custom-label').value = '';
        document.getElementById('custom-page').value = '1';
        document.getElementById('custom-row').value = '1';
        document.getElementById('custom-col').value = '1';

        this.log(`➕ Добавлена кнопка: ${label} (${page}/${row}/${col})`, 'info');
    }

    updateConnectionStatus(status) {
        this.statusElement.className = `status ${status}`;
        
        switch(status) {
            case 'connected':
                this.statusElement.textContent = '🟢 Подключен';
                break;
            case 'waiting':
                this.statusElement.textContent = '🟡 Ожидание...';
                break;
            case 'error':
                this.statusElement.textContent = '🔴 Нет связи';
                break;
        }
    }

    async copyPollingUrl() {
        try {
            await navigator.clipboard.writeText(this.pollingUrlElement.value);
            const button = document.getElementById('copy-url');
            const originalText = button.textContent;
            
            button.textContent = '✅ Скопировано!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
            
            this.log('📋 URL скопирован в буфер обмена', 'success');
        } catch (err) {
            // Fallback
            this.pollingUrlElement.select();
            document.execCommand('copy');
            this.log('📋 URL скопирован', 'success');
        }
    }

    startSessionTimer() {
        setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.sessionTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    exportLog() {
        const logEntries = Array.from(this.logElement.children).map(entry => entry.textContent);
        const logText = logEntries.join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cs2-remote-log-${this.sessionId}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.log('📄 Лог экспортирован', 'info');
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
        if (entries.length > 100) {
            this.logElement.removeChild(entries[0]);
        }
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new FirebaseRemoteControl();
});
