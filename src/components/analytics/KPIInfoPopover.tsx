"use client";
import { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import type { HelpTopic } from "@/config/kpi-help";
import { helpFor } from "@/config/kpi-help";
export function KPIInfoPopover({
  topic,
  helpOverride,
}: {
  topic: string;
  helpOverride?: HelpTopic;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  const ref = useRef<HTMLElement>(null);
  const help = helpOverride ?? helpFor(topic);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const button = ref.current?.querySelector<HTMLButtonElement>("button");
        e.preventDefault();
        button?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="info-button"
        aria-label={`ข้อมูล ${help.title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            className="help-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <section
              ref={ref}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={id}
              className="help-dialog"
            >
              <header>
                <h2 id={id}>{help.title}</h2>
                <button aria-label="ปิดคำอธิบาย" onClick={() => setOpen(false)}>
                  ×
                </button>
              </header>
              <dl>
                {[
                  ["คืออะไร", help.definition],
                  ["สูตร", help.formula],
                  ["Input / แกนและสี", help.inputs],
                  ["การตีความ", help.interpretation],
                  ["ตัวอย่าง", help.example],
                  ["คำแนะนำ", help.advice],
                  ["ข้อควรระวัง", help.caution],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
