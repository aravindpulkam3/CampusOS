import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { btnLg, fieldInput, fieldLabel, focusRing } from "../../components/common/ui";
import useDocumentTitle from "../../hooks/useDocumentTitle";

// The frame every signed-out page shares (sign in, activate, set or reset a
// password): the brand, one narrow column for the form and, from lg up, a
// picture panel beside it.

// The panel shows a campus photo when one is saved as src/assets/campus.jpg
// (or .jpeg / .png / .webp). Without one it is a quiet colour wash, so the
// pages never depend on a picture being there.
const pictures = import.meta.glob("../../assets/campus.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const picture = Object.values(pictures)[0];

const wash =
  "radial-gradient(60% 46% at 16% 8%, #dde3ff 0, transparent 72%), radial-gradient(54% 42% at 88% 22%, #ffe4d1 0, transparent 72%), radial-gradient(64% 48% at 52% 92%, #dbf1e4 0, transparent 72%)";

const tagline = "Classes, clubs, events and placements in one place.";

export const authLink = `rounded font-semibold text-ink underline-offset-[3px] hover:underline ${focusRing}`;

const AuthShell = ({ title, sub, footer, children }) => {
  useDocumentTitle(title);
  return (
  <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-[22px] lg:px-16 lg:pb-10 lg:pt-7">
      <header className="self-start">
      <Link
        to="/login"
        className={`flex items-center gap-2.5 rounded-lg text-[15.5px] font-semibold tracking-tight text-ink ${focusRing}`}
      >
        <span aria-hidden="true" className="relative size-[22px] rounded-[7px] bg-ink">
          <span className="absolute inset-[6px] -rotate-[30deg] rounded-full border-2 border-white border-r-transparent" />
        </span>
        EventSphere
      </Link>
      </header>

      <main className="my-auto w-full max-w-[380px] py-12">
        <h1 className="text-[29px] font-[680] leading-[1.12] tracking-[-0.042em] text-ink lg:text-[34px]">
          {title}
        </h1>
        {sub && <p className="mt-2 text-base text-ink-2">{sub}</p>}
        <div className="mt-8">{children}</div>
        {footer && (
          <p className="mt-7 border-t border-line pt-[22px] text-[14.5px] leading-[1.55] text-ink-2">{footer}</p>
        )}
      </main>

      <footer className="text-[13px] text-ink-3">EventSphere, NIT Silchar</footer>
    </div>

    <aside className="relative m-4 hidden overflow-hidden rounded-[28px] bg-soft lg:block">
      {picture ? (
        <>
          <img src={picture} alt="" className="absolute inset-0 size-full object-cover" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent from-45% to-[#0a0a0c]/80"
          />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: wash }} />
      )}
      <p
        className={`absolute inset-x-9 bottom-[34px] max-w-[22ch] text-[30px] font-[650] leading-[1.14] tracking-[-0.04em] ${
          picture ? "text-white" : "text-ink"
        }`}
      >
        {tagline}
      </p>
    </aside>
  </div>
  );
};

export default AuthShell;

// A labelled input. `aside` sits opposite the label ("Forgot password?").
export const AuthField = ({ id, label, aside, ...input }) => (
  <div>
    <div className="flex items-baseline justify-between gap-4">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {aside}
    </div>
    <input id={id} {...input} className={fieldInput} />
  </div>
);

// The form's one button; shows a spinner and `busyLabel` while it is working.
export const AuthSubmit = ({ loading, busyLabel, children }) => (
  <button type="submit" disabled={loading} className={`w-full ${btnLg}`}>
    {loading ? (
      <>
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {busyLabel}
      </>
    ) : (
      children
    )}
  </button>
);

// What replaces the form once a link has been emailed.
export const AuthSent = ({ message, children }) => (
  <div role="status" className="rounded-[14px] bg-soft px-[18px] py-4">
    <p className="text-[14.5px] font-[550] text-ink">{message}</p>
    <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink-2">{children}</p>
  </div>
);
