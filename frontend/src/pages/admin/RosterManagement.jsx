import { useState, useEffect } from "react";
import { Upload, Search } from "lucide-react";
import {
  importRosterApi,
  listRosterApi,
  updateAcademicsApi,
  updateYearApi,
} from "../../api/roster.api";

const REQUIRED_COLUMNS = "rollNumber, email, firstName, lastName, branch, batch, section, year";

// Blank input clears the value ("not on file"), which the server keeps as null.
const toNullableNumber = (value) => (value === "" ? null : Number(value));

const RosterManagement = () => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [report, setReport] = useState(null);

  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [edits, setEdits] = useState({});
  const [rowError, setRowError] = useState({});
  const [rowBusy, setRowBusy] = useState({});

  const fetchRoster = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await listRosterApi({ page, search: search.trim() || undefined });
      setEntries(data.data.entries);
      setPagination(data.data.pagination);
      setEdits({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const inputClass =
    "w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Import Roster</h3>
        <p className="text-xs text-gray-400 mb-4">
          Students can only activate an account whose email is on this roster; their roll number,
          cohort and academic details come from here. Required columns: {REQUIRED_COLUMNS}.
          Optional: cgpa, backlogs. Re-importing updates year, CGPA and backlogs of activated
          students; their email and cohort cannot change.
        </p>
        {importError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{importError}</p>
          </div>
        )}
        <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setImportError("");
            }}
            className="text-xs text-gray-600"
          />
          <button
            type="submit"
            disabled={importing}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <Upload size={14} />
            {importing ? "Importing..." : "Import CSV"}
          </button>
        </form>

        {report && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-700">
              Created <span className="font-semibold">{report.created}</span> · Updated{" "}
              <span className="font-semibold">{report.updated}</span> · Rejected{" "}
              <span className="font-semibold">{report.rejected.length}</span>
            </p>
            {report.rejected.length > 0 && (
              <div className="overflow-x-auto border border-red-100 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 text-red-800">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Line</th>
                      <th className="text-left px-3 py-2 font-medium">Roll number</th>
                      <th className="text-left px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rejected.map((r) => (
                      <tr key={`${r.row}-${r.rollNumber}`} className="border-t border-red-50">
                        <td className="px-3 py-2 text-gray-500">{r.row}</td>
                        <td className="px-3 py-2 text-gray-900">{r.rollNumber || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Roster <span className="text-gray-400 font-normal">({pagination.total})</span>
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchRoster(1);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Roll number or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Search size={13} /> Search
            </button>
          </form>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-gray-400">No roster entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">Roll number</th>
                  <th className="text-left px-2 py-2 font-medium">Name / email</th>
                  <th className="text-left px-2 py-2 font-medium">Cohort</th>
                  <th className="text-left px-2 py-2 font-medium w-16">Year</th>
                  <th className="text-left px-2 py-2 font-medium w-20">CGPA</th>
                  <th className="text-left px-2 py-2 font-medium w-20">Backlogs</th>
                  <th className="text-left px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id} className="border-t border-gray-50 align-top">
                    <td className="px-2 py-2 font-medium text-gray-900">{entry.rollNumber}</td>
                    <td className="px-2 py-2">
                      <div className="text-gray-900">
                        {entry.firstName} {entry.lastName}
                      </div>
                      <div className="text-gray-400">{entry.email}</div>
                    </td>
                    <td className="px-2 py-2 text-gray-600">
                      {entry.branch} {entry.batch} - {entry.section}
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={editValue(entry, "year")}
                        onChange={(e) => setEdit(entry.rollNumber, "year", e.target.value)}
                        className={inputClass}
                      >
                        {[1, 2, 3, 4].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={editValue(entry, "cgpa")}
                        onChange={(e) => setEdit(entry.rollNumber, "cgpa", e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editValue(entry, "backlogs")}
                        onChange={(e) => setEdit(entry.rollNumber, "backlogs", e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${
                          entry.claimedBy ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {entry.claimedBy ? "Activated" : "Not activated"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        disabled={!edits[entry.rollNumber] || rowBusy[entry.rollNumber]}
                        onClick={() => handleSave(entry)}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
                      >
                        {rowBusy[entry.rollNumber] ? "Saving…" : "Save"}
                      </button>
                      {rowError[entry.rollNumber] && (
                        <p className="mt-1 text-[11px] text-red-600">{rowError[entry.rollNumber]}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4 text-xs">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchRoster(pagination.page - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchRoster(pagination.page + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RosterManagement;
