# 🚀 Быстрый старт

## Тестирование на Mac (прямо сейчас!)

```bash
cd /Users/tiurnikov/Documents/budget-tracker
python3 -m http.server 8000
```

Откройте: http://localhost:8000

## Тестирование на iPhone через локальную сеть

1. **Узнайте IP адрес Mac**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Откройте в Safari на iPhone**:
   ```
   http://ВАШ_IP:8000
   ```
   Например: `http://192.168.1.100:8000`

⚠️ **Важно**: Service Worker не работает через HTTP (кроме localhost). Для полноценного PWA используйте HTTPS (см. README.md).

## Настройка синхронизации

1. **Создайте Google Таблицу** с листом "Расходы"
2. **Скопируйте код** из `apps-script.js` в Apps Script
3. **Замените токен** на свой секретный
4. **Разверните** как Web App (доступ: "Все")
5. **Скопируйте URL** (заканчивается на `/exec`)
6. В приложении: **⚙️ Настройки синка** → вставьте URL и токен

## Развертывание на GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_USERNAME/budget-tracker.git
git push -u origin main
```

Включите GitHub Pages в Settings → Pages → main/root

URL: `https://ВАШ_USERNAME.github.io/budget-tracker/`

## Установка на iPhone

1. Откройте в Safari через HTTPS
2. Нажмите кнопку "Поделиться" (квадрат со стрелкой вверх)
3. Выберите "На экран «Домой»"
4. Готово! Приложение на домашнем экране 🎉

---

Полная документация в [README.md](README.md)
