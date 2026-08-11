/**
 * CampaignDropdown — accessible custom campaign selector.
 *
 * Replaces the native `<select>` in the campaign view. Selection behaviour is
 * identical (the parent still owns the `selectedId` state); only the rendering
 * differs, so the dropdown matches the dark PrivateFund design system.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CampaignStatus } from "../contract";
import { CheckIcon, ChevronDownIcon } from "./icons";

export type CampaignOption = {
  id: bigint;
  status: CampaignStatus;
  title: string | null;
};

export function CampaignDropdown({
  options,
  value,
  labelId,
  disabled = false,
  onChange,
}: {
  options: CampaignOption[];
  value: bigint | null;
  labelId: string;
  disabled?: boolean;
  onChange: (id: bigint | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selectedIndex =
    value !== null ? options.findIndex((c) => c.id === value) : -1;
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const select = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) {
        onChange(option.id);
      }
      close();
    },
    [options, onChange, close],
  );

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    if (open) {
      close();
    } else {
      setOpen(true);
      setHighlightedIndex(selectedIndex);
    }
  }, [disabled, open, selectedIndex, close]);

  // Close when clicking/tapping outside the dropdown.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, close]);

  // Keep the highlighted option scrolled into view while navigating.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlightedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        } else {
          setHighlightedIndex((i) => (i + 1) % options.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
        } else {
          setHighlightedIndex((i) => (i - 1 + options.length) % options.length);
        }
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setHighlightedIndex(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          if (highlightedIndex >= 0) select(highlightedIndex);
        } else {
          toggleOpen();
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  };

  const optionId = (index: number) => `${listboxId}-option-${index}`;

  return (
    <div className="campaign-dropdown" ref={containerRef}>
      <button
        type="button"
        className={`campaign-dropdown-trigger ${open ? "open" : ""}`}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
      >
        <span className="campaign-dropdown-current">
          <span
            className={`campaign-status-dot ${
              selected?.status === CampaignStatus.ACTIVE ? "is-active" : "is-closed"
            }`}
            aria-hidden="true"
          />
          <span className="campaign-dropdown-current-body">
            <span className="campaign-dropdown-current-title">
              {selected?.title ?? "Select a campaign"}
            </span>
            <span className="campaign-dropdown-current-sub">
              {selected
                ? `Campaign #${selected.id.toString()} · ${
                    selected.status === CampaignStatus.ACTIVE ? "ACTIVE" : "CLOSED"
                  }`
                : "No campaign selected"}
            </span>
          </span>
        </span>
        <ChevronDownIcon className={`campaign-dropdown-chevron ${open ? "open" : ""}`} />
      </button>

      <ul
        id={listboxId}
        ref={listRef}
        role="listbox"
        aria-labelledby={labelId}
        aria-hidden={!open}
        aria-activedescendant={
          open && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined
        }
        className={`campaign-dropdown-menu ${open ? "open" : ""}`}
      >
        {options.map((campaign, index) => {
          const active = campaign.status === CampaignStatus.ACTIVE;
          const isSelected = campaign.id === value;
          const isHighlighted = highlightedIndex === index;
          return (
            <li
              key={campaign.id.toString()}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              className={`campaign-dropdown-option ${isSelected ? "selected" : ""} ${
                isHighlighted ? "highlighted" : ""
              }`}
              onClick={() => select(index)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span
                className={`campaign-status-dot ${active ? "is-active" : "is-closed"}`}
                aria-hidden="true"
              />
              <span className="campaign-dropdown-option-body">
                <span className="campaign-dropdown-option-title">
                  {campaign.title ?? "(untitled)"}
                </span>
                <span className="campaign-dropdown-option-sub">
                  Campaign #{campaign.id.toString()} · {active ? "ACTIVE" : "CLOSED"}
                </span>
              </span>
              {isSelected && <CheckIcon className="campaign-dropdown-option-check" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
