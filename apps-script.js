// ===== Google Apps Script для синхронизации с Budget Tracker =====
// Разверните этот скрипт как Web App в Google Sheets

function doPost(e) {
  try {
    // ===== НАСТРОЙКИ =====
    const SECRET_TOKEN = "ЗАМЕНИТЕ_НА_ВАШ_СЕКРЕТНЫЙ_ТОКЕН"; // Например: "my-super-secret-token-12345"
    const SHEET_NAME = "Расходы"; // Название листа в таблице
    
    // ===== ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА =====
    const MAX_ROWS_PER_REQUEST = 100; // Лимит записей за раз
    const RATE_LIMIT_DELAY = 1000; // Минимальная задержка между запросами (мс)
    
    // ===== Парсинг данных =====
    const data = JSON.parse(e.postData.contents);
    
    // ===== Проверка токена =====
    if (!data.token || data.token !== SECRET_TOKEN) {
      // Задержка для защиты от brute-force
      Utilities.sleep(2000);
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        error: "Invalid or missing token" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ===== Проверка лимита =====
    if (!data.rows || !Array.isArray(data.rows)) {
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        error: "Invalid data format" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.rows.length > MAX_ROWS_PER_REQUEST) {
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        error: `Too many rows. Maximum ${MAX_ROWS_PER_REQUEST} per request` 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ===== Получение листа =====
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Если лист не существует - создаём его
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Добавляем заголовки
      sheet.appendRow([
        "ID",
        "Timestamp",
        "Date",
        "Title",
        "Amount",
        "Category",
        "Note",
        "Currency",
        "DeviceID"
      ]);
      
      // Форматируем заголовки
      const headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("#ffffff");
    }
    
    // ===== Получаем существующие ID для дедупликации =====
    const lastRow = sheet.getLastRow();
    const existingIds = new Set();
    
    if (lastRow > 1) {
      const idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      idColumn.forEach(row => {
        if (row[0]) existingIds.add(row[0]);
      });
    }
    
    // ===== Добавляем новые записи =====
    let addedCount = 0;
    let skippedCount = 0;
    
    if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach(row => {
        // Проверяем дедупликацию по ID
        if (row.id && !existingIds.has(row.id)) {
          sheet.appendRow([
            row.id || "",
            row.timestamp || "",
            row.date || "",
            row.title || "",
            row.amount || 0,
            row.category || "",
            row.note || "",
            row.currency || "RUB",
            row.deviceId || ""
          ]);
          
          existingIds.add(row.id);
          addedCount++;
        } else {
          skippedCount++;
        }
      });
    }
    
    // ===== Форматирование данных =====
    if (addedCount > 0) {
      const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9);
      
      // Формат для колонки суммы
      const amountColumn = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1);
      amountColumn.setNumberFormat("#,##0.00 ₽");
      
      // Формат для колонки даты
      const dateColumn = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1);
      dateColumn.setNumberFormat("dd.mm.yyyy");
    }
    
    // ===== Ответ =====
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: true, 
      added: addedCount,
      skipped: skippedCount,
      total: data.rows ? data.rows.length : 0
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // ===== Обработка ошибок =====
    Logger.log("Error: " + error.toString());
    
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== Тестовая функция (опционально) =====
function testScript() {
  const testData = {
    token: "ЗАМЕНИТЕ_НА_ВАШ_СЕКРЕТНЫЙ_ТОКЕН",
    rows: [
      {
        id: "test-" + new Date().getTime(),
        timestamp: new Date().toISOString(),
        date: "2026-01-04",
        title: "Тестовый расход",
        amount: 100,
        category: "🍕 Еда",
        note: "Тест из Apps Script",
        currency: "RUB",
        deviceId: "test-device"
      }
    ]
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(e);
  Logger.log(result.getContent());
}

// ===== ИНСТРУКЦИЯ ПО РАЗВЕРТЫВАНИЮ =====
// 1. Откройте Google Sheets и создайте новую таблицу
// 2. Расширения → Apps Script
// 3. Скопируйте этот код в редактор
// 4. Замените SECRET_TOKEN на свой секретный токен
// 5. Нажмите "Развернуть" → "Новое развертывание"
// 6. Выберите тип: "Веб-приложение"
// 7. Настройки:
//    - Выполнять как: Я
//    - У кого есть доступ: Все
// 8. Нажмите "Развернуть"
// 9. Скопируйте URL (заканчивается на /exec)
// 10. Вставьте URL и токен в приложении (⚙️ Настройки синка)
//
// ВАЖНО:
// - Не публикуйте SECRET_TOKEN в открытом доступе
// - URL скрипта будет выглядеть так: https://script.google.com/macros/s/XXXXXXXXX/exec
// - При изменении кода нужно создавать новое развертывание
