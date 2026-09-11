import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import ImageUploadZone from "../../components/forms/ImageUploadZone";
import { createClub } from "../../api/club.api";
import { CLUB_CATEGORIES } from "../../constants/categories";

// ─── Constants ────────────────────────────────────────────────
const categoryColor = {
  Technical: "border-blue-200 bg-blue-50 text-blue-700",
  Cultural: "border-purple-200 bg-purple-50 text-purple-700",
  Creative: "border-orange-200 bg-orange-50 text-orange-700",
  Business: "border-green-200 bg-green-50 text-green-700",
  Sports: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

// ─── Field Components ─────────────────────────────────────────
const Label = ({ children, required, optional }) => (
  <label className="block text-xs font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
    {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
  </label>
);

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-red-400 mt-1.5">{message}</p> : null;

const Section = ({ title, subtitle, children }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
    <div className="pb-2 border-b border-gray-50">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────
const CreateClub = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clubName: "",
    description: "",
    category: "",
    logo: "",
    banner: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.clubName.trim()) e.clubName = "Club name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.category) e.category = "Category is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await createClub({
        clubName: form.clubName.trim(),
        description: form.description.trim(),
        category: form.category,
        logo: form.logo ? form.logo : null,
        banner: form.banner ? form.banner : null,
      });

      navigate("/community/clubs");
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Failed to create club. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Create Club</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          New clubs are visible to all students immediately.
        </p>
      </div>

      {submitError && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* ── Basic Info ── */}
        <Section title="Basic Information">
          <div>
            <Label required>Club Name</Label>
            <input
              type="text"
              placeholder="e.g. WebDev Club, IEEE Chapter"
              value={form.clubName}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, clubName: e.target.value }));
                setErrors((prev) => ({ ...prev, clubName: "" }));
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors"
            />
            <FieldError message={errors.clubName} />
          </div>

          <div>
            <Label required>Description</Label>
            <textarea
              rows={5}
              placeholder="What does your club do? What are your goals and activities?"
              value={form.description}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, description: e.target.value }));
                setErrors((prev) => ({ ...prev, description: "" }));
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors resize-none"
            />
            <FieldError message={errors.description} />
          </div>

          <div>
            <Label required>Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {CLUB_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, category: cat }));
                    setErrors((prev) => ({ ...prev, category: "" }));
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all duration-150
                    ${form.category === cat
                        ? categoryColor[cat]
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <FieldError message={errors.category} />
          </div>
        </Section>

        {/* ── Branding ── */}
        <Section title="Branding" subtitle="Upload club media assets cleanly into your system">
          <div>
            <ImageUploadZone
              label="Club Icon / Logo"
              value={form.logo}
              folder="club-logos"
              onChange={(uploadedUrl) => {
                setForm((prev) => ({ ...prev, logo: uploadedUrl }));
                setSubmitError("");
              }}
            />
          </div>

          <div>
            <ImageUploadZone
              label="Club Header Banner"
              value={form.banner}
              folder="clubs-banners"
              onChange={(uploadedUrl) => {
                setForm((prev) => ({ ...prev, banner: uploadedUrl }));
                setSubmitError("");
              }}
            />
          </div>
        </Section>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Create Club"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClub;
