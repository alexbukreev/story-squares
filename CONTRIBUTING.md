# CONTRIBUTING

**Story Squares** — веб-приложение для создания квадратных фото-карточек: загружаем фотографии, кадрируем (zoom/position), пишем подпись, экспортируем PNG и PDF. Всё работает локально в браузере.

> Проект в активной разработке (MVP). Коммиты маленькими шагами: 1–2 файла за раз.

---

## Стек и основные зависимости

* **React + Vite + TypeScript**
* **Tailwind v4** (OKLCH, темы light/dark/system)
* **shadcn/ui** для UI-примитивов
* **Zustand** — глобальный стор
* Экспорт: **Canvas** (PNG), **pdf-lib** (PDF)
* Дев-сервер: `5175`, деплой GitHub Pages (сборка в `docs/`)

---

## Запуск

```bash
npm i
npm run dev
# сборка (в /docs для GitHub Pages)
npm run build
npm run preview
```

В `vite.config.ts` `base` уже настроен на `'/story-squares/'` для Pages.

---

## Структура проекта (актуально)

```
src/
├─ assets/
├─ components/
│  └─ ui/
│     ├─ CardEditorDialog.tsx   # модалка редактирования (zoom/position, caption)
│     ├─ CardItem.tsx           # карточка: превью, кнопки ×/Edit/PNG
│     ├─ CardsPreview.tsx       # список карточек + экспорт PDF (format/quality, progress)
│     ├─ TextSection.tsx        # демо-блок (рыба)
│     └─ UploadPanel.tsx        # загрузка изображений + dnd
├─ hooks/
│  └─ useAutoThemeClass.ts      # автоподключение темы (light/dark/system)
├─ lib/
│  ├─ exportImage.ts            # экспорт одной карточки в PNG (Canvas)
│  ├─ imageLoader.ts            # чтение File -> objectURL (PhotoItem)
│  ├─ pdf.ts                    # сборка PDF (pdf-lib), прогресс, JPEG/PNG + quality
│  └─ utils.ts                  # утилиты
├─ store/
│  └─ useProjectStore.ts        # Zustand: photos, captions, transforms(scale/tx/ty)
├─ App.tsx
├─ index.css                    # Tailwind + темы
├─ main.tsx
└─ vite-env.d.ts
```

**Правила разбиения:**

* UI-компонент = один модуль в `src/components/ui`.
* Вся бизнес-логика — в `lib/` и `store/`, компоненты тонкие.
* В `App.tsx` — минимум разметки, модульная загрузка блоков.

---

## Хранилище (Zustand)

`useProjectStore.ts`:

```ts
photos: PhotoItem[];       // { id, url, name, … }
captions: Record<id, string>;
transforms: Record<id, { scale: number; tx: number; ty: number }>;
max: 36;

setCaption(id, text)
setTransform(id, patch)     // clamp: scale 0.5..4, tx/ty -100..100
resetTransform(id)
add(items)                  // добавляет до max
remove(id)
clear()
```

**Правило:** компоненты читают стор через селекторы; в экспорт/рендер не тянуть лишнее.

---

## Экспорт

* **PNG**: `exportImage.ts → exportCardPng(photo, caption, { size, bg, captionBg, textColor, transform })`
  Рисуем через Canvas, учитываем `scale/tx/ty`, `object-fit: cover`.
* **PDF**: `pdf.ts → exportCardsToPdf(photos, captions, transforms, { size, format: 'jpeg'|'png', quality, onProgress })`
  Одна страница = одна квадратная карточка; JPEG/PNG + качество; прогресс (elapsed/ETA).
  ⚠️ `pdf-lib` подгружается **лениво** в `CardsPreview` (динамический импорт) — не раздувает главный бандл.

---

## UI и доступность

* Добавляйте компоненты shadcn:
  `npx shadcn@latest add button input slider dialog progress select …`
* Диалог: используем `DialogTitle` и **`DialogDescription`** (или `aria-describedby={undefined}`), чтобы не ловить a11y-warning.
* Все пользовательские комментарии в коде — **на английском** (project rule).
* Tailwind-классы — предпочтительно; кастомный CSS только при необходимости.

---

## Гайд по коммитам и веткам

* **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `perf:`, `docs:` …
* Один коммит = один маленький шаг (1–2 файла, 10–80 строк).
  Примеры:

  * `feat(editor): add zoom/position sliders`
  * `fix(pdf): pass transforms to renderCardBytes`
  * `perf(build): lazy-load pdf-lib and split vendor chunks`
* Ветки: `feat/<short-name>`, `fix/<short-name>`.

---

## Код-стайл

* TypeScript strict, без `any` (если можно).
* Абсолютные импорты через `@/…`.
* Хуки/селекторы мемоизируйте где нужно (`useCallback`, `useMemo`).
* Не мутируем стор; все правки — через `set()`.

---

## Как добавить фичу (пример)

**QR на карточке:**

1. `lib/qr.ts` — функция генерации DataURL (библиотека `qrcode`).
2. В `CardEditorDialog` — переключатель «Show QR» + позиция/размер.
3. В `exportImage.ts`/`pdf.ts` — дорисовать QR поверх Canvas.
4. Сохранение флага в сторе (например, `qr: Record<id, { enabled, size, x, y }>`).

Каждый пункт — отдельный маленький коммит.
