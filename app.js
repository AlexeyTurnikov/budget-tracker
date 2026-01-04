// ===== Budget Tracker - Основной скрипт =====
// Все настройки хранятся в localStorage, никаких секретов в коде

// ===== Константы =====
const DB_NAME = "budgetDB";
const STORE_NAME = "expenses";
const DB_VERSION = 1;

// ===== DOM элементы =====
const elements = {
  // Форма добавления
  title: document.getElementById("title"),
  amount: document.getElementById("amount"),
  category: document.getElementById("category"),
  note: document.getElementById("note"),
  addBtn: document.getElementById("addBtn"),
  status: document.getElementById("status"),
  
  // Категории
  categoryBtns: document.querySelectorAll(".category-btn"),
  
  // Список расходов
  expenseList: document.getElementById("expenseList"),
  filterSelect: document.getElementById("filterSelect"),
  
  // Месячная сумма
  monthlyAmount: document.getElementById("monthlyAmount"),
  monthlyLabel: document.getElementById("monthlyLabel"),
  
  // Синхронизация
  syncBtn: document.getElementById("syncBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  
  // Модалка настроек
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  syncUrl: document.getElementById("syncUrl"),
  syncToken: document.getElementById("syncToken"),
  toggleTokenBtn: document.getElementById("toggleTokenBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  settingsStatus: document.getElementById("settingsStatus")
};

// ===== Утилиты =====

// UUID генератор для уникальных ID расходов
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Device ID для идентификации устройства
function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = generateUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// Текущая дата в ISO формате
function getTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Получить текущий месяц в формате YYYY-MM
function getCurrentMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Получить название месяца на русском
function getMonthName(yearMonth) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

// Форматирование суммы
function formatAmount(amount) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// Показать статус
function showStatus(message, type = "info") {
  elements.status.textContent = message;
  elements.status.className = "status";
  if (type) {
    elements.status.classList.add(type);
  }
  
  // Автоматически скрывать через 5 секунд
  setTimeout(() => {
    if (elements.status.textContent === message) {
      elements.status.textContent = "";
      elements.status.className = "status";
    }
  }, 5000);
}

// Показать статус в настройках
function showSettingsStatus(message, type = "info") {
  elements.settingsStatus.textContent = message;
  elements.settingsStatus.className = "status mt-2";
  if (type) {
    elements.settingsStatus.classList.add(type);
  }
  
  setTimeout(() => {
    if (elements.settingsStatus.textContent === message) {
      elements.settingsStatus.textContent = "";
      elements.settingsStatus.className = "status mt-2";
    }
  }, 5000);
}

// ===== Управление настройками синхронизации =====

function getSyncSettings() {
  const url = localStorage.getItem("syncUrl") || "";
  const token = localStorage.getItem("syncToken") || "";
  return { url, token };
}

function saveSyncSettings(url, token) {
  localStorage.setItem("syncUrl", url.trim());
  localStorage.setItem("syncToken", token.trim());
}

function hasSyncSettings() {
  const { url, token } = getSyncSettings();
  return url.length > 0 && token.length > 0;
}

// ===== IndexedDB =====

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }
    };
  });
}

async function dbAddExpense(expense) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(expense);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAllExpenses() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function dbMarkAsSynced(ids) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    let completed = 0;
    ids.forEach((id) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const expense = getRequest.result;
        if (expense) {
          expense.synced = true;
          store.put(expense);
        }
        completed++;
        if (completed === ids.length) {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
    
    if (ids.length === 0) {
      resolve();
    }
  });
}

// ===== Логика приложения =====

// Добавить расход
async function addExpense() {
  try {
    // Валидация
    const title = elements.title.value.trim();
    const amount = parseFloat(elements.amount.value);
    const category = elements.category.value.trim() || "📱 Другое";
    const note = elements.note.value.trim();
    
    if (!title) {
      showStatus("Введите название расхода", "error");
      elements.title.focus();
      return;
    }
    
    if (!amount || amount <= 0 || !isFinite(amount)) {
      showStatus("Введите корректную сумму больше 0", "error");
      elements.amount.focus();
      return;
    }
    
    // Создаем объект расхода
    const expense = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      date: getTodayISO(),
      title,
      amount,
      category,
      note,
      currency: "RUB",
      deviceId: getDeviceId(),
      synced: false
    };
    
    // Сохраняем в IndexedDB
    await dbAddExpense(expense);
    
    // Очищаем форму (кроме категории для быстрого ввода)
    elements.title.value = "";
    elements.amount.value = "";
    elements.note.value = "";
    
    // Возвращаем фокус на поле названия
    elements.title.focus();
    
    showStatus("Расход добавлен ✅", "success");
    
    // Обновляем интерфейс
    await renderExpenses();
    updateSyncButton();
    
  } catch (error) {
    console.error("Ошибка при добавлении расхода:", error);
    showStatus("Ошибка: " + error.message, "error");
  }
}

// Отрисовка списка расходов
async function renderExpenses() {
  try {
    const allExpenses = await dbGetAllExpenses();
    const filter = elements.filterSelect.value;
    const currentMonth = getCurrentMonth();
    
    // Фильтрация
    let expenses = allExpenses;
    if (filter === "month") {
      expenses = allExpenses.filter(e => e.date.startsWith(currentMonth));
    }
    
    // Сортировка по времени (новые сверху)
    expenses.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Отрисовка списка
    if (expenses.length === 0) {
      elements.expenseList.innerHTML = `
        <div class="empty-state">
          ${filter === "month" ? "Нет расходов за текущий месяц" : "Нет расходов"}
        </div>
      `;
    } else {
      elements.expenseList.innerHTML = expenses.map(expense => {
        const syncIcon = expense.synced ? "✅" : "⏳";
        const date = new Date(expense.timestamp).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short"
        });
        
        return `
          <li class="expense-item">
            <div class="expense-info">
              <div class="expense-title">${escapeHtml(expense.title)}</div>
              <div class="expense-meta">
                ${date} • ${escapeHtml(expense.category)}
                ${expense.note ? " • " + escapeHtml(expense.note) : ""}
              </div>
            </div>
            <div class="expense-amount">${formatAmount(expense.amount)} ₽</div>
            <div class="expense-sync">${syncIcon}</div>
          </li>
        `;
      }).join("");
    }
    
    // Обновляем сумму за месяц
    updateMonthlySummary(allExpenses);
    
  } catch (error) {
    console.error("Ошибка при отрисовке расходов:", error);
    elements.expenseList.innerHTML = `
      <div class="empty-state">Ошибка загрузки данных</div>
    `;
  }
}

// Обновить сумму за месяц
function updateMonthlySummary(allExpenses) {
  const currentMonth = getCurrentMonth();
  const monthExpenses = allExpenses.filter(e => e.date.startsWith(currentMonth));
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  elements.monthlyAmount.textContent = `${formatAmount(total)} ₽`;
  elements.monthlyLabel.textContent = `За ${getMonthName(currentMonth)}`;
}

// Escape HTML для безопасности
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Обновить состояние кнопки синхронизации
async function updateSyncButton() {
  try {
    const hasSettings = hasSyncSettings();
    const allExpenses = await dbGetAllExpenses();
    const unsyncedExpenses = allExpenses.filter(e => !e.synced);
    
    if (!hasSettings) {
      elements.syncBtn.disabled = true;
      elements.syncBtn.textContent = "⚙️ Настройте синк";
    } else if (unsyncedExpenses.length === 0) {
      elements.syncBtn.disabled = true;
      elements.syncBtn.textContent = "✅ Всё синхронизировано";
    } else {
      elements.syncBtn.disabled = false;
      elements.syncBtn.textContent = `📤 Синхронизировать (${unsyncedExpenses.length})`;
    }
  } catch (error) {
    console.error("Ошибка при обновлении кнопки синка:", error);
  }
}

// Синхронизация с сервером
async function syncExpenses() {
  try {
    const { url, token } = getSyncSettings();
    
    if (!url || !token) {
      showStatus("Настройте синхронизацию в настройках", "error");
      return;
    }
    
    const allExpenses = await dbGetAllExpenses();
    const unsyncedExpenses = allExpenses.filter(e => !e.synced);
    
    if (unsyncedExpenses.length === 0) {
      showStatus("Нечего синхронизировать", "info");
      return;
    }
    
    showStatus(`Отправка ${unsyncedExpenses.length} записей...`, "info");
    
    // Подготовка данных для отправки
    const payload = {
      token: token,
      rows: unsyncedExpenses.map(e => ({
        id: e.id, // ID для дедупликации
        timestamp: e.timestamp,
        date: e.date,
        title: e.title,
        amount: e.amount,
        category: e.category,
        note: e.note,
        currency: e.currency,
        deviceId: e.deviceId
      }))
    };
    
    // Отправка данных
    // Используем text/plain для обхода CORS проблем с Apps Script
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      
      // Пытаемся прочитать ответ
      let result;
      try {
        result = await response.json();
      } catch (e) {
        // Если не можем прочитать JSON, считаем что отправка успешна
        result = { ok: true };
      }
      
      if (response.ok && result.ok !== false) {
        // Помечаем как синхронизированные
        const ids = unsyncedExpenses.map(e => e.id);
        await dbMarkAsSynced(ids);
        
        showStatus(`✅ Синхронизировано ${unsyncedExpenses.length} записей`, "success");
        await renderExpenses();
        updateSyncButton();
      } else {
        throw new Error(result.error || "Ошибка сервера");
      }
      
    } catch (fetchError) {
      // Fallback: отправляем в режиме no-cors (не можем прочитать ответ, но запрос уходит)
      console.warn("Основной запрос не прошёл, пробуем no-cors:", fetchError);
      
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      
      // Помечаем как синхронизированные (верим что запрос дошёл)
      const ids = unsyncedExpenses.map(e => e.id);
      await dbMarkAsSynced(ids);
      
      showStatus(`✅ Отправлено ${unsyncedExpenses.length} записей (проверьте таблицу)`, "success");
      await renderExpenses();
      updateSyncButton();
    }
    
  } catch (error) {
    console.error("Ошибка синхронизации:", error);
    showStatus("Ошибка синхронизации: " + error.message, "error");
  }
}

// ===== Управление модалкой настроек =====

function openSettingsModal() {
  const { url, token } = getSyncSettings();
  elements.syncUrl.value = url;
  elements.syncToken.value = token;
  elements.settingsModal.classList.add("active");
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove("active");
}

function toggleTokenVisibility() {
  const isPassword = elements.syncToken.type === "password";
  elements.syncToken.type = isPassword ? "text" : "password";
  elements.toggleTokenBtn.textContent = isPassword ? "Скрыть" : "Показать";
}

function saveSettings() {
  const url = elements.syncUrl.value.trim();
  const token = elements.syncToken.value.trim();
  
  if (!url) {
    showSettingsStatus("Введите URL Apps Script", "error");
    return;
  }
  
  if (!token) {
    showSettingsStatus("Введите токен", "error");
    return;
  }
  
  saveSyncSettings(url, token);
  showSettingsStatus("✅ Настройки сохранены", "success");
  updateSyncButton();
  
  setTimeout(() => {
    closeSettingsModal();
  }, 1000);
}

// ===== Обработчики категорий =====

function setupCategoryButtons() {
  elements.categoryBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      elements.category.value = category;
      
      // Визуальная обратная связь
      elements.categoryBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      // Небольшая задержка для анимации
      setTimeout(() => {
        btn.classList.remove("selected");
      }, 300);
    });
  });
}

// ===== Service Worker регистрация =====

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      console.log("Service Worker зарегистрирован:", registration.scope);
    } catch (error) {
      console.log("Service Worker не зарегистрирован:", error);
    }
  }
}

// ===== Инициализация =====

async function init() {
  // Регистрация Service Worker
  registerServiceWorker();
  
  // Настройка категорий
  setupCategoryButtons();
  
  // Загрузка и отрисовка расходов
  await renderExpenses();
  updateSyncButton();
  
  // Фокус на поле названия
  elements.title.focus();
  
  // Обработчики событий
  elements.addBtn.addEventListener("click", addExpense);
  elements.syncBtn.addEventListener("click", syncExpenses);
  elements.filterSelect.addEventListener("change", renderExpenses);
  
  // Настройки
  elements.settingsBtn.addEventListener("click", openSettingsModal);
  elements.closeSettingsBtn.addEventListener("click", closeSettingsModal);
  elements.saveSettingsBtn.addEventListener("click", saveSettings);
  elements.toggleTokenBtn.addEventListener("click", toggleTokenVisibility);
  
  // Закрытие модалки по клику вне её
  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      closeSettingsModal();
    }
  });
  
  // Enter для добавления расхода
  elements.title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addExpense();
  });
  
  elements.amount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addExpense();
  });
  
  elements.category.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addExpense();
  });
  
  elements.note.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addExpense();
  });
}

// Запуск при загрузке страницы
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
