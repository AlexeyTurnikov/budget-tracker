#!/bin/bash

echo "🔍 Проверка Budget Tracker"
echo "=========================="
echo ""

echo "✅ Проверяем структуру файлов:"
ls -la index.html app.js 2>/dev/null && echo "  - Файлы найдены" || echo "  ❌ Файлы не найдены"
echo ""

echo "✅ Проверяем последний коммит:"
git log --oneline -1
echo ""

echo "✅ Проверяем синхронизацию с GitHub:"
git status
echo ""

echo "🌐 Ваш сайт доступен по адресу:"
echo "   https://alexeyturnikov.github.io/budget-tracker/"
echo ""

echo "📝 Для проверки:"
echo "   1. Откройте сайт в браузере"
echo "   2. Нажмите Cmd+Option+J (откроется консоль)"
echo "   3. Обновите страницу с Cmd+Shift+R"
echo "   4. Проверьте логи в консоли"
echo "   5. Нажмите на кнопку категории"
echo ""

echo "🧪 Локальный тест:"
echo "   Откройте http://localhost:8000/test-buttons.html"
echo ""

echo "✨ Готово! Проверяйте работу кнопок."
