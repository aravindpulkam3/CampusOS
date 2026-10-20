import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { getClubDetails, updateClub } from "../../api/club.api";
import { PageMessage, Switch, btn, btnGhost, crumbLink } from "../../components/common/ui";
import { Busy, FormBar, FormSection, FormSheet, fixMessage, focusFirstError } from "../../components/forms/formBits";
import ClubFields, { CLUB_ORDER, clubFieldId } from "./ClubFields";

const formFrom = (club) => ({
  clubName: club?.clubName || "",
  description: club?.description || "",
  category: club?.category || "",
  logo: club?.logo || "",
  banner: club?.banner || "",
  isActive: club?.isActive ?? false,
});

// ─── Main Component ───────────────────────────────────────────
// The club page hands the club and the viewer's admin status over in the
// navigation state. When that is missing (the page was reloaded or opened
// from a link), both are fetched instead.
const EditClub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clubId } = useParams();

  const handed = location.state?.club ? location.state : null;
  const [club, setClub] = useState(handed?.club || null);
  const [isAdmin, setIsAdmin] = useState(!!handed?.isAdmin);
  const [checking, setChecking] = useState(!handed);

  const [form, setForm] = useState(formFrom(handed?.club));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (handed) return;
    let alive = true;
    getClubDetails(clubId)
      .then((res) => {
        if (!alive) return;
        const { club: fetched, isAdmin: admin } = res.data.data;
        setClub(fetched);
        setIsAdmin(!!admin);
        setForm(formFrom(fetched));
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  if (checking) {
    return (
      <div className="max-w-[760px] animate-pulse pb-10" aria-busy="true">
        <div className="mt-1 h-4 w-32 rounded bg-soft lg:mt-4" />
        <div className="mt-2 h-9 w-56 rounded-lg bg-soft" />
        <div className="mt-12 h-40 rounded-[11px] bg-soft" />
      </div>
    );
  }

  if (!club || !isAdmin) {
    return (
      <PageMessage
        title="You can't edit this club"
        action={
          <Link to={club ? `/community/clubs/${clubId}` : "/community/clubs"} className={btnGhost}>
            {club ? "Back to the club" : "Back to clubs"}
          </Link>
        }
      >
        Only the club's admins can change its details. If you think that's wrong, ask a superadmin.
      </PageMessage>
    );
  }

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
      await updateClub(clubId, {
        clubName: form.clubName.trim(),
        description: form.description.trim(),
        category: form.category,
        logo: form.logo ? form.logo : null,
        banner: form.banner ? form.banner : null,
        isActive: form.isActive,
        // The admin list is sent back unchanged; this page doesn't edit it.
        adminIds: (club.clubAdmins || []).map((a) => a._id),
      });

      navigate(`/community/clubs/${clubId}`, {
        state: { toast: "Club updated." },
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Failed to update club. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormSheet
      title="Edit club"
      sub="Changes show to followers and members straight away."
      crumb={
        <>
          <Link to="/community/clubs" className={crumbLink}>Clubs</Link> /{" "}
          <Link to={`/community/clubs/${clubId}`} className={crumbLink}>{club.clubName}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <ClubFields form={form} errors={errors} setValue={setValue} />

        <FormSection title="Status">
          <div className="sm:col-span-2">
            <Switch checked={form.isActive} onChange={(next) => setValue("isActive", next)}>
              {form.isActive ? "Active" : "Inactive"}
            </Switch>
            <p className="mt-2 text-[13.5px] text-ink-2">
              {form.isActive
                ? "The club is visible and active on the platform."
                : "The club is hidden. Only a superadmin can make it active again."}
            </p>
          </div>
        </FormSection>

        <FormBar message={submitError || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btn}>
            {submitting ? <Busy>Saving…</Busy> : "Save changes"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  );
};

export default EditClub;
