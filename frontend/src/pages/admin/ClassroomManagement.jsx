import { useState, useEffect } from "react";
import { Plus, UserCheck, RefreshCw } from "lucide-react";
import {
  createClassroomAdmin,
  listClassroomsAdmin,
  updateClassroomAdmin,
  overrideSemesterAdmin,
} from "../../api/adminClassroom.api";

const emptyCreateForm = { branch: "", batch: "", section: "" };

const ClassroomManagement = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [crInputs, setCrInputs] = useState({});
  const [overrideInputs, setOverrideInputs] = useState({});
  const [rowError, setRowError] = useState({});
  const [rowBusy, setRowBusy] = useState({});

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const { data } = await listClassroomsAdmin();
      setClassrooms(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.branch.trim() || !createForm.batch || !createForm.section.trim()) {
      setCreateError("Branch, batch, and section are all required.");
      return;
    }
    setCreating(true);
    try {
      await createClassroomAdmin({
        branch: createForm.branch.trim(),
        batch: Number(createForm.batch),
        section: createForm.section.trim().toUpperCase(),
      });
      setCreateForm(emptyCreateForm);
      fetchClassrooms();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create classroom.");
    } finally {
      setCreating(false);
    }
  };

  const handleAssignCr = async (classroomId) => {
    const rollNumber = crInputs[classroomId] || "";
    setRowError((p) => ({ ...p, [classroomId]: "" }));
    setRowBusy((p) => ({ ...p, [classroomId]: true }));
    try {
      await updateClassroomAdmin(classroomId, { classRepresentativeRollNumber: rollNumber });
      fetchClassrooms();
    } catch (err) {
      setRowError((p) => ({
        ...p,
        [classroomId]: err.response?.data?.message || "Failed to assign CR.",
      }));
    } finally {
      setRowBusy((p) => ({ ...p, [classroomId]: false }));
    }
  };

  const handleOverride = async (classroomId) => {
    const semesterNumber = Number(overrideInputs[classroomId]);
    setRowError((p) => ({ ...p, [classroomId]: "" }));
    setRowBusy((p) => ({ ...p, [classroomId]: true }));
    try {
      await overrideSemesterAdmin(classroomId, { semesterNumber });
      fetchClassrooms();
    } catch (err) {
      setRowError((p) => ({
        ...p,
        [classroomId]: err.response?.data?.message || "Failed to override semester.",
      }));
    } finally {
      setRowBusy((p) => ({ ...p, [classroomId]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Create Classroom</h3>
        <p className="text-xs text-gray-400 mb-4">
          A classroom represents one stable cohort (branch + batch + section). Any already-registered
          student matching this cohort is linked automatically once created.
        </p>
        {createError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{createError}</p>
          </div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Batch</label>
            <input
              type="number"
              placeholder="e.g. 2023"
              value={createForm.batch}
              onChange={(e) => setCreateForm((p) => ({ ...p, batch: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Section</label>
            <input
              type="text"
              placeholder="e.g. A"
              value={createForm.section}
              onChange={(e) => setCreateForm((p) => ({ ...p, section: e.target.value }))}
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
          <h3 className="text-sm font-semibold text-gray-900">Classrooms</h3>
          <button
            onClick={fetchClassrooms}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : classrooms.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No classrooms yet.</p>
        ) : (
          <div className="space-y-3">
            {classrooms.map((c) => (
              <div key={c._id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {c.branch} {c.batch} - {c.section}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      CR:{" "}
                      {c.classRepresentative
                        ? `${c.classRepresentative.firstName} ${c.classRepresentative.lastName}`
                        : "Unassigned"}
                    </p>
                  </div>
                </div>

                {rowError[c._id] && (
                  <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{rowError[c._id]}</p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="CR roll number"
                      value={crInputs[c._id] || ""}
                      onChange={(e) => setCrInputs((p) => ({ ...p, [c._id]: e.target.value }))}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400 w-32"
                    />
                    <button
                      onClick={() => handleAssignCr(c._id)}
                      disabled={rowBusy[c._id]}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
                    >
                      <UserCheck size={11} /> Assign CR
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={8}
                      placeholder="Sem #"
                      value={overrideInputs[c._id] || ""}
                      onChange={(e) => setOverrideInputs((p) => ({ ...p, [c._id]: e.target.value }))}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400 w-20"
                    />
                    <button
                      onClick={() => handleOverride(c._id)}
                      disabled={rowBusy[c._id]}
                      className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
                    >
                      Set semester directly
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomManagement;
