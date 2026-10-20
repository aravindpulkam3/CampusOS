import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  getCurricula,
  createCurriculum,
  addSubject,
  updateSubject,
  deleteSubject,
  deleteCurriculum,
} from "../../api/curriculum.api";
import {
  Alert,
  LoadError,
  PageTitle,
  btn,
  btnGhostSm,
  btnSm,
  fieldInput,
  fieldLabel,
  focusRing,
  note,
  panel,
  textLink,
} from "../../components/common/ui";

const emptyCreateForm = { branch: "", semesterNumber: "" };

const rowAction = `rounded text-[13.5px] font-[550] transition-colors disabled:opacity-50 ${focusRing}`;
const smallInput = `h-9 min-w-0 rounded-[9px] border border-line-2 bg-white px-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-ink-3 focus:ring-2 focus:ring-ink/10`;

const SubjectRow = ({ curriculumId, subject, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: subject.name, code: subject.code || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateSubject(curriculumId, subject._id, form);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update subject.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${subject.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteSubject(curriculumId, subject._id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Subject is still referenced and can't be deleted.");
      setBusy(false);
    }
  };

  return (
    <li className="py-2.5">
      {editing ? (
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <input
            autoFocus
            aria-label="Subject name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={`${smallInput} flex-1`}
          />
          <input
            aria-label="Subject code"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="Code"
            className={`${smallInput} w-24`}
          />
          <button type="submit" disabled={busy} className={btnSm}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={btnGhostSm}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-baseline gap-4">
          <span className="min-w-0 flex-1 break-words text-[14.5px] text-ink">
            {subject.name}
            {subject.code && <span className="ml-2 text-[13px] text-ink-3">{subject.code}</span>}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${subject.name}`}
            className={`${rowAction} text-ink-2 hover:text-ink`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label={`Delete ${subject.name}`}
            className={`${rowAction} text-ink-2 hover:text-urgent`}
          >
            Delete
          </button>
        </div>
      )}
      {error && (
        <div className="mt-1.5">
          <Alert>{error}</Alert>
        </div>
      )}
    </li>
  );
};

const CurriculumCard = ({ curriculum, onChanged }) => {
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await addSubject(curriculum._id, newSubject);
      setNewSubject({ name: "", code: "" });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add subject.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCurriculum = async () => {
    if (!window.confirm(`Delete the ${curriculum.branch} semester ${curriculum.semesterNumber} curriculum and its subjects?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteCurriculum(curriculum._id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Curriculum is still referenced and can't be deleted.");
      setBusy(false);
    }
  };

  const title = `${curriculum.branch}, semester ${curriculum.semesterNumber}`;

  return (
    <section aria-label={title} className={`px-5 py-5 ${panel}`}>
      <div className="flex items-baseline gap-4">
        <h3 className="min-w-0 flex-1 text-[15.5px] font-[650] tracking-[-0.02em] text-ink">{title}</h3>
        <span className="text-[13px] text-ink-3">
          {curriculum.subjects.length} {curriculum.subjects.length === 1 ? "subject" : "subjects"}
        </span>
        <button
          type="button"
          onClick={handleDeleteCurriculum}
          disabled={busy}
          aria-label={`Delete the ${title} curriculum`}
          className={`${rowAction} text-ink-2 hover:text-urgent`}
        >
          Delete
        </button>
      </div>

      {error && (
        <div className="mt-2">
          <Alert>{error}</Alert>
        </div>
      )}

      {curriculum.subjects.length === 0 ? (
        <p className={`mt-2 ${note}`}>No subjects yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {curriculum.subjects.map((s) => (
            <SubjectRow key={s._id} curriculumId={curriculum._id} subject={s} onChanged={onChanged} />
          ))}
        </ul>
      )}

      <form onSubmit={handleAddSubject} className="mt-3 flex items-center gap-2 border-t border-line pt-3.5">
        <input
          aria-label={`New subject for ${title}`}
          placeholder="New subject"
          value={newSubject.name}
          onChange={(e) => setNewSubject((p) => ({ ...p, name: e.target.value }))}
          className={`${smallInput} flex-1`}
        />
        <input
          aria-label="Code for the new subject"
          placeholder="Code"
          value={newSubject.code}
          onChange={(e) => setNewSubject((p) => ({ ...p, code: e.target.value }))}
          className={`${smallInput} w-24`}
        />
        <button type="submit" disabled={busy || !newSubject.name.trim()} className={btnGhostSm}>
          <Plus size={13} aria-hidden="true" /> Add
        </button>
      </form>
    </section>
  );
};

const CurriculumManagement = () => {
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCurricula = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await getCurricula();
      setCurricula(data.data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurricula();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.branch.trim() || !createForm.semesterNumber) {
      setCreateError("Branch and semester number are both required.");
      return;
    }
    setCreating(true);
    try {
      await createCurriculum({
        branch: createForm.branch.trim(),
        semesterNumber: Number(createForm.semesterNumber),
        subjects: [],
      });
      setCreateForm(emptyCreateForm);
      fetchCurricula();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create curriculum.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle
        crumb="Admin"
        title="Curricula"
        sub="The subjects of each branch and semester, shared by every classroom of that branch in that semester."
      />

      <section className={`mt-8 px-5 py-5 lg:px-[26px] lg:py-6 ${panel}`}>
        <h2 className="text-[17px] font-[650] tracking-[-0.025em] text-ink">New curriculum</h2>
        <p className="mt-1 max-w-[70ch] text-[14.5px] leading-[1.6] text-ink-2">
          Defined once per branch and semester, whatever the admission batch. Class representatives
          can't add, change or delete subjects.
        </p>
        <form
          onSubmit={handleCreate}
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <label htmlFor="new-curriculum-branch" className={fieldLabel}>Branch</label>
            <input
              id="new-curriculum-branch"
              type="text"
              placeholder="e.g. CSE"
              value={createForm.branch}
              onChange={(e) => setCreateForm((p) => ({ ...p, branch: e.target.value }))}
              className={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="new-curriculum-semester" className={fieldLabel}>Semester</label>
            <input
              id="new-curriculum-semester"
              type="number"
              min={1}
              max={8}
              placeholder="1 to 8"
              value={createForm.semesterNumber}
              onChange={(e) => setCreateForm((p) => ({ ...p, semesterNumber: e.target.value }))}
              className={fieldInput}
            />
          </div>
          <button type="submit" disabled={creating} className={`h-[42px] ${btn}`}>
            <Plus size={15} aria-hidden="true" /> {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {createError && (
          <div className="mt-3">
            <Alert>{createError}</Alert>
          </div>
        )}
      </section>

      <section className="mt-12 lg:mt-14" aria-labelledby="curricula-heading">
        <div className="flex items-baseline gap-4">
          <h2 id="curricula-heading" className="text-[17px] font-[650] tracking-[-0.025em] text-ink">
            All curricula
          </h2>
          <button type="button" onClick={fetchCurricula} className={`ml-auto ${textLink}`}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-5 grid animate-pulse grid-cols-1 gap-5 lg:grid-cols-2" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-panel bg-soft" />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-5">
            <LoadError onRetry={fetchCurricula}>Couldn't load the curricula.</LoadError>
          </div>
        ) : curricula.length === 0 ? (
          <p className={`mt-5 ${note}`}>No curricula yet.</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            {curricula.map((c) => (
              <CurriculumCard key={c._id} curriculum={c} onChanged={fetchCurricula} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CurriculumManagement;
