import { ArrowRight } from "lucide-react";
import { Button } from "./ui";

export function SolveButton() {
  return (
    <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
      Solve Graphically
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
