import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { createAnnouncement } from "../../api/announcement.api";
import { getClubDetails } from "../../api/club.api";
import { getEventById } from "../../api/event.api";

const MAX_TITLE = 100;
const MAX_BODY = 2000;

// ─── Field Components ─────────────────────────────────────────
const Label = ({ children, required, counter }) => (
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-xs font-medium text-gray-700">
      {children} {required && <span className="text-red-400">*</span>}
    </label>
    {counter !== undefined && (
      <span
        className={`text-xs tabular-nums ${counter < 20 ? "text-amber-500" : "text-gray-300"}`}
      >
        {counter} left
      </span>
    )}
  </div>
);

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-red-400 mt-1.5">{message}</p> : null;

// ─── Main ─────────────────────────────────────────────────────
export default function CreateAnnouncement() {
  const { targetType, targetId } = useParams();
  const navigate = useNavigate();

  const isClub = targetType === "club";

  const [form, setForm] = useState({ title: "", body: "", image: "" });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const imageInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (targetType === "club") {
        const payload = await getClubDetails(targetId);
        if (!payload.data.data.isAdmin) {
          navigate(-1);
        }
      }
      if (targetType === "event") {
        const payload = await getEventById(targetId);
        if (!payload.data.data.isOrganizer) {
          navigate(-1);
        }
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Only image files are allowed.",
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be under 5 MB." }));
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setForm((prev) => ({ ...prev, image: localUrl }));
  };

  const removeImage = () => {
    setImagePreview(null);
    setForm((prev) => ({ ...prev, image: "" }));
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.body.trim()) e.body = "Body is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      setLoading(true);

      await createAnnouncement(targetType, targetId, {
        title: form.title.trim(),
        body: form.body.trim(),
        image: form.image,
      });

      navigate(`/community/${isClub ? "clubs" : "events"}/${targetId}`, {
        state: {
          toast: isClub
            ? "Announcement posted successfully"
            : "Event update posted successfully",
        },
      });
    } catch (err) {
      // if (err.response?.status === 403) {
      //   navigate(-1); // or navigate("/403")
      //   toast.error(err.response.data.message);
      // }
      setSubmitError(
        err.response?.data?.message || "Failed to post announcement",
      );
    } finally {
      setLoading(false);
    }
  };

  const titleLeft = MAX_TITLE - form.title.length;
  const bodyLeft = MAX_BODY - form.body.length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {isClub ? "Post Announcement" : "Post Event Update"}
          </h2>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full
            ${isClub ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}
          >
            {isClub ? "Club" : "Event"}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {isClub
            ? "Visible to all followers and members of this club."
            : "Delivered to all students registered for this event."}
        </p>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-6">
          <p className="text-xs text-red-700">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-5">
          {/* Title */}
          <div>
            <Label required counter={titleLeft}>
              Title
            </Label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={MAX_TITLE}
              placeholder={
                isClub
                  ? "e.g. Core Team Applications Open"
                  : "e.g. Venue changed to Seminar Hall B"
              }
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors"
            />
            <FieldError message={errors.title} />
          </div>

          {/* Body */}
          <div>
            <Label required counter={bodyLeft}>
              Body
            </Label>
            <textarea
              name="body"
              value={form.body}
              onChange={handleChange}
              maxLength={MAX_BODY}
              rows={7}
              placeholder={
                isClub
                  ? "Share news, updates, or information for your followers..."
                  : "Share important updates with registered students..."
              }
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors resize-none"
            />
            <FieldError message={errors.body} />
          </div>

          {/* Image Upload */}
          <div>
            <Label>
              Image{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-100">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-52 object-cover"
                />
                {/* Remove button */}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <X size={13} className="text-gray-600" />
                </button>
                {/* Cloudinary notice */}
                <div className="absolute bottom-2.5 left-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-1 rounded-lg">
                  Local preview — Cloudinary upload coming soon
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group">
                <ImagePlus
                  size={20}
                  className="text-gray-300 group-hover:text-gray-400 mb-1.5 transition-colors"
                />
                <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
                  Click to upload image
                </span>
                <span className="text-xs text-gray-300 mt-0.5">
                  PNG, JPG up to 5 MB
                </span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
            <FieldError message={errors.image} />
          </div>
        </div>

        {/* Live Preview */}
        {(form.title || form.body) && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Preview
            </p>
            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                className="w-full max-h-40 object-cover rounded-lg border border-gray-100 mb-3"
              />
            )}
            {form.title && (
              <p className="text-sm font-semibold text-gray-900 mb-1.5">
                {form.title}
              </p>
            )}
            {form.body && (
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
                {form.body}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
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
            disabled={loading}
            className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Posting..."
              : isClub
                ? "Post Announcement"
                : "Post Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
