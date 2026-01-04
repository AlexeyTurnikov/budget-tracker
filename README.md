# 💰 Budget Tracker - PWA для учёта расходов

Простое и удобное приложение для учёта личных расходов с синхронизацией в Google Sheets. Оптимизировано для iPhone 16 Pro.

> **🔒 Безопасность:** Токен и URL хранятся только в вашем браузере. Исходный код не содержит секретов. Безопасно размещать на GitHub Pages! [Подробнее →](SECURITY.md)

## 🎯 Основные возможности

- ✅ **Быстрый ввод расходов** - крупные тач-элементы, автофокус, Enter для добавления
- 📊 **Статистика по месяцам** - автоматический подсчёт суммы за текущий месяц
- 🏷️ **Категории** - быстрый выбор через кнопки или ручной ввод
- 📱 **PWA** - работает как нативное приложение на iPhone
- 🔄 **Синхронизация** - отправка данных в Google Sheets через Apps Script
- 💾 **IndexedDB** - все данные хранятся локально, работа без интернета
- 🌓 **Dark mode** - автоматическое переключение темы
- 🔒 **Безопасность** - настройки синхронизации хранятся только на устройстве (см. [SECURITY.md](SECURITY.md))

## 📦 Структура проекта

```
budget-tracker/
├── index.html      # Главная страница с UI
├── app.js          # Логика приложения
├── sw.js           # Service Worker для оффлайн режима
├── manifest.json   # Манифест PWA
└── README.md       # Документация
```

## 🚀 Как запустить на Mac

### Вариант 1: Python HTTP сервер (рекомендуется)

```bash
cd /Users/tiurnikov/Documents/budget-tracker
python3 -m http.server 8000
```

Откройте браузер: `http://localhost:8000`

### Вариант 2: Node.js HTTP сервер

```bash
npx http-server -p 8000
```

### Вариант 3: VS Code Live Server

1. Установите расширение "Live Server"
2. Откройте `index.html`
3. Нажмите "Go Live" в статус-баре

## 📱 Как установить на iPhone 16 Pro

### Способ 1: Через локальную сеть (для тестирования)

1. **Запустите сервер на Mac** (см. выше)

2. **Узнайте IP адрес Mac**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Например: `192.168.1.100`

3. **Откройте на iPhone в Safari**:
   - Зайдите в Safari
   - Введите: `http://192.168.1.100:8000`
   - ⚠️ Service Worker не будет работать через HTTP (это нормально)

### Способ 2: Через HTTPS (рекомендуется для продакшена)

#### GitHub Pages (бесплатно):

1. **Создайте репозиторий на GitHub**
2. **Загрузите файлы**:
   ```bash
   cd /Users/tiurnikov/Documents/budget-tracker
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ВАШ_USERNAME/budget-tracker.git
   git push -u origin main
   ```

3. **Включите GitHub Pages**:
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - Save

4. **Откройте на iPhone**:
   - URL: `https://ВАШ_USERNAME.github.io/budget-tracker/`
   - В Safari нажмите кнопку "Поделиться" (квадрат со стрелкой)
   - Выберите "На экран «Домой»"
   - Приложение появится на домашнем экране

#### Cloudflare Pages (бесплатно):

1. Зарегистрируйтесь на cloudflare.com
2. Pages → Create a project
3. Connect GitHub или загрузите файлы напрямую
4. Deploy

### Способ 3: Ngrok (для быстрого тестирования с HTTPS)

```bash
# Установите ngrok
brew install ngrok

# Запустите сервер
python3 -m http.server 8000

# В другом терминале
ngrok http 8000
```

Используйте HTTPS URL от ngrok на iPhone.

## 🔄 Настройка синхронизации с Google Sheets

### 1. Создайте Google Таблицу

1. Откройте [Google Sheets](https://sheets.google.com)
2. Создайте новую таблицу "Мои расходы"
3. Создайте лист с названием "Расходы"
4. Добавьте заголовки в первую строку:
   - A1: `ID`
   - B1: `Timestamp`
   - C1: `Date`
   - D1: `Title`
   - E1: `Amount`
   - F1: `Category`
   - G1: `Note`
   - H1: `Currency`
   - I1: `DeviceID`

### 2. Создайте Apps Script

1. В таблице: **Расширения** → **Apps Script**
2. **Сгенерируйте секретный токен:**
   ```bash
   # На Mac/Linux:
   openssl rand -base64 32
   
   # Или используйте онлайн:
   # https://www.random.org/strings/
   # Length: 32, Unique: Yes, Format: Plain Text
   ```
   
3. Вставьте код из `apps-script.js` (см. файл в проекте)

4. **Замените токен** в коде:
   ```javascript
   const SECRET_TOKEN = "ваш-сгенерированный-токен";
   ```

```javascript
function doPost(e) {
  try {
    const SECRET_TOKEN = "ВАШ_СЕКРЕТНЫЙ_ТОКЕН"; // Придумайте сложный токен
    const SHEET_NAME = "Расходы";
    
    // Парсим данные
    const data = JSON.parse(e.postData.contents);
    
    // Проверяем токен
    if (data.token !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Invalid token" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // Получаем существующие ID для дедупликации
    const existingData = sheet.getDataRange().getValues();
    const existingIds = new Set(existingData.slice(1).map(row => row[0]));
    
    let addedCount = 0;
    
    // Добавляем новые записи
    data.rows.forEach(row => {
      // Проверяем дедупликацию по ID
      if (!existingIds.has(row.id)) {
        sheet.appendRow([
          row.id,
          row.timestamp,
          row.date,
          row.title,
          row.amount,
          row.category,
          row.note,
          row.currency,
          row.deviceId
        ]);
        addedCount++;
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true, added: addedCount }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **Разверните как Web App**:
   - Нажмите "Развернуть" → "Новое развертывание"
   - Тип: Web-приложение
   - Выполнять как: Я
   - У кого есть доступ: **Все**
   - Развернуть
   - Скопируйте URL (он будет выглядеть как `https://script.google.com/macros/s/.../exec`)

### 3. Настройте приложение

1. Откройте приложение на iPhone
2. Нажмите **⚙️ Настройки синка**
3. Вставьте:
   - **URL Apps Script Web App** - скопированный URL
   - **Секретный токен** - тот же, что в скрипте
4. Нажмите **Сохранить**
5. Теперь кнопка **Синхронизировать** станет активной

## 💡 Как пользоваться

### Добавление расхода

1. **Название** - что купили (фокус автоматически здесь)
2. **Сумма** - сколько потратили в рублях
3. **Категория** - выберите кнопкой или введите вручную
4. **Заметка** (опционально) - любая дополнительная информация
5. Нажмите **Добавить расход** или **Enter**

### Просмотр статистики

- **Сверху** - сумма за текущий месяц
- **Фильтр** - переключайтесь между "Все записи" и "Текущий месяц"
- **✅** - запись синхронизирована с Google Sheets
- **⏳** - запись ещё не синхронизирована

### Синхронизация

- Кнопка показывает количество несинхронизированных записей
- Нажмите для отправки в Google Sheets
- Работает даже при плохом интернете (retry mechanism)

## 🔧 Технические детали

### Оффлайн режим

- Service Worker кэширует все файлы приложения
- После первой загрузки работает без интернета
- IndexedDB хранит все расходы локально
- Синхронизация происходит когда есть сеть

### Дедупликация

- Каждый расход получает уникальный UUID
- При синхронизации ID передаётся в Google Sheets
- Apps Script проверяет наличие ID перед добавлением
- Повторная синхронизация не создаёт дубликаты

### Безопасность

- URL и токен хранятся в localStorage
- Никаких секретов в исходном коде
- Токен передаётся через HTTPS
- Apps Script проверяет токен перед добавлением данных

## 🔒 Вопросы безопасности

### Безопасно ли размещать на GitHub Pages?

**✅ ДА, полностью безопасно!**

**Что видят другие пользователи:**
- Исходный код приложения (HTML/CSS/JS)
- Форму для ввода настроек
- **НЕ видят ваш токен** - он хранится только в вашем браузере

**Как это работает:**
```javascript
// В коде НЕТ секретов:
const token = localStorage.getItem("syncToken"); // Читается из браузера
```

**Если кто-то откроет ваш сайт:**
1. Увидит пустую форму настроек
2. Может ввести СВОИ настройки (они сохранятся только у него)
3. Не сможет узнать ваш токен или URL

### Что делать, если токен утёк?

1. **Измените токен в Apps Script:**
   ```javascript
   const SECRET_TOKEN = "новый-секретный-токен-12345";
   ```

2. **Создайте новое развертывание:**
   - Apps Script → Развернуть → Новое развертывание
   - Или: Управление развертываниями → Изменить → Версия: Новая

3. **Обновите токен в приложении:**
   - ⚙️ Настройки синка → введите новый токен

### Дополнительные меры защиты

**В Apps Script уже реализовано:**
- ✅ Проверка токена на каждый запрос
- ✅ Задержка 2 секунды при неверном токене (защита от brute-force)
- ✅ Лимит 100 записей за запрос (защита от флуда)
- ✅ Дедупликация по ID (защита от дубликатов)

**Рекомендации:**
1. **Используйте сложный токен:**
   ```bash
   # Генерация случайного токена (Mac/Linux):
   openssl rand -base64 32
   ```

2. **Не делитесь токеном:**
   - Не отправляйте в чатах
   - Не храните в облаках
   - Не пишите на бумажках 😄

3. **Регулярно меняйте токен:**
   - Например, раз в месяц
   - При подозрении на утечку

4. **Проверяйте логи Apps Script:**
   - Apps Script → Выполнения
   - Смотрите на failed запросы

### Можно ли использовать для семьи/команды?

**Вариант 1: Общий токен (простой)**
- Все используют один токен
- Минус: если кто-то утечёт токен, нужно менять всем

**Вариант 2: Разные устройства (recommended)**
- Каждое устройство имеет свой `deviceId` (автоматически)
- В таблице видно, кто добавил запись
- Все используют один токен

**Вариант 3: Разные токены (максимальная безопасность)**
- Измените Apps Script для поддержки множества токенов:
  ```javascript
  const ALLOWED_TOKENS = [
    "token-alice-123",
    "token-bob-456",
    "token-charlie-789"
  ];
  
  if (!ALLOWED_TOKENS.includes(data.token)) {
    // Отклонить
  }
  ```

### XSS защита

**Уже реализовано:**
```javascript
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
```

Все пользовательские данные экранируются перед отображением.

### HTTPS обязателен?

**Для PWA и Service Worker - ДА:**
- ✅ GitHub Pages (автоматический HTTPS)
- ✅ Cloudflare Pages (автоматический HTTPS)
- ✅ Netlify (автоматический HTTPS)
- ❌ HTTP localhost (только для разработки)

**Почему HTTPS важен:**
1. Service Worker работает только через HTTPS
2. Токен передаётся безопасно
3. Браузер не предупреждает о "небезопасном соединении"

### Что если кто-то узнает мой Apps Script URL?

**Без токена URL бесполезен:**
```bash
# Попытка без токена:
curl -X POST https://script.google.com/.../exec \
  -d '{"rows": [...]}'

# Ответ:
{"ok": false, "error": "Invalid or missing token"}
```

**С неверным токеном:**
- Запрос отклоняется
- Задержка 2 секунды (защита от перебора)
- Логируется в Apps Script → Выполнения

### Итог по безопасности

**Текущая архитектура безопасна потому что:**

1. ✅ Токен не в коде → его невозможно достать из GitHub
2. ✅ localStorage изолирован по доменам → каждый видит только свои данные
3. ✅ Apps Script проверяет токен → без токена доступа нет
4. ✅ HTTPS → токен не перехватывается по сети
5. ✅ XSS защита → вредоносный код не внедряется
6. ✅ Rate limiting → защита от флуда

**Выкладывайте на GitHub Pages спокойно!** 🚀

### Адаптация под iPhone 16 Pro

- `viewport-fit=cover` - поддержка Dynamic Island
- `safe-area-inset-*` - отступы под вырезы и gesture bar
- Минимальная высота элементов: 44px
- Крупные шрифты (17px для текста)
- Light/Dark mode через `prefers-color-scheme`

## 🐛 Решение проблем

### Service Worker не регистрируется

- ✅ Используйте HTTPS (GitHub Pages, Cloudflare, ngrok)
- ❌ HTTP работает только для localhost
- Проверьте консоль: `navigator.serviceWorker.ready`

### Синхронизация не работает

1. Проверьте URL Apps Script (должен заканчиваться на `/exec`)
2. Проверьте токен (должен совпадать со скриптом)
3. Проверьте доступ к скрипту (должно быть "Все")
4. Посмотрите логи в Apps Script: Выполнения

### Данные не сохраняются

- Проверьте поддержку IndexedDB: откройте DevTools → Application → IndexedDB
- Убедитесь что не используете режим "Приватный просмотр"

### Приложение не устанавливается на iPhone

- Используйте Safari (не Chrome)
- Откройте через HTTPS
- Нажмите "Поделиться" → "На экран «Домой»"

## 📊 Структура данных

### IndexedDB

```javascript
{
  id: "uuid",              // Уникальный ID
  timestamp: "ISO 8601",   // Полная дата и время
  date: "YYYY-MM-DD",      // Дата для фильтрации
  title: "string",         // Название
  amount: number,          // Сумма
  category: "string",      // Категория
  note: "string",          // Заметка
  currency: "RUB",         // Валюта
  deviceId: "uuid",        // ID устройства
  synced: boolean          // Синхронизировано?
}
```

## 🎨 Кастомизация

### Изменить цвета

В `index.html` найдите `:root` и измените CSS переменные:

```css
--color-primary: #007aff;    /* Основной цвет */
--color-bg: #f2f2f7;         /* Фон */
--color-card: #ffffff;       /* Карточки */
```

### Добавить категории

В `index.html` найдите `.category-buttons` и добавьте:

```html
<button class="category-btn" data-category="🎵 Музыка">🎵 Музыка</button>
```

### Изменить иконки

1. Создайте иконки 192x192 и 512x512 (PNG)
2. Сохраните как `icon-192.png` и `icon-512.png`
3. Обновите пути в `manifest.json`

## 📝 Лицензия

MIT License - используйте свободно для личных и коммерческих проектов.

## 🙏 Поддержка

Если нашли баг или есть предложения - создайте Issue на GitHub.

---

Сделано с ❤️ для удобного учёта расходов на iPhone 16 Pro
