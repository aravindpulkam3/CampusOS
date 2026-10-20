import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClub } from "../../api/club.api";
import { btn, btnGhost, crumbLink } from "../../components/common/ui";
import { Busy, FormBar, FormSheet, fixMessage, focusFirstError } from "../../components/forms/formBits";
import ClubFields, { CLUB_ORDER, clubFieldId } from "./ClubFields";

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

  const setValue = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitError("");
  };

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
      focusFirstError(errs, CLUB_ORDER, clubFieldId);
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

      navigate("/community/clubs", { state: { toast: "Club created." } });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Failed to create club. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormSheet
      title="New club"
      sub="New clubs are visible to every student straight away."
      crumb={
        <>
          <Link to="/community" className={crumbLink}>Community</Link> /{" "}
          <Link to="/community/clubs" className={crumbLink}>Clubs</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <ClubFields form={form} errors={errors} setValue={setValue} />
        <FormBar message={submitError || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btn}>
            {submitting ? <Busy>Creating…</Busy> : "Create club"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  );
};

export default CreateClub;
