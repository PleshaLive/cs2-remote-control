class OnlineAdvancedController {
    constructor() {
        this.buttons = {};
        this.isConnected = false;
        this.checkInterval = null;
        this.logs = [];
        this.localApiUrl = 'http://127.0.0.1:2828/api/local-buttons';
        this.gistId = 'your-gist-id-here'; // Замените на реальный Gist ID
        this.useLocalAPI = false;
        
        this.init();
    }

    async init() {
        await this.loadButtons();
        this.createButtonsGrid();
        this.startMonitoring();
        this.log('Онлайн контроллер инициализирован', 'info');
    }

    async loadButtons() {
        // В онлайн режиме используем только localStorage
        const saved = localStorage.getItem('cs2-advanced-buttons');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.buttons = data.buttons || data;
                this.log('Кнопки загружены из localStorage', 'info');
                return;
            } catch (e) {
                this.log('Ошибка загрузки настроек из localStorage', 'error');
            }
        }
        
        // Кнопки по умолчанию для онлайн режима
        this.buttons = {
            'bomb_planted': {
                label: 'Бомба заложена',
                icon: 'fas fa-bomb',
                page: 1,
                row: 1,
                col: 1,
                state: '-',
                timestamp: 0
            },
            'bomb_defused': {
                label: 'Бомба обезврежена',
                icon: 'fas fa-shield-alt',
                page: 1,
                row: 1,
                col: 2,
                state: '-',
                timestamp: 0
            },
            'round_start': {
                label: 'Начало раунда',
                icon: 'fas fa-play',
                page: 1,
                row: 1,
                col: 3,
                state: '-',
                timestamp: 0
            },
            'round_end': {
                label: 'Конец раунда',
                icon: 'fas fa-stop',
                page: 1,
                row: 1,
                col: 4,
                state: '-',
                timestamp: 0
            },
            'clutch_mode': {
                label: 'Клатч режим',
                icon: 'fas fa-crosshairs',
                page: 1,
                row: 2,
                col: 1,
                state: '-',
                timestamp: 0
            },
            'ace_moment': {
                label: 'Эйс момент',
                icon: 'fas fa-crown',
                page: 1,
                row: 2,
                col: 2,
                state: '-',
                timestamp: 0
            },
            'headshot': {
                label: 'Хедшот',
                icon: 'fas fa-target',
                page: 1,
                row: 2,
                col: 3,
                state: '-',
                timestamp: 0
            },
            'multikill': {
                label: 'Мультикилл',
                icon: 'fas fa-skull',
                page: 1,
                row: 2,
                col: 4,
                state: '-',
                timestamp: 0
            }
        };
        
        await this.saveButtons();
        this.log('Использованы кнопки по умолчанию (онлайн режим)', 'info');
    }

    async saveButtons() {
        const data = { buttons: this.buttons };
        
        // В онлайн режиме сохраняем только в localStorage
        localStorage.setItem('cs2-advanced-buttons', JSON.stringify(data));
        this.log('Настройки сохранены в localStorage', 'success');
        
        // Обновляем глобальное API для GSI через GitHub
        await this.updateGlobalAPI();
    }

    async updateGlobalAPI() {
        try {
            // Создаем обновленный API объект в том же формате, что и api/global
            const apiData = {
                lastUpdate: Date.now(),
                buttons: {},
                info: "CS2 Button States - Advanced Controller API",
                note: "State '+' means button pressed (2 sec), '-' means idle"
            };

            // Переносим все кнопки в API формат
            Object.entries(this.buttons).forEach(([key, button]) => {
                apiData.buttons[key] = {
                    state: button.state,
                    timestamp: button.timestamp,
                    page: button.page,
                    row: button.row,
                    col: button.col,
                    label: button.label
                };
            });

            // Сохраняем в localStorage под специальным ключом для API
            localStorage.setItem('cs2-api-global', JSON.stringify(apiData));
            
            console.log('📡 API состояние обновлено:', apiData);
            
            // Пытаемся обновить через простой webhook (если настроен)
            await this.updateViaWebhook(apiData);
            
            this.log('📡 API состояние обновлено', 'success');
            
        } catch (error) {
            this.log(`❌ Ошибка обновления API: ${error.message}`, 'error');
            console.error('API update error:', error);
        }
    }

    async updateViaWebhook(apiData) {
        try {
            // Простой способ - отправляем данные на webhook endpoint
            // который может обновить файл в репозитории
            const webhookUrl = 'https://api.github.com/repos/PleshaLive/cs2-remote-control/dispatches';
            
            const payload = {
                event_type: 'update-api',
                client_payload: {
                    api_data: apiData,
                    timestamp: Date.now()
                }
            };

            // Показываем данные для ручного обновления
            console.log('API Data for manual update:', JSON.stringify(apiData, null, 2));
            
            this.log('Данные для API готовы (см. консоль для ручного обновления)', 'info');
            
            // Альтернативно - показываем кнопку для копирования JSON
            this.showAPIUpdateDialog(apiData);
            
        } catch (error) {
            this.log(`Webhook недоступен: ${error.message}`, 'warning');
        }
    }

    showAPIUpdateDialog(apiData) {
        const existingDialog = document.getElementById('api-update-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialog = document.createElement('div');
        dialog.id = 'api-update-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
        `;

        dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #4ecdc4;">🔄 Обновление API</h3>
            <p>Для синхронизации с GSI Companion скопируйте JSON ниже и обновите файл <code>api/global</code>:</p>
            <textarea readonly style="width: 100%; height: 150px; background: #2c2c2c; color: white; border: none; border-radius: 5px; padding: 10px; font-family: monospace; font-size: 12px;">${JSON.stringify(apiData, null, 2)}</textarea>
            <div style="text-align: right; margin-top: 15px;">
                <button onclick="navigator.clipboard.writeText('${JSON.stringify(apiData).replace(/'/g, "\\'")}'); this.textContent='Скопировано!'; setTimeout(() => this.textContent='Копировать JSON', 2000)" style="background: #4ecdc4; color: white; border: none; padding: 8px 16px; border-radius: 5px; margin-right: 10px; cursor: pointer;">Копировать JSON</button>
                <button onclick="document.getElementById('api-update-dialog').remove()" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Закрыть</button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Автоматически закрываем через 30 секунд
        setTimeout(() => {
            if (document.getElementById('api-update-dialog')) {
                dialog.remove();
            }
        }, 30000);
    }

    async updateViaGist(apiData) {
        try {
            // Используем реальный публичный Gist как динамическое API
            // Этот Gist будет создан один раз и затем обновляться
            const gistUrl = 'https://gist.githubusercontent.com/PleshaLive/b4f8c2d6e1a9f5d3c8b7e6a4d2f1c3e5/raw/cs2-button-states.json';
            
            // Пока что просто логируем обновления
            // В будущем можно добавить интеграцию с GitHub API через токен
            console.log('API Update:', apiData);
            this.log('Состояния кнопок обновлены (нужна настройка GitHub токена для синхронизации)', 'info');
            
            // Для демонстрации обновим локальное отображение состояния
            const buttonsWithActiveStates = Object.values(apiData.buttons).filter(btn => btn.state === '+').length;
            if (buttonsWithActiveStates > 0) {
                this.log(`Активных кнопок: ${buttonsWithActiveStates}`, 'success');
            }
            
        } catch (error) {
            this.log(`Ошибка обновления API: ${error.message}`, 'error');
        }
    }

    async createNewGist(gistData) {
        // Показываем инструкции пользователю
        const instructions = `
        Для полной интеграции с GSI Companion:
        
        1. Создайте GitHub Gist с файлом cs2-button-states.json
        2. Скопируйте содержимое:
        ${JSON.stringify(gistData.files["cs2-button-states.json"].content, null, 2)}
        
        3. Используйте raw URL Gist в настройках GSI Companion
        `;
        
        console.log(instructions);
        this.log('Инструкции по настройке API выведены в консоль', 'info');
    }

    createButtonsGrid() {
        const grid = document.getElementById('buttonsGrid');
        grid.innerHTML = '';

        Object.entries(this.buttons).forEach(([key, button]) => {
            const buttonCard = document.createElement('div');
            buttonCard.className = 'button-card';
            buttonCard.id = `button-${key}`;
            
            buttonCard.innerHTML = `
                <i class="${button.icon} button-icon"></i>
                <div class="button-label">${button.label}</div>
                <div class="button-coords">P${button.page}/R${button.row}/C${button.col}</div>
                <div class="button-state">${button.state}</div>
                <button class="btn btn-danger" style="font-size: 12px; padding: 5px 10px; margin-top: 10px;" onclick="onlineController.removeButton('${key}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            buttonCard.onclick = (e) => {
                if (e.target.closest('button')) return; // Не активировать при клике на кнопку удаления
                this.activateButton(key);
            };

            // Add touch support for mobile devices
            buttonCard.ontouchstart = (e) => {
                if (e.target.closest('button')) return;
                buttonCard.style.transform = 'scale(0.95)'; // Visual feedback
                buttonCard.style.transition = 'transform 0.1s';
            };

            buttonCard.ontouchend = (e) => {
                if (e.target.closest('button')) return;
                buttonCard.style.transform = '';
                this.activateButton(key);
                e.preventDefault(); // Prevent double-tap zoom
            };

            grid.appendChild(buttonCard);
        });
    }

    async activateButton(buttonKey) {
        if (!this.buttons[buttonKey]) return;

        const button = this.buttons[buttonKey];
        button.state = '+';
        button.timestamp = Date.now();

        // Визуальная активация
        const buttonElement = document.getElementById(`button-${buttonKey}`);
        buttonElement.classList.add('active');
        buttonElement.querySelector('.button-state').textContent = '+';

        this.log(`🎯 Кнопка активирована: ${button.label} (${buttonKey})`, 'success');
        console.log(`Button activated: ${buttonKey}`, button);

        // Сохраняем состояние
        await this.saveButtons();

        // Автоматическая деактивация через 2 секунды
        setTimeout(async () => {
            button.state = '-';
            button.timestamp = Date.now();
            buttonElement.classList.remove('active');
            buttonElement.querySelector('.button-state').textContent = '-';
            await this.saveButtons();
            this.log(`⏹️ Кнопка деактивирована: ${button.label}`, 'info');
        }, 2000);
    }

    checkConnection() {
        // Проверяем доступность GitHub
        fetch('https://api.github.com')
            .then(response => {
                if (response.ok) {
                    this.setConnectionStatus(true);
                } else {
                    this.setConnectionStatus(false);
                }
            })
            .catch(() => {
                this.setConnectionStatus(false);
            });
    }

    setConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connectionStatus');
        
        if (connected) {
            statusElement.className = 'status-item status-connected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Онлайн режим</span>';
        } else {
            statusElement.className = 'status-item status-disconnected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Оффлайн режим</span>';
        }
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkConnection();
        }, 5000);
    }

    async addButton() {
        const name = document.getElementById('buttonName').value.trim();
        const icon = document.getElementById('buttonIcon').value.trim();
        const page = parseInt(document.getElementById('buttonPage').value);
        const row = parseInt(document.getElementById('buttonRow').value);
        const col = parseInt(document.getElementById('buttonCol').value);

        if (!name) {
            this.log('Введите название кнопки', 'warning');
            return;
        }

        if (!icon) {
            this.log('Введите иконку кнопки', 'warning');
            return;
        }

        const buttonKey = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        if (this.buttons[buttonKey]) {
            this.log('Кнопка с таким названием уже существует', 'warning');
            return;
        }

        this.buttons[buttonKey] = {
            label: name,
            icon: icon,
            page: page,
            row: row,
            col: col,
            state: '-',
            timestamp: 0
        };

        await this.saveButtons();
        this.createButtonsGrid();

        // Очищаем форму
        document.getElementById('buttonName').value = '';
        document.getElementById('buttonIcon').value = 'fas fa-play';
        
        this.log(`Кнопка "${name}" добавлена`, 'success');
    }

    async removeButton(buttonKey) {
        if (!this.buttons[buttonKey]) return;

        const buttonName = this.buttons[buttonKey].label;
        delete this.buttons[buttonKey];

        await this.saveButtons();
        this.createButtonsGrid();

        this.log(`Кнопка "${buttonName}" удалена`, 'info');
    }

    exportConfig() {
        const config = {
            buttons: this.buttons,
            version: '1.0',
            exported: new Date().toISOString(),
            mode: 'online'
        };

        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cs2-online-controller-config-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.log('Настройки экспортированы', 'success');
    }

    importConfig() {
        document.getElementById('importModal').style.display = 'block';
    }

    async performImport() {
        const jsonText = document.getElementById('importJson').value.trim();
        
        if (!jsonText) {
            this.log('Введите JSON настройки', 'warning');
            return;
        }

        try {
            const config = JSON.parse(jsonText);
            
            if (config.buttons && typeof config.buttons === 'object') {
                this.buttons = config.buttons;
                await this.saveButtons();
                this.createButtonsGrid();
                
                this.closeModal();
                this.log('Настройки импортированы', 'success');
            } else {
                this.log('Неверный формат файла настроек', 'error');
            }
        } catch (error) {
            this.log(`Ошибка парсинга JSON: ${error.message}`, 'error');
        }
    }

    async resetConfig() {
        if (confirm('Вы уверены, что хотите сбросить все настройки? Это действие нельзя отменить.')) {
            localStorage.removeItem('cs2-advanced-buttons');
            await this.loadButtons();
            this.createButtonsGrid();
            this.log('Настройки сброшены', 'info');
        }
    }

    closeModal() {
        document.getElementById('importModal').style.display = 'none';
        document.getElementById('importJson').value = '';
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type
        };
        
        this.logs.unshift(logEntry);
        
        // Ограничиваем количество логов
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }
        
        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const container = document.getElementById('logContainer');
        container.innerHTML = this.logs.map(log => 
            `<div class="log-entry log-${log.type}">
                [${log.timestamp}] ${log.message}
            </div>`
        ).join('');
        
        // Автоскролл к последней записи
        container.scrollTop = 0;
    }
}

// Глобальные функции для HTML
async function addButton() {
    await onlineController.addButton();
}

async function exportConfig() {
    onlineController.exportConfig();
}

async function importConfig() {
    onlineController.importConfig();
}

async function resetConfig() {
    await onlineController.resetConfig();
}

function closeModal() {
    onlineController.closeModal();
}

async function performImport() {
    await onlineController.performImport();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('importJson').value = e.target.result;
            document.getElementById('importModal').style.display = 'block';
        };
        reader.readAsText(file);
    }
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('importModal');
    if (event.target === modal) {
        onlineController.closeModal();
    }
}

// Инициализация онлайн контроллера
const onlineController = new OnlineAdvancedController();
