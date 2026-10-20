import { useState, useRef } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import api from "../../api/axios.js";
import useImageOk from "../../hooks/useImageOk";
import { fieldLabel, focusRing } from "../common/ui";

// Pick an image, upload it (POST /v1/upload?folder=…) and hand the stored URL
// to `onChange`; an empty string clears it. The server accepts images only and
// only into its allow-listed folders.
const ImageUploadZone = ({ value, onChange, folder = "general", label = "Upload Image" }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  // A stored URL can be dead; say a file is saved rather than show a broken picture.
  const [previewOk, onPreviewError] = useImageOk(value);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional validation (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("That file is larger than 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file); // the browser builds a multipart/form-data body from this

    setUploading(true);
    setError("");

    try {
      // The destination folder travels as a query parameter
      const response = await api.post(`/v1/upload?folder=${folder}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data?.url) {
        onChange(response.data.url); // hands the stored URL back to the form
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "The upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = (e) => {
    e.preventDefault();
    onChange(""); // resets the stored URL
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <span className={fieldLabel}>{label}</span>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        aria-label={label}
        className="hidden"
      />

      {!value ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={`flex h-32 w-full flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-line-2 bg-soft/60 px-3 text-center transition-colors hover:border-ink-3 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin text-ink-3" aria-hidden="true" />
              <span className="text-[13px] text-ink-2">Uploading…</span>
            </>
          ) : (
            <>
              <UploadCloud size={19} className="text-ink-3" aria-hidden="true" />
              <span className="text-[13.5px] font-[550] text-ink">Choose an image</span>
              <span className="text-xs text-ink-3">PNG or JPG, up to 5 MB</span>
            </>
          )}
        </button>
      ) : (
        <div className="relative h-32 w-full overflow-hidden rounded-[14px] border border-line-2 bg-soft">
          {previewOk ? (
            <img src={value} alt="" onError={onPreviewError} className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center px-3 text-center text-[13px] text-ink-2">
              A file is saved here, but its preview could not be loaded.
            </span>
          )}
          <button
            type="button"
            onClick={clearSelection}
            aria-label={`Remove: ${label}`}
            className={`absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-ink/80 text-white transition-colors hover:bg-ink ${focusRing}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-[13px] text-urgent">
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUploadZone;
