// CS2 Button States Controller - управление через JSON состояния
class ButtonStatesController {
    constructor() {
        this.apiUrl = 'https://pleshalive.github.io/cs2-remote-control/api/global';
        this.gistId = 'b4f8c2d6e1a9f5d3c8b7e6a4d2f1c3e5'; // Будет создан автоматически
        this.gistUrl = `https://api.github.com/gists/${this.gistId}`;
        
        this.totalPresses = 0;
        this.currentStates = {};
        
        // UI элементы
        this.logElement = document.getElementById('event-log');
        this.activeCountElement = document.getElementById('active-count');
        this.totalPressesElement = document.getElementById('total-presses');
        this.lastUpdateElement = document.getElementById('last-update');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCurrentStates();
        this.startStateMonitoring();
        
        this.log('🎛️ Button States Controller запущен', 'success');
        this.log(`📡 Мониторинг API: ${this.apiUrl}`, 'info');
    }

    bindEvents() {
        // Кнопки управления
        document.querySelectorAll('.control-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });

        // Управление логом
        document.getElementById('clear-log').addEventListener('click', () => {
            this.logElement.innerHTML = '<div class="log-entry info">Лог очищен</div>';
        });

        document.getElementById('refresh-states').addEventListener('click', () => {
            this.loadCurrentStates();
        });
    }

    async handleButtonClick(event) {
        const button = event.target.closest('.control-btn');
        const buttonName = button.dataset.button;
        
        // Визуальная обратная связь
        button.classList.add('pressed-state');
        button.disabled = true;
        
        setTimeout(() => {
            button.classList.remove('pressed-state');
            button.disabled = false;
        }, 2000);

        try {
            // Активируем состояние кнопки на 2 секунды
            await this.activateButton(buttonName);
            
            this.totalPresses++;
            this.totalPressesElement.textContent = this.totalPresses;
            
            this.log(`🎯 Кнопка активирована: ${buttonName} (+)`, 'success');
            
            // Через 2 секунды деактивируем
            setTimeout(() => {
                this.deactivateButton(buttonName);
                this.log(`⏹️ Кнопка деактивирована: ${buttonName} (-)`, 'info');
            }, 2000);
            
        } catch (error) {
            this.log(`❌ Ошибка активации кнопки: ${error.message}`, 'error');
            button.disabled = false;
        }
    }

    async activateButton(buttonName) {
        try {
            // Обновляем локальное состояние
            this.currentStates[buttonName] = {
                state: '+',
                timestamp: Date.now()
            };
            
            // Обновляем UI
            this.updateButtonUI(buttonName, '+');
            
            // Пробуем обновить через GitHub Gist
            await this.updateGistStates();
            
        } catch (error) {
            // Fallback: сохраняем в localStorage
            this.saveToLocalStorage();
            console.warn('Используем localStorage fallback:', error);
        }
    }

    async deactivateButton(buttonName) {
        try {
            // Обновляем локальное состояние
            this.currentStates[buttonName] = {
                state: '-',
                timestamp: Date.now()
            };
            
            // Обновляем UI
            this.updateButtonUI(buttonName, '-');
            
            // Пробуем обновить через GitHub Gist
            await this.updateGistStates();
            
        } catch (error) {
            // Fallback: сохраняем в localStorage
            this.saveToLocalStorage();
            console.warn('Используем localStorage fallback:', error);
        }
    }

    updateButtonUI(buttonName, state) {
        const stateElement = document.querySelector(`[data-state="${buttonName}"]`);
        if (stateElement) {
            stateElement.textContent = state;
            stateElement.className = `button-state ${state === '+' ? 'active' : 'inactive'}`;
        }
        
        this.updateActiveCount();
    }

    updateActiveCount() {
        const activeCount = Object.values(this.currentStates).filter(s => s.state === '+').length;
        this.activeCountElement.textContent = activeCount;
    }

    async updateGistStates() {
        // Создаем структуру данных для API
        const apiData = {
            lastUpdate: Date.now(),
            buttons: {}
        };

        // Список всех кнопок с их координатами
        const buttonConfigs = {
            live: { page: 1, row: 2, col: 1, label: "LIVE" },
            pause: { page: 1, row: 2, col: 2, label: "PAUSE" },
            stop: { page: 1, row: 2, col: 3, label: "STOP" },
            round1: { page: 1, row: 3, col: 1, label: "Round 1" },
            round2: { page: 1, row: 3, col: 2, label: "Round 2" },
            round3: { page: 1, row: 3, col: 3, label: "Round 3" },
            round4: { page: 1, row: 3, col: 4, label: "Round 4" },
            round5: { page: 1, row: 3, col: 5, label: "Round 5" },
            round6: { page: 1, row: 3, col: 6, label: "Round 6" },
            round7: { page: 1, row: 3, col: 7, label: "Round 7" },
            round8: { page: 1, row: 4, col: 1, label: "Round 8" },
            round9: { page: 1, row: 4, col: 2, label: "Round 9" },
            round10: { page: 1, row: 4, col: 3, label: "Round 10" }
        };

        // Заполняем данные кнопок
        for (const [buttonName, config] of Object.entries(buttonConfigs)) {
            const currentState = this.currentStates[buttonName] || { state: '-', timestamp: 0 };
            
            apiData.buttons[buttonName] = {
                state: currentState.state,
                timestamp: currentState.timestamp,
                page: config.page,
                row: config.row,
                col: config.col,
                label: config.label
            };
        }

        // Пробуем обновить через GitHub Gist
        const gistData = {
            description: "CS2 Button States - Real-time button control",
            public: true,
            files: {
                "button-states.json": {
                    content: JSON.stringify(apiData, null, 2)
                },
                "global": {
                    content: JSON.stringify({
                        ...apiData,
                        info: "CS2 Button States - GitHub Pages Static API",
                        note: "State '+' means button pressed (2 sec), '-' means idle"
                    }, null, 2)
                }
            }
        };

        try {
            const response = await fetch(this.gistUrl, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                // Если не получилось обновить, пробуем создать новый
                const createResponse = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gistData)
                });
                
                if (createResponse.ok) {
                    const newGist = await createResponse.json();
                    this.gistId = newGist.id;
                    this.gistUrl = `https://api.github.com/gists/${this.gistId}`;
                    this.log(`📝 Создан новый Gist: ${this.gistId}`, 'success');
                }
            }
            
        } catch (error) {
            // Используем fallback
            throw new Error(`GitHub API недоступен: ${error.message}`);
        }
    }

    async loadCurrentStates() {
        try {
            const response = await fetch(this.apiUrl + '?t=' + Date.now());
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.buttons) {
                    // Обновляем локальное состояние
                    for (const [buttonName, buttonData] of Object.entries(data.buttons)) {
                        this.currentStates[buttonName] = {
                            state: buttonData.state,
                            timestamp: buttonData.timestamp
                        };
                        
                        this.updateButtonUI(buttonName, buttonData.state);
                    }
                    
                    this.lastUpdateElement.textContent = new Date(data.lastUpdate || Date.now()).toLocaleTimeString();
                    this.log('✅ Состояния загружены из API', 'success');
                }
            }
        } catch (error) {
            this.log(`⚠️ Не удалось загрузить состояния: ${error.message}`, 'warning');
            this.loadFromLocalStorage();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('cs2-button-states', JSON.stringify(this.currentStates));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('cs2-button-states');
        if (saved) {
            this.currentStates = JSON.parse(saved);
            
            for (const [buttonName, state] of Object.entries(this.currentStates)) {
                this.updateButtonUI(buttonName, state.state);
            }
            
            this.log('📦 Состояния загружены из localStorage', 'info');
        }
    }

    startStateMonitoring() {
        // Обновляем состояния каждые 5 секунд
        setInterval(() => {
            this.loadCurrentStates();
        }, 5000);

        // Автоматически деактивируем старые активные кнопки
        setInterval(() => {
            const now = Date.now();
            let updated = false;
            
            for (const [buttonName, state] of Object.entries(this.currentStates)) {
                if (state.state === '+' && now - state.timestamp > 2000) {
                    this.currentStates[buttonName] = {
                        state: '-',
                        timestamp: now
                    };
                    this.updateButtonUI(buttonName, '-');
                    updated = true;
                }
            }
            
            if (updated) {
                this.updateGistStates().catch(e => {
                    this.saveToLocalStorage();
                });
            }
        }, 1000);
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
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ButtonStatesController();
});
