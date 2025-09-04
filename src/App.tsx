// src/App.tsx
import TextSection from './components/TextSection';
import { useAutoThemeClass } from './hooks/useAutoThemeClass';

export default function App() {
  useAutoThemeClass(); // optional: keep theme sync

  return (
    <>
      <div
        className="sticky top-0 z-10 w-full py-3 text-center text-3xl font-bold bg-background border-b border-gray-300"
      >
        Story Squares
      </div>
      <main className="mx-auto max-w-screen-md px-4 space-y-8">
        <TextSection />
      </main>
    </>
  );
}
