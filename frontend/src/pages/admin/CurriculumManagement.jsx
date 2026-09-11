import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Pencil, Check, X } from "lucide-react";
import {
  getCurricula,
  createCurriculum,
  addSubject,
  updateSubject,
  deleteSubject,
  deleteCurriculum,
} from "../../api/curriculum.api";

const emptyCreateForm = { branch: "", semesterNumber: "" };

const SubjectRow = ({ curriculumId, subject, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: subject.name, code: subject.code || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
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

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
        />
        <input
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          placeholder="Code"
          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
        />
        <button onClick={handleSave} disabled={busy} className="text-green-600 hover:text-green-700">
          <Check size={13} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-700">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between py-1.5 group">
        <div className="text-xs text-gray-700">
          {subject.name}
          {subject.code && <span className="text-gray-400"> ({subject.code})</span>}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-900">
            <Pencil size={11} />
          </button>
          <button onClick={handleDelete} disabled={busy} className="text-gray-400 hover:text-red-500">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 pb-1">{error}</p>}
    </div>
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

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {curriculum.branch} — Semester {curriculum.semesterNumber}
        </p>
        <button onClick={handleDeleteCurriculum} disabled={busy} className="text-gray-400 hover:text-red-500">
          <Trash2 size={13} />
        </button>
      </div>

      {error && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-3 divide-y divide-gray-50">
        {curriculum.subjects.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No subjects yet.</p>
        ) : (
          curriculum.subjects.map((s) => (
            <SubjectRow key={s._id} curriculumId={curriculum._id} subject={s} onChanged={onChanged} />
          ))
        )}
      </div>

      <form onSubmit={handleAddSubject} className="mt-3 flex items-center gap-2">
        <input
          placeholder="New subject name"
          value={newSubject.name}
          onChange={(e) => setNewSubject((p) => ({ ...p, name: e.target.value }))}
          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
        />
        <input
          placeholder="Code"
          value={newSubject.code}
          onChange={(e) => setNewSubject((p) => ({ ...p, code: e.target.value }))}
          className="w-20 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
        >
          <Plus size={11} /> Add
        </button>
      </form>
    </div>
  );
};

const CurriculumManagement = () => {
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCurricula = async () => {
    setLoading(true);
    try {
      const { data } = await getCurricula();
      setCurricula(data.data);
    } catch (err) {
      console.error(err);
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
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Create Curriculum</h3>
        <p className="text-xs text-gray-400 mb-4">
          Subjects are defined once per branch + semester and shared by every classroom of that branch
          currently in that semester, regardless of admission batch — a class representative can never
          add, edit, or delete them.
        </p>
        {createError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{createError}</p>
          </div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch</label>
            <input
              type="text"
              placeholder="e.g. CSE"
              value={createForm.branch}
              onChange={(e) => setCreateForm((p) => ({ ...p, branch: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Semester #</label>
            <input
              type="number"
              min={1}
              max={8}
              placeholder="1-8"
              value={createForm.semesterNumber}
              onChange={(e) => setCreateForm((p) => ({ ...p, semesterNumber: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <Plus size={14} /> {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Curricula</h3>
          <button
            onClick={fetchCurricula}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : curricula.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No curricula yet.</p>
        ) : (
          <div className="space-y-3">
            {curricula.map((c) => (
              <CurriculumCard key={c._id} curriculum={c} onChanged={fetchCurricula} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CurriculumManagement;
