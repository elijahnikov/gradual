import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import {
  RiAddFill,
  RiGroupLine,
  RiRulerLine,
  RiUserLine,
} from "@remixicon/react";
import type { TargetType } from "./types";

interface AddNewTargetButtonProps {
  onAddTarget: (type: TargetType) => void;
}

const TARGET_OPTIONS: {
  type: TargetType;
  label: string;
  icon: typeof RiRulerLine;
}[] = [
  { type: "rule", label: "Custom Rule", icon: RiRulerLine },
  { type: "individual", label: "Target Individual", icon: RiUserLine },
  { type: "segment", label: "Target Segment", icon: RiGroupLine },
];

export default function AddNewTargetButton({
  onAddTarget,
}: AddNewTargetButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button className="size-6" variant="outline">
          <RiAddFill className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {TARGET_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.type}
            onClick={() => onAddTarget(option.type)}
          >
            <option.icon className="mr-2 size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
