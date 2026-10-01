import { ChartSpline } from "lucide-react";

export function Header({ onHome }: { onHome: () => void }) {
  return (
    <header className="screen-only border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2.5 rounded-md text-left"
          aria-label="Linear Programming Solver, home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-700 text-white">
            <ChartSpline className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-slate-900">Linear Programming Solver</span>
            <span className="block text-xs text-slate-500">Graphical method, two variables</span>
          </span>
        </button>
      </div>
    </header>
  );
}
