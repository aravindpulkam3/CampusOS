import { useState, useRef } from "react";
import { X } from "lucide-react";
import { createDiscussion } from "../../api/discussion.api";
import {
  Alert,
  Modal,
  btnGhost,
  btnGhostSm,
  btnSm,
  fieldInput,
  fieldLabel,
  focusRing,
} from "../../components/common/ui";
import { CATEGORY } from "./discussionUi";

const MAX_TAGS = 5;

// The "Start a discussion" dialog, opened from the list and from a thread.
// `onCreated` gets the new discussion as the server returned it. When the
// button that opened the dialog is gone by the time it closes (the empty-state
// button after the first post), focus goes to `returnFocusRef` instead.
const NewDiscussion = ({ onClose, onCreated, returnFocusRef }) => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || form.tags.includes(tag) || form.tags.length >= MAX_TAGS) return;
    setForm((p) => ({ ...p, tags: [...p.tags, tag] }));
    setTagInput("");
  };

  const removeTag = (tag) => setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createDiscussion(form);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Start a discussion"
      onClose={onClose}
      wide
      initialFocusRef={titleRef}
      returnFocusRef={returnFocusRef}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nd-title" className={fieldLabel}>
            Title
          </label>
          <input
            ref={titleRef}
            id="nd-title"
            type="text"
            maxLength={200}
            placeholder="What do you want to discuss?"
            value={form.title}
            onChange={set("title")}
            className={fieldInput}
          />
        </div>

        <div>
          <label htmlFor="nd-category" className={fieldLabel}>
            Topic
          </label>
          <select id="nd-category" value={form.category} onChange={set("category")} className={fieldInput}>
            {Object.entries(CATEGORY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nd-content" className={fieldLabel}>
            Content
          </label>
          <textarea
            id="nd-content"
            rows={5}
            placeholder="Share your question, experience or thoughts in detail..."
            value={form.content}
            onChange={set("content")}
            className={`${fieldInput} resize-none py-2.5 leading-[1.55]`}
          />
        </div>

        <div>
          <label htmlFor="nd-tags" className={fieldLabel}>
            Tags <span className="font-normal text-ink-3">(up to {MAX_TAGS})</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="nd-tags"
              type="text"
              placeholder="e.g. dsa, gate, resume"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className={`${fieldInput} min-w-0 flex-1`}
            />
            <button type="button" onClick={addTag} className={btnGhost}>
              Add
            </button>
          </div>
          {form.tags.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {form.tags.map((tag) => (
                <li
                  key={tag}
                  className="flex h-7 items-center gap-0.5 rounded-full bg-soft pl-2.5 pr-1 text-[13px] font-medium text-ink-2"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className={`grid size-5 place-items-center rounded-full text-ink-3 transition-colors hover:text-urgent ${focusRing}`}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Beside the buttons: on a phone the dialog scrolls and its top is out of view. */}
        {error && <Alert>{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhostSm}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btnSm}>
            {submitting ? "Posting..." : "Post discussion"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewDiscussion;
