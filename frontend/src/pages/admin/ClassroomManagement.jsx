import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  createClassroomAdmin,
  listClassroomsAdmin,
  updateClassroomAdmin,
  overrideSemesterAdmin,
} from "../../api/adminClassroom.api";
import {
  Alert,
  LoadError,
  PageTitle,
  btn,
  btnDangerSm,
  btnGhostSm,
  btnSm,
  fieldInput,
  fieldLabel,
  focusRing,
  note,
  panel,
  tableCell,
  tableHead,
  textLink,
} from "../../components/common/ui";

const emptyCreateForm = { branch: "", batch: "", section: "" };

const rowAction = `rounded font-[550] text-ink underline-offset-[3px] hover:underline disabled:text-ink-3 disabled:no-underline ${focusRing}`;
const smallInput = `h-9 rounded-[9px] border border-line-2 bg-white px-2.5 text-[14px] text-ink outline-none focus:border-ink-3 focus:ring-2 focus:ring-ink/10`;

const ClassroomManagement = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // One row opens at a time, to change its class rep or its semester.
  const [open, setOpen] = useState(null); // { id, kind: "cr" | "semester" }
  const [crInputs, setCrInputs] = useState({});
  const [overrideInputs, setOverrideInputs] = useState({});
  const [rowError, setRowError] = useState({});
  const [rowBusy, setRowBusy] = useState({});

  const fetchClassrooms = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await listClassroomsAdmin();
      setClassrooms(data.data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
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
      setOpen(null);
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

  // Destructive, like a class rep starting the next semester: the timetable is
  // cleared and the classroom switches curriculum. Confirmed first.
  const handleOverride = async (classroom) => {
    const classroomId = classroom._id;
    const semesterNumber = Number(overrideInputs[classroomId]);
    if (
      !window.confirm(
        `Set ${classroom.branch} ${classroom.batch} ${classroom.section} to semester ${semesterNumber}? Its timetable is cleared and can't be recovered.`,
      )
    )
      return;
    setRowError((p) => ({ ...p, [classroomId]: "" }));
    setRowBusy((p) => ({ ...p, [classroomId]: true }));
    try {
      await overrideSemesterAdmin(classroomId, { semesterNumber });
      setOpen(null);
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

  const openRow = (id, kind) => {
    setOpen({ id, kind });
    setRowError((p) => ({ ...p, [id]: "" }));
  };

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle crumb="Admin" title="Classrooms" sub="One classroom for each cohort: branch, batch and section." />

      <section className={`mt-8 px-5 py-5 lg:px-[26px] lg:py-6 ${panel}`}>
        <h2 className="text-[17px] font-[650] tracking-[-0.025em] text-ink">New classroom</h2>
        <p className="mt-1 max-w-[70ch] text-[14.5px] leading-[1.6] text-ink-2">
          Students already registered in this cohort are linked to it as soon as it's created.
        </p>
        <form
          onSubmit={handleCreate}
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <label htmlFor="new-classroom-branch" className={fieldLabel}>Branch</label>
            <input
              id="new-classroom-branch"
              type="text"
              placeholder="e.g. CSE"
              value={createForm.branch}
              onChange={(e) => setCreateForm((p) => ({ ...p, branch: e.target.value }))}
              className={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="new-classroom-batch" className={fieldLabel}>Batch</label>
            <input
              id="new-classroom-batch"
              type="number"
              placeholder="e.g. 2023"
              value={createForm.batch}
              onChange={(e) => setCreateForm((p) => ({ ...p, batch: e.target.value }))}
              className={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="new-classroom-section" className={fieldLabel}>Section</label>
            <input
              id="new-classroom-section"
              type="text"
              placeholder="e.g. A"
              value={createForm.section}
              onChange={(e) => setCreateForm((p) => ({ ...p, section: e.target.value }))}
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

      <section className="mt-12 lg:mt-14" aria-labelledby="classrooms-heading">
        <div className="flex items-baseline gap-4">
          <h2 id="classrooms-heading" className="text-[17px] font-[650] tracking-[-0.025em] text-ink">
            All classrooms
          </h2>
          <button type="button" onClick={fetchClassrooms} className={`ml-auto ${textLink}`}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-5 animate-pulse space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-soft" />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-5">
            <LoadError onRetry={fetchClassrooms}>Couldn't load the classrooms.</LoadError>
          </div>
        ) : classrooms.length === 0 ? (
          <p className={`mt-5 ${note}`}>No classrooms yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[14px]">
              <thead>
                <tr>
                  <th scope="col" className={tableHead}>Classroom</th>
                  <th scope="col" className={tableHead}>Semester</th>
                  <th scope="col" className={tableHead}>Class representative</th>
                  <th scope="col" className={`${tableHead} pr-0`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((c) => {
                  const isOpen = open?.id === c._id;
                  const busy = rowBusy[c._id];
                  const label = `${c.branch} ${c.batch}, Section ${c.section}`;
                  return [
                    <tr key={c._id} className={isOpen ? "bg-soft/70" : undefined}>
                      <td className={`${tableCell} font-semibold text-ink`}>{label}</td>
                      <td className={`${tableCell} text-ink-2`}>
                        {c.currentSemesterNumber ? (
                          `Semester ${c.currentSemesterNumber}`
                        ) : (
                          <span className="text-ink-3">Not started</span>
                        )}
                      </td>
                      <td className={`${tableCell} text-ink-2`}>
                        {c.classRepresentative ? (
                          `${c.classRepresentative.firstName} ${c.classRepresentative.lastName}`
                        ) : (
                          <span className="text-ink-3">Unassigned</span>
                        )}
                      </td>
                      <td className={`${tableCell} pr-0 text-right`}>
                        <span className="inline-flex gap-4">
                          <button
                            type="button"
                            onClick={() => openRow(c._id, "cr")}
                            disabled={isOpen && open.kind === "cr"}
                            aria-label={`Change the class rep of ${label}`}
                            className={rowAction}
                          >
                            Change rep
                          </button>
                          <button
                            type="button"
                            onClick={() => openRow(c._id, "semester")}
                            disabled={isOpen && open.kind === "semester"}
                            aria-label={`Set the semester of ${label}`}
                            className={rowAction}
                          >
                            Set semester
                          </button>
                        </span>
                      </td>
                    </tr>,
                    isOpen && (
                      <tr key={`${c._id}-open`} className="bg-soft/70">
                        <td colSpan={4} className="border-b border-line px-0 pb-4 pt-1">
                          {open.kind === "cr" ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleAssignCr(c._id);
                              }}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <label htmlFor={`cr-${c._id}`} className="text-[13.5px] font-[550] text-ink">
                                New class rep's roll number
                              </label>
                              <input
                                id={`cr-${c._id}`}
                                autoFocus
                                type="text"
                                value={crInputs[c._id] || ""}
                                onChange={(e) => setCrInputs((p) => ({ ...p, [c._id]: e.target.value }))}
                                className={`${smallInput} w-40`}
                              />
                              <button type="submit" disabled={busy} className={btnSm}>
                                {busy ? "Saving…" : "Save"}
                              </button>
                              <button type="button" onClick={() => setOpen(null)} className={btnGhostSm}>
                                Cancel
                              </button>
                              <span className="w-full text-[13px] text-ink-3">
                                Leave it empty and save to remove the current class rep.
                              </span>
                            </form>
                          ) : (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleOverride(c);
                              }}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <label htmlFor={`sem-${c._id}`} className="text-[13.5px] font-[550] text-ink">
                                Semester
                              </label>
                              <input
                                id={`sem-${c._id}`}
                                autoFocus
                                type="number"
                                min={1}
                                max={8}
                                value={overrideInputs[c._id] || ""}
                                onChange={(e) => setOverrideInputs((p) => ({ ...p, [c._id]: e.target.value }))}
                                className={`${smallInput} w-20`}
                              />
                              <button type="submit" disabled={busy || !overrideInputs[c._id]} className={btnDangerSm}>
                                {busy ? "Setting…" : "Set semester"}
                              </button>
                              <button type="button" onClick={() => setOpen(null)} className={btnGhostSm}>
                                Cancel
                              </button>
                              <span className="w-full text-[13px] text-ink-3">
                                Jumps straight to that semester's curriculum and clears the current
                                timetable. For onboarding a classroom or fixing a mistake.
                              </span>
                            </form>
                          )}
                          {rowError[c._id] && (
                            <div className="mt-2">
                              <Alert>{rowError[c._id]}</Alert>
                            </div>
                          )}
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ClassroomManagement;
