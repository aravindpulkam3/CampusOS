import { useState, useEffect } from "react";
import { BookOpen, ExternalLink, FileText, Map as MapIcon, Plus, Video } from "lucide-react";
import safeHref from "../../../utils/safeHref";
import {
  Chips,
  Modal,
  PageTitle,
  SearchField,
  btnGhost,
  btnGhostSm,
  btnSm,
  fieldInput,
  fieldLabel,
  focusRing,
  note,
} from "../../../components/common/ui";

// ─── API calls ────────────────────────────────────────────────
// GET /api/competitive?category= → list resources by category
// POST /api/competitive → submit a resource

// ─── Config ───────────────────────────────────────────────────
const CATEGORIES = [
  { value: "dsa", label: "DSA", description: "Data structures, algorithms and competitive programming" },
  { value: "gate", label: "GATE", description: "GATE preparation, past papers and roadmaps" },
  { value: "aptitude", label: "Aptitude", description: "Quant, logical reasoning and verbal" },
  { value: "placements", label: "Placements", description: "Resumes, online assessments and interview experiences" },
  { value: "higherStudies", label: "Higher studies", description: "MS, GRE, TOEFL and research programs" },
];

const RESOURCE_TYPE = {
  roadmap: { label: "Roadmap", icon: MapIcon },
  pyq: { label: "Past papers", icon: FileText },
  playlist: { label: "Playlist", icon: Video },
  sheet: { label: "Sheet", icon: FileText },
  book: { label: "Book", icon: BookOpen },
  course: { label: "Course", icon: Video },
  other: { label: "Other", icon: ExternalLink },
};

// ─── Resource row ─────────────────────────────────────────────
// Opens the resource in a new tab. A stored URL that is not http(s) gives a
// row with no link at all.
const ResourceRow = ({ resource }) => {
  const type = RESOURCE_TYPE[resource.type] || RESOURCE_TYPE.other;
  const Icon = type.icon;
  const href = safeHref(resource.url);
  const layout = "group flex min-h-16 items-center gap-4 py-3";

  const body = (
    <>
      <span
        aria-hidden="true"
        className="grid size-10 flex-none place-items-center rounded-[11px] bg-soft text-ink-2"
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] font-semibold leading-[1.35] tracking-[-0.018em] text-ink ${
            href ? "decoration-ink/25 underline-offset-[3px] group-hover:underline" : ""
          }`}
        >
          {resource.title}
        </span>
        {resource.description && (
          <span className="mt-px block text-[13.5px] text-ink-2 max-sm:line-clamp-2 sm:truncate">
            {resource.description}
          </span>
        )}
      </span>
      <span className="flex flex-none items-center gap-1.5 whitespace-nowrap text-[13.5px] text-ink-2">
        {[type.label, resource.platform].filter(Boolean).join(", ")}
        {href && <ExternalLink size={13} className="text-ink-3" aria-hidden="true" />}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`rounded-lg ${layout} ${focusRing}`}>
          {body}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <div className={layout}>{body}</div>
      )}
    </li>
  );
};

// ─── Submit Resource Modal ────────────────────────────────────
const SubmitModal = ({ activeCategory, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    category: activeCategory || "dsa",
    type: "roadmap",
    platform: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    setSubmitting(true);
    try {
      // TODO: await submitCompetitiveResource(form)
      onSubmit?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Submit a resource" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="resource-title" className={fieldLabel}>
            Title
          </label>
          <input
            id="resource-title"
            type="text"
            required
            placeholder="e.g. Striver's A2Z DSA Sheet"
            value={form.title}
            onChange={set("title")}
            className={fieldInput}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="resource-category" className={fieldLabel}>
              Category
            </label>
            <select id="resource-category" value={form.category} onChange={set("category")} className={fieldInput}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="resource-type" className={fieldLabel}>
              Type
            </label>
            <select id="resource-type" value={form.type} onChange={set("type")} className={fieldInput}>
              {Object.entries(RESOURCE_TYPE).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="resource-url" className={fieldLabel}>
            URL
          </label>
          <input
            id="resource-url"
            type="url"
            required
            placeholder="https://"
            value={form.url}
            onChange={set("url")}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="resource-platform" className={fieldLabel}>
            Platform <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="resource-platform"
            type="text"
            placeholder="e.g. YouTube, GitHub"
            value={form.platform}
            onChange={set("platform")}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="resource-description" className={fieldLabel}>
            Description <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id="resource-description"
            rows={3}
            placeholder="Brief description of this resource..."
            value={form.description}
            onChange={set("description")}
            className={`${fieldInput} resize-none py-2.5`}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhostSm}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btnSm}>
            {submitting ? "Submitting..." : "Submit resource"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const Skeleton = () => (
  <div className="mt-3 animate-pulse" aria-busy="true">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex h-16 items-center gap-4 border-t border-line first:border-t-0">
        <div className="size-10 flex-none rounded-[11px] bg-soft" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 rounded bg-soft" />
          <div className="h-3 w-1/2 rounded bg-soft" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────
const CompetitivePrep = () => {
  const [activeCategory, setActiveCategory] = useState("dsa");
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        // TODO: const res = await axios.get(`/api/competitive?category=${activeCategory}`)
        // setResources(res.data.data)
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [activeCategory]);

  const term = search.trim().toLowerCase();
  const filtered = resources.filter(
    (r) => !term || r.title.toLowerCase().includes(term) || r.description?.toLowerCase().includes(term),
  );

  const activeCat = CATEGORIES.find((c) => c.value === activeCategory);

  return (
    <div className="pb-10 lg:pb-20">
      {showModal && (
        <SubmitModal
          activeCategory={activeCategory}
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            /* TODO: refetch */
          }}
        />
      )}

      <PageTitle
        crumb="Academics"
        title="Competitive prep"
        sub="Curated resources for placements, GATE and beyond."
      >
        <button type="button" onClick={() => setShowModal(true)} className={btnGhost}>
          <Plus size={15} aria-hidden="true" /> Submit resource
        </button>
      </PageTitle>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <Chips label="Category" options={CATEGORIES} value={activeCategory} onChange={setActiveCategory} />
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search competitive prep resources"
          placeholder="Search resources"
        />
      </div>

      {/* What the chosen category covers */}
      {activeCat && <p className="mt-7 text-[14.5px] text-ink-2">{activeCat.description}.</p>}

      {loading ? (
        <Skeleton />
      ) : filtered.length > 0 ? (
        <ul className="mt-3 divide-y divide-line">
          {filtered.map((r) => (
            <ResourceRow key={r._id} resource={r} />
          ))}
        </ul>
      ) : (
        <p className={`mt-3 ${note}`}>
          {term
            ? `No ${activeCat?.label} resources match "${search.trim()}".`
            : `No ${activeCat?.label} resources yet.`}
        </p>
      )}
    </div>
  );
};

export default CompetitivePrep;
