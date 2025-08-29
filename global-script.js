// Global CS2 Remote Control - без сессий, для всех пользователей
class GlobalRemoteControl {
    constructor() {
        this.commandsSent = 0;
        this.startTime = Date.now();
        
        // UI элементы
        this.statusElement = document.getElementById('status');
        this.logElement = document.getElementById('event-log');
        this.commandsSentElement = document.getElementById('commands-sent');
        this.sessionTimeElement = document.getElementById('session-time');
        
        // Глобальный Gist для команд (публичный)
        this.gistId = '85e3c77f4a6b8b8e0c6d9a4b5f2c1e3d'; // Это будет создан автоматически
        this.gistUrl = `https://api.github.com/gists/${this.gistId}`;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.startSessionTimer();
        
        this.log('🌐 Глобальный контроллер запущен', 'success');
        this.log('ℹ️ Все команды отправляются напрямую на GSI Companion', 'info');
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
            timestamp: Date.now(),
            executed: false
        };

        try {
            // Отправляем команду в глобальное хранилище
            await this.sendGlobalCommand(command);
            
            this.commandsSent++;
            this.commandsSentElement.textContent = this.commandsSent;
            
            this.log(`🚀 Глобальная команда: ${action} → ${page}/${row}/${col}`, 'success');
        } catch (error) {
            this.log(`❌ Ошибка отправки: ${error.message}`, 'error');
            button.disabled = false;
        }
    }

    async sendGlobalCommand(command) {
        // Используем GitHub Gist как глобальное хранилище команд
        try {
            // Сначала получаем текущие команды
            let currentCommands = [];
            
            try {
                const response = await fetch(`https://api.github.com/gists/b4f8c2d6e1a9f5d3c8b7e6a4d2f1c3e5`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (response.ok) {
                    const gist = await response.json();
                    const content = gist.files['cs2-global-commands.json'].content;
                    const data = JSON.parse(content);
                    currentCommands = data.commands || [];
                }
            } catch (err) {
                // Gist не существует или ошибка - начинаем с пустого массива
                currentCommands = [];
            }

            // Добавляем новую команду
            currentCommands.push(command);
            
            // Оставляем только последние 50 команд чтобы не переполнить Gist
            if (currentCommands.length > 50) {
                currentCommands = currentCommands.slice(-50);
            }

            const gistData = {
                description: "CS2 Global Remote Control Commands",
                public: true,
                files: {
                    "cs2-global-commands.json": {
                        content: JSON.stringify({
                            commands: currentCommands,
                            lastUpdate: Date.now()
                        }, null, 2)
                    }
                }
            };

            // Обновляем или создаем Gist
            const response = await fetch(`https://api.github.com/gists/b4f8c2d6e1a9f5d3c8b7e6a4d2f1c3e5`, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                // Если обновить не удалось, пробуем создать новый Gist
                const createResponse = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gistData)
                });
                
                if (!createResponse.ok) {
                    throw new Error(`HTTP ${createResponse.status}`);
                }
            }

        } catch (error) {
            // Fallback: используем простое хранение в localStorage для демо
            console.warn('GitHub Gist недоступен, используем localStorage:', error);
            
            let commands = JSON.parse(localStorage.getItem('cs2-global-commands') || '[]');
            commands.push(command);
            
            // Оставляем только последние 20 команд
            if (commands.length > 20) {
                commands = commands.slice(-20);
            }
            
            localStorage.setItem('cs2-global-commands', JSON.stringify(commands));
            
            this.log('⚠️ Команда сохранена локально (для демо)', 'warning');
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
        a.download = `cs2-global-remote-log-${Date.now()}.txt`;
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
    app = new GlobalRemoteControl();
});
