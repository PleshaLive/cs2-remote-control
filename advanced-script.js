class AdvancedController {
    constructor() {
        this.buttons = {};
        this.isConnected = false;
        this.checkInterval = null;
        this.logs = [];
        this.localApiUrl = 'http://127.0.0.1:2828/api/local-buttons';
        
        this.init();
    }

    async init() {
        await this.loadButtons();
        this.createButtonsGrid();
        this.startMonitoring();
        this.log('Контроллер инициализирован', 'info');
    }

    async loadButtons() {
        // Сначала пытаемся загрузить с локального API
        try {
            const response = await fetch(this.localApiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.buttons) {
                    this.buttons = data.buttons;
                    this.log('Кнопки загружены с локального сервера', 'success');
                    return;
                }
            }
        } catch (error) {
            this.log('Локальный сервер недоступен, используем localStorage', 'warning');
        }

        // Фоллбэк на localStorage
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
        
        // Кнопки по умолчанию
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
                label: 'Эйс моментъ',
                icon: 'fas fa-crown',
                page: 1,
                row: 2,
                col: 2,
                state: '-',
                timestamp: 0
            }
        };
        
        await this.saveButtons();
        this.log('Использованы кнопки по умолчанию', 'info');
    }

    async saveButtons() {
        const data = { buttons: this.buttons };
        
        // Сохраняем на локальный сервер
        try {
            const response = await fetch(this.localApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.log('Настройки сохранены на локальный сервер', 'success');
            } else {
                throw new Error('Server response error');
            }
        } catch (error) {
            this.log('Ошибка сохранения на сервер, используем localStorage', 'warning');
            localStorage.setItem('cs2-advanced-buttons', JSON.stringify(data));
        }
        
        // Дублируем в localStorage
        localStorage.setItem('cs2-advanced-buttons', JSON.stringify(data));
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
                <button class="btn btn-danger" style="font-size: 12px; padding: 5px 10px; margin-top: 10px;" onclick="controller.removeButton('${key}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            buttonCard.onclick = (e) => {
                if (e.target.closest('button')) return; // Не активировать при клике на кнопку удаления
                this.activateButton(key);
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

        this.log(`Кнопка активирована: ${button.label}`, 'success');

        // Сохраняем состояние
        await this.saveButtons();

        // Автоматическая деактивация через 2 секунды
        setTimeout(async () => {
            button.state = '-';
            button.timestamp = Date.now();
            buttonElement.classList.remove('active');
            buttonElement.querySelector('.button-state').textContent = '-';
            await this.saveButtons();
            this.log(`Кнопка деактивирована: ${button.label}`, 'info');
        }, 2000);
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkConnection();
        }, 2000);
    }

    checkConnection() {
        // Проверяем подключение к локальному серверу
        fetch(this.localApiUrl)
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
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Подключен к GSI</span>';
        } else {
            statusElement.className = 'status-item status-disconnected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>GSI недоступен</span>';
        }
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
            exported: new Date().toISOString()
        };

        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cs2-controller-config-${new Date().toISOString().split('T')[0]}.json`;
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
    await controller.addButton();
}

async function exportConfig() {
    controller.exportConfig();
}

async function importConfig() {
    controller.importConfig();
}

async function resetConfig() {
    await controller.resetConfig();
}

function closeModal() {
    controller.closeModal();
}

async function performImport() {
    await controller.performImport();
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
        controller.closeModal();
    }
}

// Инициализация контроллера
const controller = new AdvancedController();
