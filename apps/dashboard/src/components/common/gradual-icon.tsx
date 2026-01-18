import { Card } from "@gradual/ui/card";

export default function GradualIcon() {
  return (
    <Card className="rounded-full p-1">
      <img
        alt="Gradual Logo"
        className="h-full w-full object-contain"
        height={24}
        src="/gradual-logo-500x500.png"
        width={24}
      />
    </Card>
  );
}
