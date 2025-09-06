# CONTRIBUTING

**Story Squares** — веб-приложение для создания квадратных фото-карточек: загружаем изображения, двигаем/масштабируем, пишем подпись, экспортируем в **PNG** и **PDF**. Всё выполняется локально в браузере.

> Проект в активной разработке (MVP). Делаем **маленькие** коммиты: 1–2 файла за раз.

---

## Технологии

- **React + Vite + TypeScript**
- **Tailwind v4** (OKLCH; темы light/dark/system)
- UI-примитивы **shadcn/ui** (Dialog, Button, Select, Progress, …)
- **Zustand** — глобальное состояние
- Экспорт: **Canvas** (PNG) и **pdf-lib** (PDF)
- Dev-сервер: **5175**, деплой на GitHub Pages (сборка в `docs/`)

---

## Запуск

```bash
npm i
npm run dev

# продакшн-сборка (в /docs для GitHub Pages)
npm run build
npm run preview
````

`vite.config.ts` уже содержит `base: '/story-squares/'` для Pages.

---

## Структура исходников (актуально)

```
src/
├─ components/
│  ├─ ui/
│  │  ├─ CardEditorDialog.tsx   # модалка редактирования: пан/зуум + textarea подписи
│  │  ├─ CardItem.tsx           # карточка: точный bitmap-превью, кнопки ×/Edit/PNG
│  │  ├─ CardsPreview.tsx       # грид карточек + блок “Export the collection to PDF”
│  │  ├─ PreviewDialog.tsx      # просмотр изображения (натуральное разрешение) + Edit/Save PNG
│  │  └─ TextSection.tsx        # демонстрационный блок
│  └─ UploadPanel.tsx           # верхний блок управления: “Cards”, выбор файлов (D&D оставлен в коде)
├─ hooks/
│  └─ useAutoThemeClass.ts      # навешивает класс темы на <html>
├─ lib/
│  ├─ exportImage.ts            # экспорт PNG и точный рендер превью (Canvas)
│  ├─ imageLoader.ts            # File → objectURL → PhotoItem
│  ├─ pdf.ts                    # сборка PDF (квадрат на страницу) + прогресс
│  └─ utils.ts
├─ store/
│  └─ useProjectStore.ts        # Zustand: photos, captions, transforms
├─ App.tsx
├─ index.css                    # Tailwind и токены темы
├─ main.tsx
└─ vite-env.d.ts
```

**Правила проекта**

* Все комментарии в исходниках — **на английском**.
* Компоненты — тонкие; бизнес-логика в `lib/` и `store/`.
* Абсолютные импорты через `@/…`.

---

## Модель данных (Zustand)

`store/useProjectStore.ts`

```ts
type Transform = { scale: number; tx: number; ty: number }; // tx/ty в %, от центра
photos: PhotoItem[];          // { id, url (objectURL), name }
captions: Record<string,string>;
transforms: Record<string, Transform>;
max: 36;

add(items)                    // учитывает max
remove(id)
clear()
setCaption(id, text)
setTransform(id, partial)     // кламп: scale 0.5..4, tx/ty -100..100
resetTransform(id)
```

В компонентах используем селекторы, чтобы не плодить лишние перерисовки.

---

## Рендер и экспорт (единый источник правды)

### 1) Точное превью == финальный PNG

* В `lib/exportImage.ts` доступны:

  * `exportCardPng(photo, caption, { size, bg, captionBg, textColor, transform })`
  * `renderCardExactPreviewUrl(photo, caption, { size, transform })`

* **Превью — это реальный bitmap-снимок** карточки, собранный теми же вычислениями, что и `exportCardPng`, и затем даунскейленный.
  Благодаря этому превью в гриде **совпадает** с итоговым PNG/PDF.

* **Детали математики**

  * Раскладка фото имитирует `object-fit: cover` и применяет `translate(%) + scale()` из `Transform`.
  * Метрики подписи централизованы и используются и в превью, и в экспорте:

    ```ts
    const CAP_BAR_FRAC = 0.06;  // минимальная высота плашки = 6% стороны
    const CAP_MIN_BAR  = 72;    // нижняя граница в px для маленьких размеров
    const CAP_PAD_FRAC = 0.22;  // внутренние отступы
    const CAP_FONT_FRAC = 0.34; // размер шрифта относительно плашки
    ```

    В хелпере считаются `{ minBarH, pad, fontSize, lineHeight }`.
    Переносы учитывают явные `\n`; длинные слова режутся по символам; одна строка — с эллипсисом `…`.

* **Производительность**

  * Размер превью выбирается как `containerWidth × devicePixelRatio` с ограничениями (≈384…1024 px).
  * Возвращается **blob-URL**; предыдущий URL обязательно `revokeObjectURL` во избежание утечек.
  * На время пересчёта показывается **оверлей со спиннером** (`bg-background/80` + лёгкий blur).

### 2) Экспорт в PDF

* `lib/pdf.ts → exportCardsToPdf(photos, captions, transforms, { size, format, quality, onProgress })`
* Одна квадратная страница на карточку; **JPEG** (с `quality`) или **PNG** по выбору пользователя.
* В `CardsPreview.tsx` `pdf-lib` **лениво импортируется** при старте экспорта, чтобы не раздувать основной бандл.
* Прогресс-бар и статус выводятся **над** контролами и **сразу скрываются** после завершения (сброс состояния).

---

## UI/UX-контракты

* **CardItem**

  * Показывает именно bitmap-превью (никогда не “сырое” фото).
  * Клик по карточке (мимо мини-кнопок) открывает **PreviewDialog**.
  * Кнопки: **Edit**, **Save PNG**, **×** (с `stopPropagation()`).
  * Во время рендера превью — приглушённый оверлей со спиннером.

* **PreviewDialog**

  * Показывает карточку в натуральном разрешении (подгон по вьюпорту).
  * Действия: **Edit** и **Save PNG**.

* **CardEditorDialog**

  * Auto-grow `textarea` подписи; высота сохраняется при повторном открытии; курсор ставится в конец.
  * Слайдеры (Zoom/Horizontal/Vertical) выровнены по ширине превью.
  * **Reset image** сбрасывает только трансформации фото.
    **Cancel/Save** распространяются и на текст, и на трансформации.
  * Доступность: в каждом Dialog есть **`DialogTitle`** и **`DialogDescription`** (или `aria-describedby={undefined}`).

* **Панель экспорта**

  * Видна только если есть хотя бы одна карточка.
  * Заголовок: **“Export the collection to PDF”**.
  * Формат (`JPEG (smaller)` / `PNG (lossless)`), слайдер качества для JPEG, кнопка **Export PDF**.
  * Статус рендера отображается **сверху** панели и очищается по завершении.

---

## Code style

* TypeScript strict; без `any`, если можно обойтись.
* Мемоизируйте тяжёлые вычисления/колбэки (`useMemo`, `useCallback`).
* Каждый созданный blob-URL обязательно ревокаем.
* Держим компоненты небольшими; расчёты — в `lib/`.

---

## Коммиты

Используем **Conventional Commits**:

* `feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, `docs:`, `ui:` …
* Один коммит — одна законченная правка.
* Примеры:

  * `ui(card): exact bitmap preview with spinner overlay`
  * `feat(viewer): add PreviewDialog and wire card click`
  * `fix(editor): keep textarea height across opens`
  * `perf(pdf): lazy-load pdf-lib and show progress`
