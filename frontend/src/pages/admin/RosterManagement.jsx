import { useState, useEffect, useRef, useCallback } from "react";
import { FileUp } from "lucide-react";
import useDebounce from "../../hooks/useDebounce";
import {
  importRosterApi,
  listRosterApi,
  updateAcademicsApi,
  updateYearApi,
} from "../../api/roster.api";
import {
  Alert,
  LoadError,
  PageNumbers,
  PageTitle,
  Pill,
  SearchField,
  btn,
  btnGhostSm,
  btnSm,
  focusRing,
  note,
  panel,
  tableCell,
  tableHead,
} from "../../components/common/ui";

const REQUIRED_COLUMNS = "rollNumber, email, firstName, lastName, branch, batch, section, year";
const OPTIONAL_COLUMNS = "cgpa, backlogs";

// The server's own default page size, sent explicitly so the "1 to 50" line is right.
const PAGE_SIZE = 50;

// Blank input clears the value ("not on file"), which the server keeps as null.
const toNullableNumber = (value) => (value === "" ? null : Number(value));

const cellInput = `h-9 w-[76px] rounded-[9px] border border-line-2 bg-white px-2.5 text-[14px] tabular-nums text-ink outline-none focus:border-ink-3 focus:ring-2 focus:ring-ink/10`;

const RosterManagement = () => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [report, setReport] = useState(null);

  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listErrorPage, setListErrorPage] = useState(null);
  const requestRef = useRef(0);
  const debouncedSearch = useDebounce(search, 400);

  // One row is edited at a time; `edits` holds what was typed into it.
  const [editing, setEditing] = useState(null);
  const [edits, setEdits] = useState({});
  const [rowError, setRowError] = useState({});
  const [rowBusy, setRowBusy] = useState({});

  // Only the newest request may update the table.
  const fetchRoster = useCallback(
    async (page = 1) => {
      const request = ++requestRef.current;
      setLoading(true);
      setListErrorPage(null);
      try {
        const { data } = await listRosterApi({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch.trim() || undefined,
        });
        if (request !== requestRef.current) return;
        setEntries(data.data.entries);
        setPagination(data.data.pagination);
        setEdits({});
        setEditing(null);
      } catch (err) {
        if (request === requestRef.current) {
          console.error(err);
          setListErrorPage(page);
        }
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    fetchRoster(1);
    return () => {
      requestRef.current += 1;
    };
  }, [fetchRoster]);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) {
      setImportError("Choose a CSV file first.");
      return;
    }
    setImporting(true);
    setImportError("");
    setReport(null);
    try {
      const { data } = await importRosterApi(file);
      setReport(data.data);
      fetchRoster(1);
    } catch (err) {
      setImportError(err.response?.data?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const editValue = (entry, field) =>
    edits[entry.rollNumber]?.[field] ?? (entry[field] === null ? "" : String(entry[field]));

  const setEdit = (rollNumber, field, value) =>
    setEdits((p) => ({ ...p, [rollNumber]: { ...p[rollNumber], [field]: value } }));

  const startEdit = (roll) => {
    setEditing(roll);
    setRowError((p) => ({ ...p, [roll]: "" }));
  };

  const cancelEdit = (roll) => {
    setEditing(null);
    setEdits((p) => {
      const next = { ...p };
      delete next[roll];
      return next;
    });
  };

  const handleSave = async (entry) => {
    const roll = entry.rollNumber;
    const edit = edits[roll] || {};
    setRowError((p) => ({ ...p, [roll]: "" }));
    setRowBusy((p) => ({ ...p, [roll]: true }));
    try {
      const academics = {};
      if (edit.cgpa !== undefined) academics.cgpa = toNullableNumber(edit.cgpa);
      if (edit.backlogs !== undefined) academics.backlogs = toNullableNumber(edit.backlogs);
      if (Object.keys(academics).length) await updateAcademicsApi(roll, academics);
      if (edit.year !== undefined && Number(edit.year) !== entry.year) {
        await updateYearApi(roll, { year: Number(edit.year) });
      }
      fetchRoster(pagination.page);
    } catch (err) {
      setRowError((p) => ({ ...p, [roll]: err.response?.data?.message || "Update failed." }));
    } finally {
      setRowBusy((p) => ({ ...p, [roll]: false }));
    }
  };

  const first = (pagination.page - 1) * PAGE_SIZE + 1;

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle crumb="Admin" title="Student roster" />

      <section
        className={`mt-8 grid grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-[26px] lg:py-6 ${panel}`}
      >
        <div className="min-w-0">
          <h2 className="text-[17px] font-[650] tracking-[-0.025em] text-ink">Import the student roster</h2>
          <p className="mt-1 max-w-[70ch] text-[14.5px] leading-[1.6] text-ink-2">
            Students can only activate an account whose email is on this roster; their roll number,
            cohort and academic details come from here. A CSV with{" "}
            <code className="font-mono text-[13px] text-ink">{REQUIRED_COLUMNS}</code>. Optional:{" "}
            <code className="font-mono text-[13px] text-ink">{OPTIONAL_COLUMNS}</code>. Importing again
            updates year, CGPA and backlogs for students who have already activated; their email and
            cohort cannot change.
          </p>
        </div>
        <form onSubmit={handleImport} className="flex flex-wrap items-center gap-2.5">
          {/* The real file input sits inside the label, hidden, so the label is the control */}
          <label className="inline-flex h-[38px] max-w-[240px] cursor-pointer items-center gap-2 rounded-[11px] border border-dashed border-line-2 px-3.5 text-[14px] text-ink-2 transition-colors focus-within:ring-2 focus-within:ring-ink/25 hover:border-ink-3 hover:text-ink">
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Roster CSV file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setImportError("");
              }}
              className="sr-only"
            />
            <FileUp size={15} className="flex-none text-ink-3" aria-hidden="true" />
            <span className="truncate">{file ? file.name : "Choose a CSV file"}</span>
          </label>
          <button type="submit" disabled={importing} className={btn}>
            {importing ? "Importing…" : "Import CSV"}
          </button>
        </form>

        {(importError || report) && (
          <div className="lg:col-span-2">
            {importError && <Alert>{importError}</Alert>}
            {report && (
              <div className="space-y-3">
                <Alert kind="success">
                  Created {report.created}, updated {report.updated}, rejected {report.rejected.length}.
                </Alert>
                {report.rejected.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[14px]">
                      <caption className="pb-2 text-left text-[13.5px] font-[550] text-urgent">
                        Rows that were not imported
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col" className={tableHead}>Line</th>
                          <th scope="col" className={tableHead}>Roll number</th>
                          <th scope="col" className={`${tableHead} pr-0`}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rejected.map((r) => (
                          <tr key={`${r.row}-${r.rollNumber}`}>
                            <td className={`${tableCell} tabular-nums text-ink-3`}>{r.row}</td>
                            <td className={`${tableCell} tabular-nums text-ink`}>{r.rollNumber || "—"}</td>
                            <td className={`${tableCell} whitespace-normal pr-0 text-ink-2`}>{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-12 lg:mt-14" aria-labelledby="roster-students">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="roster-students" className="text-[17px] font-[650] tracking-[-0.025em] text-ink">
            Students
          </h2>
          <SearchField
            value={search}
            onChange={setSearch}
            label="Search the roster by roll number or email"
            placeholder="Roll number or email"
            className="sm:w-[300px]"
          />
        </div>

        {loading ? (
          <div className="mt-5 animate-pulse space-y-3" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-soft" />
            ))}
          </div>
        ) : listErrorPage !== null ? (
          <div className="mt-5">
            <LoadError onRetry={() => fetchRoster(listErrorPage)}>Could not load the roster.</LoadError>
          </div>
        ) : entries.length === 0 ? (
          <p className={`mt-5 ${note}`}>
            {debouncedSearch.trim() ? `No students match "${debouncedSearch.trim()}".` : "The roster is empty. Import a CSV to start."}
          </p>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th scope="col" className={tableHead}>Roll number</th>
                    <th scope="col" className={tableHead}>Name and email</th>
                    <th scope="col" className={tableHead}>Cohort</th>
                    <th scope="col" className={tableHead}>Year</th>
                    <th scope="col" className={tableHead}>CGPA</th>
                    <th scope="col" className={tableHead}>Backlogs</th>
                    <th scope="col" className={tableHead}>Status</th>
                    <th scope="col" className={`${tableHead} pr-0`}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const roll = entry.rollNumber;
                    const isEditing = editing === roll;
                    const busy = rowBusy[roll];
                    return [
                      <tr key={entry._id} className={isEditing ? "bg-soft/70" : undefined}>
                        <td className={`${tableCell} tabular-nums text-ink`}>{roll}</td>
                        <td className={`${tableCell} leading-[1.35]`}>
                          <b className="block font-semibold text-ink">
                            {entry.firstName} {entry.lastName}
                          </b>
                          <span className="text-[13px] text-ink-2">{entry.email}</span>
                        </td>
                        <td className={`${tableCell} text-ink-2`}>
                          {entry.branch} {entry.batch} {entry.section}
                        </td>
                        {isEditing ? (
                          <>
                            <td className={tableCell}>
                              <select
                                autoFocus
                                aria-label={`Year for ${roll}`}
                                value={editValue(entry, "year")}
                                onChange={(e) => setEdit(roll, "year", e.target.value)}
                                className={cellInput}
                              >
                                {[1, 2, 3, 4].map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className={tableCell}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="10"
                                aria-label={`CGPA for ${roll}`}
                                value={editValue(entry, "cgpa")}
                                onChange={(e) => setEdit(roll, "cgpa", e.target.value)}
                                className={cellInput}
                              />
                            </td>
                            <td className={tableCell}>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                aria-label={`Backlogs for ${roll}`}
                                value={editValue(entry, "backlogs")}
                                onChange={(e) => setEdit(roll, "backlogs", e.target.value)}
                                className={cellInput}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`${tableCell} tabular-nums text-ink-2`}>{entry.year}</td>
                            <td className={`${tableCell} tabular-nums text-ink-2`}>
                              {entry.cgpa ?? <span className="text-ink-3">Not on file</span>}
                            </td>
                            <td className={`${tableCell} tabular-nums text-ink-2`}>
                              {entry.backlogs ?? <span className="text-ink-3">Not on file</span>}
                            </td>
                          </>
                        )}
                        <td className={tableCell}>
                          <Pill tone={entry.claimedBy ? "good" : "neutral"}>
                            {entry.claimedBy ? "Activated" : "Not activated"}
                          </Pill>
                        </td>
                        <td className={`${tableCell} pr-0 text-right`}>
                          {isEditing ? (
                            <span className="inline-flex gap-1.5">
                              <button type="button" onClick={() => cancelEdit(roll)} disabled={busy} className={btnGhostSm}>
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSave(entry)}
                                disabled={!edits[roll] || busy}
                                className={btnSm}
                              >
                                {busy ? "Saving…" : "Save"}
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(roll)}
                              disabled={editing !== null}
                              aria-label={`Edit ${entry.firstName} ${entry.lastName}`}
                              className={`rounded font-[550] text-ink underline-offset-[3px] hover:underline disabled:text-ink-3 disabled:no-underline ${focusRing}`}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>,
                      rowError[roll] && (
                        <tr key={`${entry._id}-error`}>
                          <td colSpan={8} className="border-b border-line pb-3 pt-0">
                            <Alert>{rowError[roll]}</Alert>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
            <PageNumbers page={pagination.page} pages={pagination.pages} onPage={fetchRoster}>
              {pagination.pages > 1 ? `${first} to ${first + entries.length - 1} of ` : ""}
              {pagination.total} {pagination.total === 1 ? "student" : "students"}
            </PageNumbers>
          </>
        )}
      </section>
      {editing !== null && (
        <p className="sr-only" aria-live="polite">
          Editing {editing}. Change the values and press Save, or Cancel.
        </p>
      )}
    </div>
  );
};

export default RosterManagement;
