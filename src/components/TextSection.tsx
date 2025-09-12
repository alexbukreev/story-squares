// src/components/TextSection.tsx

export default function TextSection() {
  return (
    <main className="space-y-6 mt-10">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        About Project
      </h2>

      <div className="space-y-4 text-base leading-relaxed">
        <p>
          This is a neutral placeholder section for a React + Vite template. Use it
          as a concise overview of your project’s purpose, value, and scope. Replace
          this copy with your own content when you are ready.
        </p>

        <p>
          The goal is clarity and brevity. Keep paragraphs short, highlight outcomes
          instead of features only, and avoid jargon where possible. Readers should
          grasp what the project does and who it serves in under a minute.
        </p>

        <h3 className="text-lg font-medium mt-6">What’s inside</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Responsive layout and accessible typography</li>
          <li>Clean structure with minimal utility classes</li>
          <li>Room for screenshots, diagrams, or quick start notes</li>
        </ul>

        <h3 className="text-lg font-medium mt-6">How to use</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Replace the placeholder text with your project summary.</li>
          <li>Add sections for features, screenshots, and FAQs.</li>
          <li>Link to documentation, demos, or contact channels.</li>
        </ol>

        <h3 className="text-lg font-medium mt-6">Suggested outline</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Problem statement & goals</li>
          <li>Target audience & use cases</li>
          <li>Core features & benefits</li>
          <li>Tech stack & integrations</li>
          <li>Roadmap & milestones</li>
          <li>Contact & support</li>
        </ul>

        <p className="text-sm opacity-80">
          Tip: favor active voice, concrete examples, and consistent terminology.
          Consider adding a call-to-action (e.g., “Try the demo” or “Read the docs”).
        </p>
      </div>
    </main>
  );
}
