"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FilterOption<T extends string> = {
  id: T;
  label: string;
};

export function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly FilterOption<T>[];
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.id === value)?.label ?? value;

  useEffect(() => {
    if (!open) {
      return;
    }
    function place() {
      const button = buttonRef.current;
      if (!button) {
        return;
      }
      const rect = button.getBoundingClientRect();
      setBox({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 168),
      });
    }
    function onPointer(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    place();
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className="inline-flex min-h-[32px] items-center gap-2 rounded-[8px] border border-[#D9E1E5] bg-white px-2.5 text-sm font-medium text-[#163A59] hover:border-[#0B7F86] focus-visible:outline-2 focus-visible:outline-[#0B7F86]"
      >
        {current}
        <Chevron open={open} />
      </button>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-label={label}
              style={{ top: box.top, left: box.left, minWidth: box.width }}
              className="fixed z-50 overflow-hidden rounded-[10px] border border-[#D9E1E5] bg-white py-1 shadow-lg"
            >
              {options.map((option) => {
                const selected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                      selected
                        ? "bg-[#E8F5F5] font-medium text-[#08666C]"
                        : "text-[#163A59] hover:bg-[#F7F9FA]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-[#66727A] ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M6 9.5 12 15.5 18 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
