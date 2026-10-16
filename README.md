# My course

Mobile-friendly course library: 11 sections, 94 documents and 51 linked videos. Includes search, dedicated material screens, notes, a repeat-later list and optional backup video sources.

Videos stream from their original hosts. Local video backups are excluded. Notes and saved preferences are stored in the browser; export/import transfers them between devices. Existing completion flags remain in storage and backups, but are not displayed or changed by the interface. Course materials belong to their respective authors.

Static HTML/CSS/JavaScript, no build step. GitHub Pages serves the main branch root. Relative paths and hash routes work under a repository subpath.

## Document reader

Open http://127.0.0.1:8880/ while running `python3 -m http.server 8880 --bind 127.0.0.1` from this directory. All document links open a dedicated material screen with a PDF.js viewer. The original file remains downloadable.

- 42 existing PDF files are used directly.
- 52 Office files have PDF previews in `previews/`; `preview-manifest.js` maps material IDs to those PDFs.
- Regenerate missing previews using `python3 scripts/build-previews.py` (requires LibreOffice/soffice and pypdf). Originals are unchanged. To regenerate a changed Office source, remove its corresponding generated PDF first.
- XLSX is exported with SinglePageSheets, keeping each sheet together. These previews are read-only; animations, macros and interactive spreadsheets are not retained. Conversion can change fonts/line breaks.
- PDF.js 5.6.205 and its worker/fonts/CMaps/WASM are vendored under `vendor/pdfjs`, including its Apache-2.0 license. No external document-viewing service is used.
- Page navigation, manual page entry, gesture/double-click zoom, automatic page fitting, text selection and local page-position persistence are available. Scanned pages need OCR before text selection is possible.
- Only the active page is rendered. Canvas pixel count is capped for mobile memory safety. Large PDF downloads still depend on the hosting server's range support.

Validation: 94 valid PDF sources/previews; representative PDF, PPTX, PPT, DOCX, DOC and XLSX render in the in-app browser. Mobile 390px and desktop 1024px inspected. Page change, zoom, fullscreen, page persistence tested. Physical iOS/Android devices and every page of every document have not been visually tested.

### Упрощённый экран чтения

Одинаковая навигация на телефоне и компьютере: назад, заметки, меню действий,
документ и нижняя панель `← страница / всего →`. Нажатие на счётчик открывает
переход по номеру. Все документы листаются постранично; длинная страница
прокручивается внутри просмотрщика. Альбомные страницы вписываются в экран,
портретные — по ширине. Двойное нажатие увеличивает страницу; двумя пальцами
можно менять масштаб на сенсорном экране. Сброс масштаба появляется только
после увеличения. Жест двумя пальцами требует проверки на физических устройствах.

Заметки имеют отдельный маршрут `#material/<id>/notes`. Скачивание оригинала,
«Повторить позже» и параметры видео находятся в меню ⋯. Экспорт и импорт данных
доступны через меню в заголовке списка. Формат резервной копии версии 1 и ключ
`instudy-course-progress-v1` сохранены; старые заметки и отметки не требуют миграции.

### Визуальный стиль

Ориентир — [FinHealth](https://unidentifiedraccoon.github.io/FinHealth-demo/):
Manrope, тёмно-синий текст, светлый фон, шаг отступов 4/8 пикселей и контурные
иконки. Общие цвета и шрифт вынесены в `theme.css`; шрифт хранится локально
вместе с лицензией OFL. `icons.js` задаёт единый стиль иконок для списка и читалки.
Вместо бейджей используются четыре типа: видео, документ, презентация и таблица.
Точный формат доступен в подсказке и доступном названии. Вся строка — ссылка
на материал. На телефоне раздел выбирается в списке, на компьютере — в боковом
меню; просмотр материалов и заметок использует одинаковую навигацию.

Проверено в Chrome на ширинах 320, 390, 768, 1024 и 1440 px: список, просмотр
документов и заметки без горизонтального переполнения. Проверены поиск,
навигация с клавиатуры, просмотр PDF/Word/PowerPoint/Excel, загрузка видео,
сохранение заметок и совместимость старых резервных копий.

Публикация: [GitHub Pages](https://unidentifiedraccoon.github.io/instudy-course/),
корень ветки `main`.
