import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { createEvent, getEventById, updateEvent } from "../../api/event.api.js";
import { BRANCHES } from "../../constants/branches.js";
import { EVENT_CATEGORIES } from "../../constants/categories.js";
import { YEARS } from "../../constants/years.js";
import ImageUploadZone from "../../components/forms/ImageUploadZone.jsx";
import { toLocalDateInput, toLocalDateTimeInput } from "../../utils/formatDate.js";
import { Alert, btn, btnGhost, crumbLink } from "../../components/common/ui";
import {
  Busy,
  Field,
  FormBar,
  FormSection,
  FormSheet,
  Picks,
  TagField,
  describedBy,
  fixMessage,
  focusFirstError,
  inputClass,
} from "../../components/forms/formBits";

// Date inputs work in LOCAL time, while toISOString() is UTC — slicing an ISO
// string would shift the date for times between local midnight and the UTC
// offset. The shared helpers format dates for these inputs.

// Field order on the page, so focus can go to the first one that needs fixing.
const ORDER = [
  "eventName", "description", "category", "startDate", "startTime",
  "endDate", "endTime", "venue", "registrationDeadline", "organizerClub",
];
const idFor = (key) => `event-${key}`;

// ─── Skeleton Loader for Edit Fetch Fallback ──────────────────
const FormSkeleton = () => (
  <div className="max-w-[760px] animate-pulse pb-10" aria-busy="true">
    <div className="mt-1 h-4 w-32 rounded bg-soft lg:mt-4" />
    <div className="mt-2 h-9 w-64 rounded-lg bg-soft" />
    <div className="mt-12 h-4 w-40 rounded bg-soft" />
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[66px] rounded-[11px] bg-soft" />
      ))}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────
const EventForm = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clubId, eventId } = useParams(); // Can capture either dependent parameter from layout routes

  const isEditMode = mode === "edit";

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    eventName: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    registrationDeadline: "",
    venue: "",
    category: "",
    tags: [],
    organizerClub: clubId || "",
    eligibleBranches: [],
    eligibleYears: [],
    banner: "",
  });

  // ─── Edit Mode Data Initialization Effect ───────────────────
  useEffect(() => {
    if (!isEditMode) return;

    // 1. Optimistic check: Try reading data forwarded from navigate state
    if (location.state?.event) {
      populateForm(location.state.event);
      setLoading(false);
    } else if (eventId) {
      // 2. Fallback check: Fetch fresh data from API if page refreshed
      const fetchEventData = async () => {
        try {
          const res = await getEventById(eventId);
          const eventData = res?.data?.data?.event;
          if (eventData) {
            populateForm(eventData);
          } else {
            setErrors({ submit: "Event details could not be parsed." });
          }
        } catch (err) {
          console.error(err);
          setErrors({ submit: "Failed to load event settings for editing." });
        } finally {
          setLoading(false);
        }
      };
      fetchEventData();
    }
  }, [isEditMode, eventId, location.state]);

  // Helper to parse ISO strings back to raw input formats HTML elements expect
  const populateForm = (eventData) => {
    const start = new Date(eventData.startDateTime);
    const end = new Date(eventData.endDateTime);

    setForm({
      eventName: eventData.eventName || "",
      description: eventData.description || "",
      startDate: toLocalDateInput(start),
      startTime: start.toTimeString().split(" ")[0].slice(0, 5),
      endDate: toLocalDateInput(end),
      endTime: end.toTimeString().split(" ")[0].slice(0, 5),
      registrationDeadline: eventData.registrationDeadline
        ? toLocalDateTimeInput(eventData.registrationDeadline)
        : "",
      venue: eventData.venue || "",
      category: eventData.category || "",
      tags: eventData.tags || [],
      organizerClub: eventData.organizerClub?._id || eventData.organizerClub || clubId || "",
      eligibleBranches: eventData.eligibleBranches || [],
      eligibleYears: eventData.eligibleYears || [],
      banner: eventData.banner || "",
    });
  };

  const setValue = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors.submit) {
      setErrors((prev) => ({ ...prev, [field]: "", submit: "" }));
    }
  };
  const set = (field) => (e) => setValue(field, e.target.value);

  const validate = () => {
    const e = {};
    if (!form.eventName.trim()) e.eventName = "Event name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.startTime) e.startTime = "Start time is required";
    if (!form.endDate) e.endDate = "End date is required";
    if (!form.endTime) e.endTime = "End time is required";
    if (!form.venue.trim()) e.venue = "Venue is required";
    if (!form.category) e.category = "Category is required";
    if (!form.organizerClub) e.organizerClub = "Organizer club is required";

    if (form.startDate && form.startTime && form.endDate && form.endTime) {
      const start = new Date(`${form.startDate}T${form.startTime}`);
      const end = new Date(`${form.endDate}T${form.endTime}`);
      if (end <= start) {
        e.endDate = "The event has to end after it starts";
      }
      // Mirrors the server rule (assertEventDates).
      if (form.registrationDeadline && new Date(form.registrationDeadline) > start) {
        e.registrationDeadline = "Registration must close on or before the event starts";
      }
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      focusFirstError(errs, ORDER, idFor);
      return;
    }

    setSubmitting(true);

    const startDateTime = new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`).toISOString();

    const payload = {
      eventName: form.eventName.trim(),
      description: form.description.trim(),
      startDateTime,
      endDateTime,
      registrationDeadline: form.registrationDeadline
        ? new Date(form.registrationDeadline).toISOString()
        : null,
      venue: form.venue.trim(),
      category: form.category,
      tags: form.tags,
      organizerClub: form.organizerClub,
      eligibleBranches: form.eligibleBranches,
      eligibleYears: form.eligibleYears,
      banner: form.banner.trim() || null,
    };

    try {
      if (isEditMode) {
        await updateEvent(eventId, payload);
        // Back to the refreshed detail page
        navigate(`/community/events/${eventId}`, { state: { toast: "Changes saved." } });
      } else {
        await createEvent(payload);
        navigate(`/community/clubs/${clubId || form.organizerClub}`, {
          state: { toast: "Event published." },
        });
      }
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({
        ...prev,
        submit:
          err.response?.data?.message || `Failed to ${mode} event. Try again.`,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FormSkeleton />;

  const input = (key, label, { type = "text", hint, full, optional, placeholder, min } = {}) => (
    <Field id={idFor(key)} label={label} hint={hint} error={errors[key]} full={full} optional={optional}>
      <input
        id={idFor(key)}
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        min={min}
        className={inputClass(errors[key])}
        {...describedBy(idFor(key), errors[key])}
      />
    </Field>
  );

  return (
    <FormSheet
      title={isEditMode ? "Edit event" : "New event"}
      crumb={
        <>
          <Link to="/community" className={crumbLink}>Community</Link> /{" "}
          <Link to="/community/events" className={crumbLink}>Events</Link>
        </>
      }
      sub={isEditMode ? undefined : "Students can find it in Events and on your club's page once it's published."}
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormSection first title="About the event">
          {input("eventName", "Event name", { full: true, placeholder: "e.g. Hack Night 2026" })}
          <Field id="event-description" label="Description" error={errors.description} full>
            <textarea
              id="event-description"
              rows={5}
              placeholder="What the event is about and what people can expect"
              value={form.description}
              onChange={set("description")}
              className={`${inputClass(errors.description)} resize-none py-2.5 leading-[1.55]`}
              {...describedBy("event-description", errors.description)}
            />
          </Field>
          <Field id="event-category" label="Category" error={errors.category}>
            <select
              id="event-category"
              value={form.category}
              onChange={set("category")}
              className={inputClass(errors.category)}
              {...describedBy("event-category", errors.category)}
            >
              <option value="">Choose a category</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          {input("venue", "Venue", { placeholder: "e.g. LT-2, Seminar Hall" })}
          {errors.organizerClub && (
            <div className="sm:col-span-2">
              <Alert>{errors.organizerClub}</Alert>
            </div>
          )}
        </FormSection>

        <FormSection title="When" hint="Registration closes when the event starts unless you set an earlier time.">
          {input("startDate", "Starts on", { type: "date", min: isEditMode ? undefined : toLocalDateInput(new Date()) })}
          {input("startTime", "Start time", { type: "time" })}
          {input("endDate", "Ends on", { type: "date", min: form.startDate || toLocalDateInput(new Date()) })}
          {input("endTime", "End time", { type: "time" })}
          {/* datetime-local is parsed as local time by new Date(), so the
              stored instant is exactly the time the organizer picked. */}
          {input("registrationDeadline", "Registration closes", {
            type: "datetime-local",
            min: isEditMode ? undefined : toLocalDateTimeInput(new Date()),
            optional: true,
          })}
        </FormSection>

        <FormSection title="Who can join" hint="Pick nothing to keep the event open to everyone.">
          <Field id="event-branches" label="Branches" group full>
            <Picks
              options={BRANCHES}
              value={form.eligibleBranches}
              onChange={(v) => setValue("eligibleBranches", v)}
            />
          </Field>
          <Field id="event-years" label="Years" group full>
            <Picks
              options={YEARS.map((y) => ({ value: y, label: `Year ${y}` }))}
              value={form.eligibleYears}
              onChange={(v) => setValue("eligibleYears", v)}
            />
          </Field>
        </FormSection>

        <FormSection title="Find and show it">
          <Field id="event-tags" label="Tags" optional full hint="Keywords that help students find the event.">
            <TagField
              id="event-tags"
              tags={form.tags}
              onChange={(tags) => setValue("tags", tags)}
              placeholder="e.g. hackathon, webdev"
            />
          </Field>
          <div className="sm:col-span-2">
            <ImageUploadZone
              label="Banner"
              value={form.banner}
              folder="event-banners"
              onChange={(uploadedUrl) => setValue("banner", uploadedUrl)}
            />
            <p className="mt-1.5 text-[13px] text-ink-3">
              Shown at the top of the event page and on its card. Without one, the date is shown instead.
            </p>
          </div>
        </FormSection>

        <FormBar message={errors.submit || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btn}>
            {submitting ? <Busy>Saving…</Busy> : isEditMode ? "Save changes" : "Publish event"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  );
};

export default EventForm;
