import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { createAnnouncement } from "../../api/announcement.api";
import { getClubDetails } from "../../api/club.api";
import { getEventById } from "../../api/event.api";
import ImageUploadZone from "../../components/forms/ImageUploadZone";
import useAuth from "../../hooks/useAuth";
import { btn, btnGhost, crumbLink } from "../../components/common/ui";
import {
  Busy,
  Counter,
  Field,
  FormBar,
  FormSection,
  FormSheet,
  describedBy,
  fixMessage,
  focusFirstError,
  inputClass,
} from "../../components/forms/formBits";

const MAX_TITLE = 100;
const MAX_BODY = 2000;

// ─── Main ─────────────────────────────────────────────────────
export default function CreateAnnouncement() {
  const { targetType, targetId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isClub = targetType === "club";

  const [form, setForm] = useState({ title: "", body: "", image: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  // Only the club's admins (or the event's organizers, or a superadmin) may
  // post; anyone else is sent back where they came from.
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (targetType === "club") {
          const payload = await getClubDetails(targetId);
          if (!payload.data.data.isAdmin) {
            navigate(-1);
          }
        }
        if (targetType === "event") {
          const payload = await getEventById(targetId);
          if (!payload.data.data.isOrganizer && user.role !== "superadmin") {
            navigate(-1);
          }
        }
      } catch (err) {
        console.error("Authorization fetch failed:", err);
        navigate(-1);
      }
    };
    fetchData();
  }, [targetType, targetId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
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
      focusFirstError(errs, ["title", "body"], (key) => `announcement-${key}`);
      return;
    }

    setLoading(true);
    setSubmitError("");
    try {
      await createAnnouncement(targetType, targetId, {
        title: form.title.trim(),
        body: form.body.trim(),
        image: form.image || null, // the stored picture URL, or null without one
      });

      navigate(`/community/${isClub ? "clubs" : "events"}/${targetId}`, {
        state: { toast: isClub ? "Announcement posted." : "Update posted." },
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Failed to post announcement",
      );
    } finally {
      setLoading(false);
    }
  };

  const backTo = `/community/${isClub ? "clubs" : "events"}/${targetId}`;

  return (
    <FormSheet
      title={isClub ? "New announcement" : "New event update"}
      sub={
        isClub
          ? "Everyone who follows the club sees it in their feed."
          : "Everyone registered for the event sees it."
      }
      crumb={
        <>
          <Link to={isClub ? "/community/clubs" : "/community/events"} className={crumbLink}>
            {isClub ? "Clubs" : "Events"}
          </Link>{" "}
          /{" "}
          <Link to={backTo} className={crumbLink}>
            {isClub ? "Club" : "Event"}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormSection first>
          <Field
            id="announcement-title"
            label="Title"
            error={errors.title}
            full
            aside={<Counter value={form.title} max={MAX_TITLE} />}
          >
            <input
              id="announcement-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={MAX_TITLE}
              placeholder={isClub ? "e.g. Core team applications are open" : "e.g. Venue changed to Seminar Hall B"}
              className={inputClass(errors.title)}
              {...describedBy("announcement-title", errors.title)}
            />
          </Field>
          <Field
            id="announcement-body"
            label="Message"
            error={errors.body}
            full
            aside={<Counter value={form.body} max={MAX_BODY} warnAt={100} />}
          >
            <textarea
              id="announcement-body"
              name="body"
              value={form.body}
              onChange={handleChange}
              maxLength={MAX_BODY}
              rows={7}
              placeholder={
                isClub
                  ? "News, updates or anything your followers should know"
                  : "What registered students need to know"
              }
              className={`${inputClass(errors.body)} resize-none py-2.5 leading-[1.55]`}
              {...describedBy("announcement-body", errors.body)}
            />
          </Field>
          <div className="sm:col-span-2">
            <ImageUploadZone
              label="Picture (optional)"
              value={form.image}
              folder={isClub ? "club-announcements" : "event-announcements"}
              onChange={(uploadedUrl) => setForm((prev) => ({ ...prev, image: uploadedUrl }))}
            />
          </div>
        </FormSection>

        <FormBar message={submitError || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={btn}>
            {loading ? <Busy>Posting…</Busy> : isClub ? "Post announcement" : "Post update"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  );
}
