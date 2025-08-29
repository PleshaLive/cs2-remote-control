// Global CS2 Remote Control - без сессий, для всех пользователей
class GlobalRemoteControl {
    constructor() {
        this.commandsSent = 0;
        this.startTime = Date.now();
        // режимы
        this.mode = (localStorage.getItem('cs2-mode') || 'local');
        this.firebaseApp = null;
        this.database = null;
        this.sessionId = localStorage.getItem('cs2-session-id') || '';
        this.firebaseConfig = this.loadFirebaseConfig();

        // UI элементы
        this.statusElement = document.getElementById('status');
        this.logElement = document.getElementById('event-log');
        this.commandsSentElement = document.getElementById('commands-sent');
        this.sessionTimeElement = document.getElementById('session-time');

        // дополнительные UI (настройки)
        this.modeSelect = document.getElementById('mode-select');
        this.firebaseConfigTextarea = document.getElementById('firebase-config');
        this.sessionIdInput = document.getElementById('session-id');
        this.genSessionBtn = document.getElementById('gen-session');
        this.pollingUrlInput = document.getElementById('polling-url');
        this.copyUrlBtn = document.getElementById('copy-url');
        this.applyBtn = document.getElementById('apply-firebase');
        this.connDetails = document.getElementById('connection-details');

        this.init();
    }

    loadFirebaseConfig() {
        try {
            const raw = localStorage.getItem('cs2-firebase-config');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    saveFirebaseConfig(cfg) {
        localStorage.setItem('cs2-firebase-config', JSON.stringify(cfg));
    }

    init() {
        this.bindEvents();
        this.startSessionTimer();
        this.setupModeUI();

        this.log('🌐 Глобальный контроллер запущен', 'success');
        this.log('ℹ️ Кнопки работают локально без сессий. Для глобального режима используйте Firebase.', 'info');
    }

    bindEvents() {
        // Кнопки управления
        document.querySelectorAll('.control-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });

        // Лог управление
        document.getElementById('clear-log').addEventListener('click', () => {
            this.logElement.innerHTML = '<div class="log-entry info">Лог очищен</div>';
        });

        document.getElementById('export-log').addEventListener('click', () => {
            this.exportLog();
        });

        // Пользовательская кнопка
        const addCustom = document.getElementById('add-custom-btn');
        if (addCustom) addCustom.addEventListener('click', () => {
            this.addCustomButton();
        });

        // Настройки режима
        if (this.modeSelect) {
            this.modeSelect.value = this.mode;
            this.modeSelect.addEventListener('change', () => {
                this.mode = this.modeSelect.value;
                localStorage.setItem('cs2-mode', this.mode);
                this.setupModeUI();
            });
        }

        if (this.firebaseConfigTextarea) {
            if (this.firebaseConfig) {
                this.firebaseConfigTextarea.value = JSON.stringify(this.firebaseConfig, null, 2);
            }
        }

        if (this.genSessionBtn) {
            this.genSessionBtn.addEventListener('click', () => {
                this.sessionId = this.generateSessionId();
                this.sessionIdInput.value = this.sessionId;
                localStorage.setItem('cs2-session-id', this.sessionId);
                this.updatePollingUrl();
            });
        }

        if (this.applyBtn) {
            this.applyBtn.addEventListener('click', () => this.applyFirebaseSettings());
        }

        if (this.copyUrlBtn) {
            this.copyUrlBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(this.pollingUrlInput.value || '');
                    this.log('📋 URL скопирован', 'success');
                } catch {
                    this.log('⚠️ Не удалось скопировать URL', 'warning');
                }
            });
        }

        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1': e.preventDefault(); document.querySelector('[data-action="live"]')?.click(); break;
                    case '2': e.preventDefault(); document.querySelector('[data-action="pause"]')?.click(); break;
                    case '3': e.preventDefault(); document.querySelector('[data-action="stop"]')?.click(); break;
                }
            }
        });
    }

    setupModeUI() {
        const cfgWrap = document.getElementById('firebase-config-wrap');
        const sessWrap = document.getElementById('firebase-session-wrap');
        const pollWrap = document.getElementById('polling-url-wrap');
        const applyWrap = document.getElementById('apply-wrap');

        if (this.mode === 'firebase') {
            cfgWrap.style.display = '';
            sessWrap.style.display = '';
            pollWrap.style.display = '';
            applyWrap.style.display = '';
            if (this.sessionId) this.sessionIdInput.value = this.sessionId;
            this.updatePollingUrl();
        } else {
            cfgWrap.style.display = 'none';
            sessWrap.style.display = 'none';
            pollWrap.style.display = 'none';
            applyWrap.style.display = 'none';
        }
    }

    updatePollingUrl() {
        if (!this.pollingUrlInput) return;
        if (!this.sessionId) return;
        // URL, который GSI Companion будет опрашивать
        this.pollingUrlInput.value = `https://cs2-remote-control-default-rtdb.firebaseio.com/sessions/${this.sessionId}/commands.json`;
    }

    async applyFirebaseSettings() {
        if (this.mode !== 'firebase') return;
        // читаем конфиг
        let cfg = null;
        try {
            cfg = JSON.parse(this.firebaseConfigTextarea.value);
        } catch (e) {
            this.log('❌ Некорректный JSON Firebase config', 'error');
            return;
        }
        if (!cfg || !cfg.databaseURL) {
            this.log('❌ В конфиге должен быть databaseURL', 'error');
            return;
        }
        this.firebaseConfig = cfg;
        this.saveFirebaseConfig(cfg);
        if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
            this.sessionIdInput.value = this.sessionId;
            localStorage.setItem('cs2-session-id', this.sessionId);
        }
        this.updatePollingUrl();

        // инициализация Firebase (compat)
        try {
            this.firebaseApp = firebase.apps?.length ? firebase.app() : firebase.initializeApp(cfg);
            this.database = firebase.database();
            // создать/обновить сессию
            const sessionRef = this.database.ref(`sessions/${this.sessionId}`);
            await sessionRef.set({ created: firebase.database.ServerValue.TIMESTAMP, status: 'active' });
            this.connDetails && (this.connDetails.textContent = 'Готово. Вставьте URL в GSI.');
            this.log('✅ Firebase настроен. Можно подключать GSI.', 'success');
        } catch (e) {
            this.log(`❌ Ошибка инициализации Firebase: ${e.message}`, 'error');
        }
    }

    async handleButtonClick(event) {
        const button = event.target.closest('.control-btn');
        const action = button.dataset.action;
        const page = parseInt(button.dataset.page) || 1;
        const row = parseInt(button.dataset.row) || 1;
        const col = parseInt(button.dataset.col) || 1;

        // Визуальная обратная связь
        button.classList.add('pressed');
        button.disabled = true;
        setTimeout(() => { button.classList.remove('pressed'); button.disabled = false; }, 800);

        const command = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            action, page, row, col,
            timestamp: Date.now(),
            executed: false
        };

        try {
            if (this.mode === 'firebase' && this.database && this.sessionId) {
                await this.sendFirebaseCommand(command);
            } else {
                const directSuccess = await this.sendDirectCommand(command);
                if (!directSuccess) {
                    // оффлайн-демо
                    let commands = JSON.parse(localStorage.getItem('cs2-global-commands') || '[]');
                    commands.push(command);
                    if (commands.length > 50) commands = commands.slice(-50);
                    localStorage.setItem('cs2-global-commands', JSON.stringify(commands));
                }
            }

            this.commandsSent++;
            this.commandsSentElement.textContent = this.commandsSent;
            this.log(`🚀 Команда отправлена: ${action} → ${page}/${row}/${col}`, 'success');
        } catch (error) {
            this.log(`❌ Ошибка отправки: ${error.message}`, 'error');
            button.disabled = false;
        }
    }

    async sendDirectCommand(command) {
        try {
            const response = await fetch('http://localhost:2828/api/remote-press', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(command)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async sendFirebaseCommand(command) {
        const ref = this.database.ref(`sessions/${this.sessionId}/commands`);
        await ref.push({ ...command, timestamp: firebase.database.ServerValue.TIMESTAMP });
    }

    addCustomButton() {
        const label = document.getElementById('custom-label').value.trim();
        const page = parseInt(document.getElementById('custom-page').value) || 1;
        const row = parseInt(document.getElementById('custom-row').value) || 1;
        const col = parseInt(document.getElementById('custom-col').value) || 0;
        if (!label) { alert('Введите название кнопки'); return; }

        const container = document.getElementById('custom-buttons');
        const button = document.createElement('button');
        button.className = 'control-btn test';
        button.dataset.action = `custom-${Date.now()}`;
        button.dataset.page = page.toString();
        button.dataset.row = row.toString();
        button.dataset.col = col.toString();
        button.innerHTML = `🎯 ${label}<br><small>${page}/${row}/${col}</small>`;

        button.addEventListener('contextmenu', (e) => { e.preventDefault(); if (confirm('Удалить эту кнопку?')) button.remove(); });
        button.addEventListener('click', (e) => this.handleButtonClick(e));
        container.appendChild(button);

        document.getElementById('custom-label').value = '';
        document.getElementById('custom-page').value = '1';
        document.getElementById('custom-row').value = '1';
        document.getElementById('custom-col').value = '1';

        this.log(`➕ Добавлена кнопка: ${label} (${page}/${row}/${col})`, 'info');
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
        a.href = url; a.download = `cs2-global-remote-log-${Date.now()}.txt`; a.click();
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
        const entries = this.logElement.children;
        if (entries.length > 100) { this.logElement.removeChild(entries[0]); }
    }

    generateSessionId() {
        return 'cs2-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new GlobalRemoteControl();
    app.log('🎮 Система управления готова', 'success');
});
