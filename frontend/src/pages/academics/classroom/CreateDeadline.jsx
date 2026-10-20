import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { getClassroom, getDeadlines, createDeadline, updateDeadline } from "../../../api/classroom.api";
import { toLocalDateTimeInput } from "../../../utils/formatDate";
import { PageMessage, btn, btnGhost, crumbLink, tone } from "../../../components/common/ui";
import {
  Busy,
  ChoiceChips,
  Counter,
  Field,
  FormBar,
  FormSection,
  FormSheet,
  describedBy,
  fixMessage,
  focusFirstError,
  inputClass,
} from "../../../components/forms/formBits";

// ─── Config ───────────────────────────────────────────────────
const TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "minor_exam", label: "Minor exam" },
  { value: "lab_exam", label: "Lab exam" },
  { value: "semester_exam", label: "Semester exam" },
  { value: "project", label: "Project" },
  { value: "general", label: "General" },
];

const MAX_TITLE = 120;
const MAX_DESC = 1000;

const isUrgent = (dateStr) => {
  if (!dateStr) return false;
  const diff = new Date(dateStr) - new Date();
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
};

const ORDER = ["type", "title", "dueDate", "description"];
const idFor = (key) => `deadline-${key}`;

const FormSkeleton = () => (
  <div className="max-w-[760px] animate-pulse pb-10" aria-busy="true">
    <div className="mt-1 h-4 w-32 rounded bg-soft lg:mt-4" />
    <div className="mt-2 h-9 w-48 rounded-lg bg-soft" />
    <div className="mt-12 h-48 rounded-[11px] bg-soft" />
  </div>
);

// ─── Main ─────────────────────────────────────────────────────
export default function CreateDeadline() {
  const { classroomId, deadlineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isEdit = !!deadlineId;

  // Access check + (for edit mode without router state) the deadline itself
  // are both resolved before the form ever renders — no race, no silent
  // fallback to a broken "create" submit.
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [existingDeadline, setExistingDeadline] = useState(location.state?.deadline || null);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({ title: "", description: "", type: "", dueDate: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await getClassroom();
        if (!data.data.isClassRep) {
          setChecking(false);
          return;
        }
        setAllowed(true);

        if (isEdit && !existingDeadline) {
          const { data: deadlinesRes } = await getDeadlines();
          const found = deadlinesRes.data.find((d) => d._id === deadlineId);
          if (!found) {
            setLoadError("This deadline could not be found.");
          } else {
            setExistingDeadline(found);
          }
        }
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load. Please try again.");
      } finally {
        setChecking(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (existingDeadline) {
      setForm({
        title: existingDeadline.title || "",
        description: existingDeadline.description || "",
        type: existingDeadline.type || "",
        dueDate: existingDeadline.dueDate ? toLocalDateTimeInput(existingDeadline.dueDate) : "",
      });
    }
  }, [existingDeadline]);

  const setValue = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setSubmitError("");
  };
  const handleChange = (e) => setValue(e.target.name, e.target.value);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    else if (form.title.length > MAX_TITLE) e.title = `Max ${MAX_TITLE} characters.`;
    if (!form.type) e.type = "Select a deadline type.";
    if (!form.dueDate) e.dueDate = "Due date is required.";
    else if (!isEdit && new Date(form.dueDate) < new Date()) e.dueDate = "Due date must be in the future.";
    if (form.description.length > MAX_DESC) e.description = `Max ${MAX_DESC} characters.`;
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

    setLoading(true);
    setSubmitError("");

    const payload = {
      title: form.title.trim(),
      type: form.type,
      dueDate: new Date(form.dueDate).toISOString(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    try {
      if (isEdit) {
        await updateDeadline(classroomId, deadlineId, payload);
      } else {
        await createDeadline(classroomId, payload);
      }
      navigate(`/academics/classroom/${classroomId}`, {
        state: { toast: isEdit ? "Deadline updated." : "Deadline added." },
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <FormSkeleton />;

  if (!allowed) {
    return (
      <PageMessage
        title="You can't manage deadlines here"
        action={
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Go back
          </button>
        }
      >
        Only this classroom's representative can add or change deadlines.
      </PageMessage>
    );
  }

  if (loadError) {
    return (
      <PageMessage
        title="Something went wrong"
        action={
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Go back
          </button>
        }
      >
        {loadError}
      </PageMessage>
    );
  }

  const minDate = toLocalDateTimeInput(new Date(Date.now() + 60000));

  return (
    <FormSheet
      title={isEdit ? "Edit deadline" : "New deadline"}
      sub={isEdit ? undefined : "Everyone in the classroom sees it on their dashboard and the classroom page."}
      crumb={
        <>
          Academics /{" "}
          <Link to={`/academics/classroom/${classroomId}`} className={crumbLink}>
            Classroom
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormSection first>
          <Field id="deadline-type" label="Type" group full error={errors.type}>
            <ChoiceChips options={TYPES} value={form.type} onChange={(type) => setValue("type", type)} />
          </Field>
          <Field
            id="deadline-title"
            label="Title"
            error={errors.title}
            full
            aside={<Counter value={form.title} max={MAX_TITLE} />}
          >
            <input
              id="deadline-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={MAX_TITLE}
              placeholder="e.g. DBMS Assignment 3"
              className={inputClass(errors.title)}
              {...describedBy("deadline-title", errors.title)}
            />
          </Field>
          <Field
            id="deadline-dueDate"
            label="Due"
            error={errors.dueDate}
            hint={
              isUrgent(form.dueDate) ? (
                <span className={tone.warn}>Within 48 hours, so students see it marked as due soon.</span>
              ) : undefined
            }
          >
            <input
              id="deadline-dueDate"
              type="datetime-local"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              min={isEdit ? undefined : minDate}
              className={inputClass(errors.dueDate)}
              {...describedBy("deadline-dueDate", errors.dueDate)}
            />
          </Field>
          <Field
            id="deadline-description"
            label="Details"
            optional
            error={errors.description}
            full
            aside={<Counter value={form.description} max={MAX_DESC} warnAt={100} />}
          >
            <textarea
              id="deadline-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={MAX_DESC}
              rows={4}
              placeholder="Instructions, weightage or how to submit"
              className={`${inputClass(errors.description)} resize-none py-2.5 leading-[1.55]`}
              {...describedBy("deadline-description", errors.description)}
            />
          </Field>
        </FormSection>

        <FormBar message={submitError || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} disabled={loading} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={btn}>
            {loading ? <Busy>{isEdit ? "Saving…" : "Adding…"}</Busy> : isEdit ? "Save changes" : "Add deadline"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  );
}
