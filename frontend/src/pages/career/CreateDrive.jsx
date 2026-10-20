import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { createDrive } from "../../api/career.api"
import { toLocalDateTimeInput } from "../../utils/formatDate"
import { btn, btnGhost, crumbLink, fieldInput } from "../../components/common/ui"
import {
  Busy,
  Field,
  FormBar,
  FormSection,
  FormSheet,
  Picks,
  Segmented,
  describedBy,
  fixMessage,
  focusFirstError,
  inputClass,
} from "../../components/forms/formBits"

// ─── Constants ────────────────────────────────────────────────
const BRANCHES = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "CHEM", "BIO"]

const JOB_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "fulltime", label: "Full time" }
]

const DRIVE_TYPES = [
  { value: "oncampus", label: "On campus" },
  { value: "offcampus", label: "Off campus" },
  { value: "poolcampus", label: "Pool campus" }
]

const YEARS = [1, 2, 3, 4]

// Field order on the page, so focus can go to the first one that needs fixing.
const ORDER = [
  "companyName", "role", "jobType", "companyLogo", "minCGPA", "maxBacklogs",
  "yearConstraint", "registrationDeadline", "applicationLink", "brochureUrl",
]
const idFor = (key) => (key === "yearConstraint" ? "drive-minYear" : `drive-${key}`)

// ─── Main ─────────────────────────────────────────────────────
const CreateDrive = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    companyName: "",
    companyLogo: "",
    role: "",
    description: "",
    jobType: "fulltime",
    driveType: "oncampus",
    location: "",
    ctc: "",
    stipend: "",
    bond: "",
    batch: "",
    eligibleBranches: [],
    minCGPA: 0,
    minYear: 1,
    maxYear: 4,
    maxBacklogs: 0,
    slots: "",
    registrationDeadline: "",
    applicationLink: "",
    brochureUrl: "",
  })

  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const setValue = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: "", ...(field === "minYear" || field === "maxYear" ? { yearConstraint: "" } : {}) }))
    setSubmitError("")
  }
  const set = (field) => (e) => setValue(field, e.target.value)

  const validate = () => {
    const e = {}
    if (!form.companyName.trim()) e.companyName = "Company name is required"
    if (!form.role.trim()) e.role = "Role is required"
    if (!form.jobType) e.jobType = "Job type selection is required"
    if (!form.applicationLink.trim()) e.applicationLink = "Application link is required"

    if (!form.registrationDeadline) {
      e.registrationDeadline = "Registration deadline is required"
    } else if (new Date(form.registrationDeadline) < new Date()) {
      e.registrationDeadline = "Deadline must be in the future"
    }

    if (form.minCGPA < 0 || form.minCGPA > 10) e.minCGPA = "CGPA must be between 0 and 10"
    if (form.maxBacklogs < 0) e.maxBacklogs = "Cannot be negative"
    if (form.minYear < 1 || form.maxYear > 4 || Number(form.minYear) > Number(form.maxYear)) {
      e.yearConstraint = "The first year can't come after the last"
    }

    if (form.applicationLink && !form.applicationLink.startsWith("http")) {
      e.applicationLink = "Enter a full web address that starts with https://"
    }
    if (form.companyLogo && !form.companyLogo.startsWith("http")) {
      e.companyLogo = "Enter a full image address that starts with https://"
    }
    if (form.brochureUrl && !form.brochureUrl.startsWith("http")) {
      e.brochureUrl = "Enter a full web address that starts with https://"
    }

    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      focusFirstError(errs, ORDER, idFor)
      return
    }

    setSubmitting(true)
    setSubmitError("")
    try {
      await createDrive({
        companyName: form.companyName.trim(),
        companyLogo: form.companyLogo.trim() || undefined,
        role: form.role.trim(),
        description: form.description.trim() || undefined,
        jobType: form.jobType,
        driveType: form.driveType,
        location: form.location.trim() || undefined,
        ctc: form.jobType === "fulltime" ? form.ctc.trim() : undefined,
        stipend: form.jobType === "internship" ? form.stipend.trim() : undefined,
        bond: form.bond.trim() || undefined,
        batch: form.batch ? Number(form.batch) : undefined,
        eligibleBranches: form.eligibleBranches,
        minCGPA: Number(form.minCGPA),
        minYear: Number(form.minYear),
        maxYear: Number(form.maxYear),
        maxBacklogs: Number(form.maxBacklogs),
        slots: form.slots ? Number(form.slots) : null,
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        applicationLink: form.applicationLink.trim(),
        brochureUrl: form.brochureUrl.trim() || undefined,
      })
      navigate("/career/drives", { state: { toast: "Drive created." } })
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to create drive. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const minDeadline = toLocalDateTimeInput(new Date(Date.now() + 60000))
  const pay = form.jobType === "fulltime" ? "ctc" : "stipend"

  // A plain text input with its label, hint and error.
  const text = (key, label, { optional, hint, full, type = "text", placeholder, ...rest } = {}) => (
    <Field id={`drive-${key}`} label={label} optional={optional} hint={hint} error={errors[key]} full={full}>
      <input
        id={`drive-${key}`}
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className={inputClass(errors[key])}
        {...describedBy(`drive-${key}`, errors[key])}
        {...rest}
      />
    </Field>
  )

  return (
    <FormSheet
      title="New placement drive"
      crumb={
        <>
          <Link to="/career" className={crumbLink}>Career</Link> /{" "}
          <Link to="/career/drives" className={crumbLink}>Drives</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormSection first title="Company and role" hint="This is what students see first in the drives list.">
          {text("companyName", "Company name", { placeholder: "e.g. Meridian Labs" })}
          {text("role", "Role", { placeholder: "e.g. Software Development Engineer" })}
          <Field id="drive-description" label="About the role" optional full>
            <textarea
              id="drive-description"
              rows={4}
              placeholder="What the team does, what the role involves, anything students should know"
              value={form.description}
              onChange={set("description")}
              className={`${fieldInput} resize-none py-2.5 leading-[1.55]`}
            />
          </Field>
          <Field id="drive-jobType" label="Job type" group error={errors.jobType}>
            <Segmented options={JOB_TYPES} value={form.jobType} onChange={(v) => setValue("jobType", v)} />
          </Field>
          <Field id="drive-driveType" label="Drive type" group>
            <Segmented options={DRIVE_TYPES} value={form.driveType} onChange={(v) => setValue("driveType", v)} />
          </Field>
          {pay === "ctc"
            ? text("ctc", "CTC", { optional: true, placeholder: "e.g. ₹24 LPA" })
            : text("stipend", "Stipend", { optional: true, placeholder: "e.g. ₹30,000 a month" })}
          {text("location", "Location", { optional: true, placeholder: "e.g. Hyderabad, Remote" })}
          {text("companyLogo", "Logo link", { optional: true, type: "url", placeholder: "https://" })}
          {text("bond", "Service bond", { optional: true, placeholder: "e.g. 2 years, None" })}
        </FormSection>

        <FormSection title="Who can apply" hint="Students who do not meet these cannot apply and see the reason.">
          <Field
            id="drive-eligibleBranches"
            label="Branches"
            group
            full
            hint={form.eligibleBranches.length === 0 ? "None picked, so every branch can apply." : undefined}
          >
            <Picks
              options={BRANCHES}
              value={form.eligibleBranches}
              onChange={(v) => setValue("eligibleBranches", v)}
            />
          </Field>
          {text("minCGPA", "Minimum CGPA", { type: "number", min: 0, max: 10, step: 0.1 })}
          {text("maxBacklogs", "Backlogs allowed", { type: "number", min: 0 })}
          <Field id="drive-minYear" label="From year" error={errors.yearConstraint}>
            <select
              id="drive-minYear"
              value={form.minYear}
              onChange={set("minYear")}
              className={inputClass(errors.yearConstraint)}
              {...describedBy("drive-minYear", errors.yearConstraint)}
            >
              {YEARS.map(yr => <option key={yr} value={yr}>Year {yr}</option>)}
            </select>
          </Field>
          <Field id="drive-maxYear" label="To year">
            <select id="drive-maxYear" value={form.maxYear} onChange={set("maxYear")} className={inputClass(errors.yearConstraint)}>
              {YEARS.map(yr => <option key={yr} value={yr}>Year {yr}</option>)}
            </select>
          </Field>
          {text("batch", "Graduating batch", { optional: true, type: "number", placeholder: "e.g. 2027" })}
        </FormSection>

        <FormSection title="Dates and links" hint="Rounds are added after the drive is created.">
          {text("registrationDeadline", "Applications close", { type: "datetime-local", min: minDeadline })}
          {text("slots", "Positions", { optional: true, type: "number", min: 1, placeholder: "No limit" })}
          {text("applicationLink", "Application link", { type: "url", placeholder: "https://" })}
          {text("brochureUrl", "Brochure link", { optional: true, type: "url", placeholder: "https://" })}
        </FormSection>

        <FormBar message={submitError || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btn}>
            {submitting ? <Busy>Creating…</Busy> : "Create drive"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  )
}

export default CreateDrive;
