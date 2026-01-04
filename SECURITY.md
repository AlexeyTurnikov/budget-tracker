# 🔒 Безопасность Budget Tracker

## Главный вопрос: Безопасно ли размещать на GitHub Pages?

### ✅ ДА! Абсолютно безопасно

**Ваш токен НЕ ПОПАДЁТ в исходный код на GitHub.**

## Почему это безопасно?

### 1. Архитектура хранения

```
┌─────────────────────┐
│   GitHub Pages      │  ← Здесь только код приложения
│   (публичный код)   │     БЕЗ секретов
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Ваш браузер       │  ← Здесь localStorage с токеном
│   (приватное)       │     Видите только ВЫ
└─────────────────────┘
          │
          ▼ (HTTPS + токен)
┌─────────────────────┐
│   Apps Script       │  ← Проверяет токен
│   (ваша таблица)    │     Отклоняет без токена
└─────────────────────┘
```

### 2. Что видят другие пользователи вашего сайта?

**Они видят:**
- ✅ Пустую форму для ввода настроек
- ✅ Исходный код приложения (HTML/CSS/JS)
- ✅ Могут ввести СВОИ настройки (сохранятся только у них)

**Они НЕ видят:**
- ❌ Ваш токен
- ❌ Ваш Apps Script URL (если не поделитесь)
- ❌ Ваши данные из localStorage
- ❌ Ваши расходы из IndexedDB

### 3. Проверка в DevTools

Откройте Console и выполните:

```javascript
// Каждый пользователь видит только СВОИ данные:
localStorage.getItem("syncToken") // Ваш токен или null
localStorage.getItem("syncUrl")   // Ваш URL или null
```

**localStorage изолирован по доменам** - это фундаментальная функция безопасности браузеров.

## Генерация безопасного токена

### Вариант 1: OpenSSL (Mac/Linux)

```bash
openssl rand -base64 32
```

Пример вывода: `8Kx9mP2vN4qR6tY1wE3zA5sD7fG9hJ0kL2nM4pQ6r`

### Вариант 2: Python

```python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Вариант 3: Node.js

```javascript
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Вариант 4: Online генератор

1. https://www.random.org/strings/
2. Настройки:
   - Generate: 1 string
   - Length: 32 characters
   - Character set: Alphanumeric
3. Generate Strings

## Что делать если токен утёк?

### Шаг 1: Сгенерируйте новый токен

```bash
openssl rand -base64 32
```

### Шаг 2: Обновите Apps Script

1. Откройте Apps Script
2. Замените `SECRET_TOKEN`:
   ```javascript
   const SECRET_TOKEN = "НОВЫЙ_ТОКЕН_ЗДЕСЬ";
   ```
3. Сохраните (Cmd+S)

### Шаг 3: Создайте новое развертывание

**Вариант A: Новое развертывание**
1. Развернуть → Новое развертывание
2. Тип: Web-приложение
3. Скопируйте новый URL

**Вариант B: Обновить существующее**
1. Развернуть → Управление развертываниями
2. Карандаш → Изменить
3. Версия: Новая
4. Развернуть

### Шаг 4: Обновите настройки в приложении

1. ⚙️ Настройки синка
2. Введите новый токен (и URL если изменился)
3. Сохранить

## Дополнительные меры защиты

### В Apps Script уже реализовано:

```javascript
// ✅ Проверка токена
if (data.token !== SECRET_TOKEN) {
  Utilities.sleep(2000); // Задержка против brute-force
  return { ok: false, error: "Invalid token" };
}

// ✅ Лимит записей
if (data.rows.length > 100) {
  return { ok: false, error: "Too many rows" };
}

// ✅ Дедупликация
if (existingIds.has(row.id)) {
  continue; // Пропускаем дубликаты
}
```

### Мониторинг подозрительной активности

**Проверяйте логи Apps Script:**

1. Apps Script → Выполнения
2. Смотрите статус:
   - ✅ Completed - успешно
   - ❌ Failed - ошибка (возможна атака)

**Что искать:**
- Много Failed с "Invalid token" → попытки перебора
- Неизвестные deviceId → чужие устройства
- Странные timestamp → запросы в необычное время

### Rate Limiting

Если видите атаки, добавьте в Apps Script:

```javascript
// Ограничение: 1 запрос в минуту с одного IP
const cache = CacheService.getScriptCache();
const cacheKey = "ratelimit_" + e.parameter.userIp;

if (cache.get(cacheKey)) {
  return ContentService.createTextOutput(JSON.stringify({ 
    ok: false, 
    error: "Rate limit exceeded. Try again later." 
  }));
}

cache.put(cacheKey, "1", 60); // 60 секунд
```

## Защита от XSS

**Уже реализовано в app.js:**

```javascript
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text; // Автоматическое экранирование
  return div.innerHTML;
}

// Использование:
expense-title">${escapeHtml(expense.title)}</div>
```

**Все пользовательские данные экранируются:**
- ✅ Название расхода
- ✅ Категория
- ✅ Заметка

## HTTPS обязателен?

### Да, для PWA и Service Worker

**Где HTTPS бесплатно и автоматически:**
- ✅ GitHub Pages (`https://username.github.io/budget-tracker/`)
- ✅ Cloudflare Pages
- ✅ Netlify
- ✅ Vercel

**Почему HTTPS важен:**
1. Service Worker работает только через HTTPS (кроме localhost)
2. Токен передаётся безопасно
3. Нет предупреждений браузера
4. Современные API требуют HTTPS

## Использование в команде/семье

### Вариант 1: Общий токен (простой)

**Плюсы:**
- Просто настроить
- Все видят общую таблицу

**Минусы:**
- Если кто-то утечёт токен → менять всем
- Нельзя отозвать доступ у одного человека

**Как различить кто добавил:**
- В таблице есть колонка `DeviceID`
- Каждое устройство имеет уникальный ID

### Вариант 2: Разные токены (безопасно)

Измените Apps Script:

```javascript
const ALLOWED_TOKENS = {
  "token-alice-abc123": "Alice",
  "token-bob-def456": "Bob",
  "token-charlie-ghi789": "Charlie"
};

if (!ALLOWED_TOKENS[data.token]) {
  return { ok: false, error: "Invalid token" };
}

// Добавляем имя пользователя в запись
const userName = ALLOWED_TOKENS[data.token];
```

**Преимущества:**
- Можно отозвать доступ у конкретного человека
- Видно кто именно добавил запись
- Независимые токены

## Вопросы и ответы

### Q: Что если кто-то узнает мой Apps Script URL?

**A:** Без токена URL бесполезен. Все запросы будут отклонены.

```bash
curl -X POST https://script.google.com/.../exec \
  -d '{"rows": [...]}'

# Ответ: {"ok": false, "error": "Invalid or missing token"}
```

### Q: Можно ли использовать одно приложение на нескольких устройствах?

**A:** Да! Просто введите одинаковые настройки (URL + токен) на каждом устройстве.

### Q: Что если забыл токен?

**A:** Токен нигде не хранится кроме вашего браузера. Нужно будет:
1. Создать новый токен
2. Обновить Apps Script
3. Ввести в приложении заново

### Q: Безопасно ли хранить токен в localStorage?

**A:** Да, для данного случая это безопасно потому что:
- localStorage изолирован по доменам
- Доступен только JavaScript с того же домена
- Защищён браузером от XSS (если следовать best practices)
- Альтернативы (cookies, IndexedDB) не безопаснее

**Единственный риск:** если компьютер взломан и вредоносный код получил доступ к браузеру. Но тогда проблема не в localStorage.

### Q: А как насчёт Environment Variables?

**A:** Environment Variables работают на сервере (Node.js, Python и т.д.). 

У нас чисто клиентское приложение (HTML/JS), поэтому:
- ❌ Нет сервера → нет environment variables
- ✅ localStorage - правильный выбор для клиента

## Итоговый чеклист безопасности

Перед размещением на GitHub Pages:

- [ ] ✅ В коде НЕТ секретов (`grep -r "SECRET" .`)
- [ ] ✅ Токен генерируется случайно (не "password123")
- [ ] ✅ Apps Script проверяет токен
- [ ] ✅ HTTPS включён (автоматически на GitHub Pages)
- [ ] ✅ XSS защита через `escapeHtml()`
- [ ] ✅ Rate limiting в Apps Script
- [ ] ✅ Мониторинг логов настроен

## Заключение

**Ваше приложение спроектировано безопасно** и готово к размещению на GitHub Pages.

Основной принцип: **секреты вводятся пользователем, а не хранятся в коде**.

Это стандартный подход для клиентских приложений:
- Todoist, Notion, Trello → API ключи вводятся пользователем
- OAuth приложения → токены получаются через login
- Наше приложение → URL и токен вводятся в UI

🔒 **Выкладывайте спокойно!**
