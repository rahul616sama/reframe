"use client";

import { EditRecipe } from "@/lib/types";
import { RotateCw } from "lucide-react";
import BaseButton from "./ui/BaseButton";
import { cn } from "@/lib/utils";

interface Props {
  recipe: EditRecipe;
  onChange: (patch: Partial<EditRecipe>) => void;
}

const PRESETS = [0, 90, 180, 270] as const;

export default function RotateControl({ recipe, onChange }: Props) {
  const rotation = recipe.rotate ?? 0;

  const handleSlider = (val: number) => {
    onChange({ rotate: val });
  };

  const handleInput = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    const clamped = Math.min(180, Math.max(-180, n));
    onChange({ rotate: clamped });
  };

  return (
    <div className="flex gap-2">
      {ROTATIONS.map((deg) => {
        const active = recipe.rotate === deg;
        return (
          <BaseButton
            type="button"
            key={deg}
            onClick={() => onChange({ rotate: deg })}
            aria-label={`Rotate video to ${deg} degrees`}
            aria-pressed={active}
            active={active}
            className="flex-1 flex flex-col items-center gap-1.5 py-3"
          >
            <RotateCw size={15} aria-hidden="true" style={{ transform: `rotate(${deg}deg)`, transformOrigin: 'center' }} className="transition-transform" />
            {deg}
          </BaseButton>
        );
      })}
    </div>
  );
}