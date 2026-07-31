"use client";

import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { searchCities, type CityEntry } from "@/lib/cityData";

export type CityAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  placeholder?: string;
  allowAnywhere?: boolean;
};

export function CityAutocomplete({
  label,
  value,
  onChange,
  icon = <MapPin className="h-4 w-4" aria-hidden="true" />,
  placeholder,
  allowAnywhere = false
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const suggestions: CityEntry[] = searchCities(value);
  const showAnywhereOption = allowAnywhere && "anywhere".includes(value.trim().toLowerCase()) && value.trim().length > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCity(entry: CityEntry) {
    onChange(entry.city);
    setOpen(false);
  }

  function selectAnywhere() {
    onChange("Anywhere");
    setOpen(false);
  }

  const totalOptions = suggestions.length + (showAnywhereOption ? 1 : 0);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || totalOptions === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % totalOptions);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => (current - 1 + totalOptions) % totalOptions);
    } else if (event.key === "Enter") {
      if (highlighted < suggestions.length) {
        event.preventDefault();
        selectCity(suggestions[highlighted]);
      } else if (showAnywhereOption) {
        event.preventDefault();
        selectAnywhere();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-semibold text-ink">
        <span className="mb-2 flex items-center gap-2">
          <span className="text-accent">{icon}</span>
          {label}
        </span>
        <input
          className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink shadow-sm transition placeholder:text-ink/35 focus:border-accent focus:bg-white focus:outline-none"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      </label>

      {open && (suggestions.length > 0 || showAnywhereOption) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-2 max-h-64 w-full animate-fade-up overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lift"
        >
          {showAnywhereOption ? (
            <li role="option" aria-selected={highlighted === suggestions.length}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  highlighted === suggestions.length ? "bg-accentSoft text-accentDark" : "text-ink hover:bg-mist"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={selectAnywhere}
              >
                <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                Anywhere
              </button>
            </li>
          ) : null}
          {suggestions.map((entry, index) => (
            <li key={`${entry.city}-${entry.iata}`} role="option" aria-selected={highlighted === index}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  highlighted === index ? "bg-accentSoft" : "hover:bg-mist"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCity(entry)}
                onMouseEnter={() => setHighlighted(index)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{entry.city}</span>
                  <span className="block truncate text-xs text-ink/55">{entry.country}</span>
                </span>
                <span className="shrink-0 rounded-md bg-mist px-2 py-1 text-xs font-bold text-ink/60">{entry.iata}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
