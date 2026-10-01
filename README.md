# or_assignment: Linear Programming Graphical Method Solver

A React + TypeScript web app that solves any two-variable linear programming problem with the graphical method and shows every step: boundary equations, intercepts, the graph, all pairwise intersections, feasibility checks, objective values and the final answer.

## Features

- Minimize or maximize, any number of `≤`, `≥`, `=` constraints, and `x ≥ 0`, `x > 0` or unrestricted variables.
- Fractions accepted as input (`4/3`) and shown exactly in the output (`8/7 ≈ 1.143`).
- Interactive Plotly graph (zoom, pan, hover, reset) that builds up step by step, with the feasible region computed from the constraints.
- Detects infeasible problems, unbounded regions or objectives, multiple optimal solutions, and optima not attained under strict `> 0`.
- Print view with the full solution, including the graph.

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm test         # run the solver unit tests (Vitest)
npm run build    # type-check and build to dist/
```

## Structure

- `src/engine/` holds the pure solver, independent of React (`solveLPP(problem)` returns the full step-by-step solution).
- `src/components/` and `src/pages/` hold the UI, which only renders the solver's result.
- `src/engine/solver.test.ts` has the test cases, including the reference example (minimize Z = 2x₁ + 3x₂ gives Z = 9 at (3, 1)).

## Deploy

On Vercel, import the repository. The Vite preset is detected automatically (build command `npm run build`, output directory `dist`).
