import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { PageTitle, btnGhost, fieldInput, fieldInputError, fieldLabel, focusRing } from "../common/ui";

// Pieces every full-page form is built from (a new drive, an event, a club, a
// notice, an announcement, a deadline): the sheet and its sections, a labelled
// field with its hint or error, the choice controls, and the bar of actions.

// The page: breadcrumb and title, then the sections. Narrower than the app's
// pages, so lines of fields stay easy to scan.
export const FormSheet = ({ crumb, title, sub, children }) => (
  <div className="max-w-[760px] pb-6">
    <PageTitle crumb={crumb} title={title} sub={sub} />
    {children}
  </div>
);

// One group of fields under a rule. Fields sit two to a line from sm up; a
// field with `full` takes the whole line. The `first` section sits closer to the title.
export const FormSection = ({ title, hint, first = false, children }) => (
  <section className={`mt-9 border-t border-line pt-8 ${first ? "" : "lg:mt-12"}`}>
    {title && <h2 className="text-[17px] font-[650] tracking-[-0.025em] text-ink">{title}</h2>}
    {hint && <p className="mt-1 text-[14.5px] text-ink-2">{hint}</p>}
    <div className={`grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 ${title || hint ? "mt-[22px]" : ""}`}>
      {children}
    </div>
  </section>
);

// The input class for a field, red when its value was refused.
export const inputClass = (error) => (error ? fieldInputError : fieldInput);

// What an input needs so a screen reader hears its error.
export const describedBy = (id, error) =>
  error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

// A label over its control, then a hint or the error. `group` is for a set of
// buttons (a segmented choice, picks): the label names the group instead of
// pointing at one input. `aside` sits opposite the label (a character count).
export const Field = ({ id, label, optional, hint, error, full = false, group = false, aside, children }) => (
  <div className={`min-w-0 ${full ? "sm:col-span-2" : ""}`}>
    <div className="flex items-baseline justify-between gap-3">
      {group ? (
        <span id={`${id}-label`} className={fieldLabel}>
          {label}
          {optional && <span className="font-normal text-ink-3"> (optional)</span>}
        </span>
      ) : (
        <label htmlFor={id} className={fieldLabel}>
          {label}
          {optional && <span className="font-normal text-ink-3"> (optional)</span>}
        </label>
      )}
      {aside}
    </div>
    {group ? (
      <div role="group" aria-labelledby={`${id}-label`} id={id} tabIndex={-1} className="outline-none">
        {children}
      </div>
    ) : (
      children
    )}
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-[13px] text-urgent">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-3">{hint}</p>
    )}
  </div>
);

// "93 left", turning to the warning colour near the limit.
export const Counter = ({ value, max, warnAt = 20 }) => {
  const left = max - value.length;
  return (
    <span className={`text-xs tabular-nums ${left < warnAt ? "text-warn" : "text-ink-3"}`}>{left} left</span>
  );
};

// One choice out of a few, side by side ("Internship | Full time").
export const Segmented = ({ options, value, onChange }) => (
  <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-xl bg-soft p-[3px]">
    {options.map(({ value: key, label }) => {
      const on = key === value;
      return (
        <button
          key={key}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(key)}
          className={`h-9 flex-none whitespace-nowrap rounded-[9px] px-[15px] text-[14.5px] transition-colors ${focusRing} ${
            on
              ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(14_15_17/0.12)]"
              : "font-medium text-ink-2 hover:text-ink"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// Any number of choices out of a list (branches, years). `value` is an array.
export const Picks = ({ options, value, onChange }) => {
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const { value: key, label } = typeof option === "object" ? option : { value: option, label: option };
        const on = value.includes(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(key)}
            className={`h-[34px] whitespace-nowrap rounded-full px-[13px] text-[14.5px] font-medium transition-colors ${focusRing} ${
              on ? "bg-ink text-white" : "border border-line-2 bg-white text-ink-2 hover:border-ink-3 hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

// One choice out of a longer list, as chips that wrap (deadline types).
export const ChoiceChips = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(({ value: key, label }) => {
      const on = key === value;
      return (
        <button
          key={key}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(key)}
          className={`h-[34px] whitespace-nowrap rounded-full px-[13px] text-[14.5px] font-medium transition-colors ${focusRing} ${
            on ? "bg-ink text-white" : "border border-line-2 bg-white text-ink-2 hover:border-ink-3 hover:text-ink"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// Free-text tags: type one and press Enter (or Add); each shows with a remove button.
export const TagField = ({ id, tags, onChange, placeholder, max }) => {
  const [text, setText] = useState("");
  const full = max !== undefined && tags.length >= max;
  const add = () => {
    const tag = text.trim();
    if (!tag || tags.includes(tag) || full) return;
    onChange([...tags, tag]);
    setText("");
  };
  return (
    <>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          value={text}
          placeholder={placeholder}
          disabled={full}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={`${fieldInput} min-w-0 flex-1 disabled:bg-soft`}
        />
        <button type="button" onClick={add} disabled={full || !text.trim()} className={btnGhost}>
          <Plus size={15} aria-hidden="true" /> Add
        </button>
      </div>
      {tags.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag}
              className="flex h-7 items-center gap-0.5 rounded-full bg-soft pl-2.5 pr-1 text-[13px] font-medium text-ink-2"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
                className={`grid size-5 place-items-center rounded-full text-ink-3 transition-colors hover:text-urgent ${focusRing}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

// The bar of actions, held at the foot of the screen while the form is long.
// `message` explains what stopped the save: a count of fields to fix, or the
// server's own reason.
export const FormBar = ({ message, children }) => (
  <div className="sticky bottom-0 z-10 mt-12 flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-white/95 py-4 backdrop-blur-sm">
    <p role="status" className="mr-auto min-w-0 text-[14.5px] font-[550] text-urgent">
      {message}
    </p>
    {children}
  </div>
);

// "1 field needs fixing" / "3 fields need fixing".
export const fixMessage = (errors) => {
  const count = Object.entries(errors).filter(([key, value]) => key !== "submit" && value).length;
  if (count === 0) return "";
  return `${count} ${count === 1 ? "field needs" : "fields need"} fixing`;
};

// Moves focus to the first field that was refused, in the order the form lists them.
export const focusFirstError = (errors, order, idFor) => {
  const first = order.find((key) => errors[key]);
  if (first) document.getElementById(idFor(first))?.focus();
};

// The submit button's text while it works.
export const Busy = ({ children }) => (
  <>
    <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {children}
  </>
);
