// src/App.tsx
import { useAutoThemeClass } from "./hooks/useAutoThemeClass";
import UploadPanel from "@/components/UploadPanel";
import CardsPreview from "@/components/CardsPreview";
import TextSection from "./components/TextSection";

export default function App() {
  useAutoThemeClass();
  return (
    <>
      <div
        className="sticky top-0 z-10 w-full py-3 text-center text-3xl font-bold bg-background border-b border-gray-300"
      >
        Story Squares v0.0
      </div>
      <main className="mx-auto max-w-screen-md px-4 space-y-8">
        <UploadPanel />
        <CardsPreview />
        <TextSection />
      </main>
    </>
  );
}

