import { useState } from "react";
import type { LPPSolution, ProblemDraft, ValidationError } from "./types/lpp";
import { emptyDraft, exampleDraft } from "./data/examples";
import { parseProblem } from "./engine/parser";
import { solveLPP } from "./engine/solver";
import { Header } from "./components/Header";
import Home from "./pages/Home";
import Solution from "./pages/Solution";

type View = "home" | "setup" | "solution";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [draft, setDraft] = useState<ProblemDraft>(emptyDraft);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [solution, setSolution] = useState<LPPSolution | null>(null);

  const updateDraft = (next: ProblemDraft) => {
    setDraft(next);
    if (errors.length > 0) setErrors([]);
  };

  const solve = () => {
    const parsed = parseProblem(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors([]);
    setSolution(solveLPP(parsed.problem));
    setView("solution");
    window.scrollTo({ top: 0 });
  };

  const newProblem = () => {
    setDraft(emptyDraft());
    setErrors([]);
    setSolution(null);
    setView("setup");
    window.scrollTo({ top: 0 });
  };

  const loadExample = () => {
    setDraft(exampleDraft());
    setErrors([]);
  };

  return (
    <div className="min-h-screen">
      <Header onHome={() => setView(solution ? "solution" : "home")} />
      {view === "solution" && solution ? (
        <Solution
          solution={solution}
          onEdit={() => {
            setView("setup");
            window.scrollTo({ top: 0 });
          }}
          onNewProblem={newProblem}
        />
      ) : (
        <Home
          started={view === "setup"}
          onStart={() => setView("setup")}
          draft={draft}
          errors={errors}
          onChange={updateDraft}
          onLoadExample={loadExample}
          onClear={newProblem}
          onSolve={solve}
        />
      )}
    </div>
  );
}
