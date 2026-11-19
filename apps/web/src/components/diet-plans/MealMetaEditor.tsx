"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  mealId: string;
  plannedTime: string | null;
  note: string | null;
  onChanged: () => void;
}

// Öğünün saatini ve diyetisyen notunu (ör. "ışık yoğurt tercih edin") düzenler.
export function MealMetaEditor({ mealId, plannedTime, note, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(plannedTime ?? "");
  const [text, setText] = useState(note ?? "");

  const mutation = trpc.dietPlans.updateMeal.useMutation({
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });

  if (!editing) {
    return (
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {note && <span className="italic text-foreground/80">Not: {note}</span>}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => {
            setTime(plannedTime ?? "");
            setText(note ?? "");
            setEditing(true);
          }}
        >
          {plannedTime || note ? "Saat/not düzenle" : "+ Saat / not ekle"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mb-2 flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ dietPlanMealId: mealId, plannedTime: time || null, note: text.trim() || null });
      }}
    >
      <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-28" aria-label="Öğün saati" />
      <Input
        type="text"
        value={text}
        maxLength={500}
        onChange={(event) => setText(event.target.value)}
        placeholder="Danışana not (opsiyonel)"
        className="min-w-[14rem] flex-1"
        aria-label="Öğün notu"
      />
      <Button type="submit" size="sm" disabled={mutation.isLoading}>
        Kaydet
      </Button>
      <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => setEditing(false)}>
        Vazgeç
      </button>
      {mutation.error && <p className="w-full text-xs text-destructive">{mutation.error.message}</p>}
    </form>
  );
}
