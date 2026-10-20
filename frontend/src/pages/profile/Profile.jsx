import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useImageOk from "../../hooks/useImageOk";
import useIsClassRep from "../../hooks/useIsClassRep";
import { changePasswordApi, getProfile, logoutApi, updateProfile } from "../../api/auth.api";
import ImageUploadZone from "../../components/forms/ImageUploadZone.jsx";
import {
  Alert,
  DateTile,
  Facts,
  LoadError,
  LogoTile,
  Modal,
  PageTitle,
  Pill,
  Row,
  Rows,
  SectionHead,
  Tag,
  btn,
  btnGhost,
  btnGhostSm,
  btnSm,
  fieldInput,
  fieldInputError,
  fieldLabel,
  focusRing,
  note,
  textLink,
} from "../../components/common/ui";
import safeHref from "../../utils/safeHref";
import { daysFromToday, describeWhen } from "../../utils/formatDate";
import { APPLICATION_STATUS } from "../career/format";

// ─── Helpers ──────────────────────────────────────────────────
// "classrep" is deliberately not a role here — see useIsClassRep, which
// resolves it from Classroom.classRepresentative instead.
const staffLabel = {
  placementCoordinator: "Placement coordinator",
  superadmin: "Super admin",
};

const BIO_MAX = 300; // the User schema's limit
const LIST_SHOWN = 5;

// What the student can edit here. Everything else on the page is the roster's.
const EDITABLE = ["profilePicture", "bio", "github", "linkedin", "portfolio", "resumeUrl"];
const LINKS = ["github", "linkedin", "portfolio"];

// "https://www.github.com/aravind/" → "github.com/aravind"
const prettyUrl = (url) => {
  try {
    const { host, pathname } = new URL(url);
    return host.replace("www.", "") + (pathname === "/" ? "" : pathname.replace(/\/$/, ""));
  } catch {
    return url;
  }
};

const missing = <span className="font-medium text-ink-3">Not on record</span>;
const inlineLink = `rounded font-[550] text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink ${focusRing}`;

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="animate-pulse pb-10" aria-busy="true" aria-label="Loading profile">
    <div className="flex items-center gap-5 pt-1 lg:pt-4">
      <div className="size-[60px] flex-none rounded-full bg-soft lg:size-[84px]" />
      <div className="space-y-2.5">
        <div className="h-8 w-56 rounded-lg bg-soft" />
        <div className="h-4 w-40 rounded bg-soft" />
      </div>
    </div>
    <div className="mt-9 h-28 rounded-panel bg-soft" />
    <div className="mt-14 space-y-3">
      <div className="h-4 w-24 rounded bg-soft" />
      <div className="h-3.5 w-2/3 rounded bg-soft" />
      <div className="h-3.5 w-1/2 rounded bg-soft" />
    </div>
  </div>
);

// ─── Avatar ───────────────────────────────────────────────────
// The stored picture when it loads, otherwise the initials.
const Avatar = ({ user }) => {
  const [showPicture, onPictureError] = useImageOk(user?.profilePicture);
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="grid size-[60px] flex-none place-items-center overflow-hidden rounded-full bg-ink text-[21px] font-[650] tracking-[-0.03em] text-white lg:size-[84px] lg:text-[28px]"
    >
      {showPicture ? (
        <img src={user.profilePicture} alt="" onError={onPictureError} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
};

// ─── Edit Profile Modal ───────────────────────────────────────
const EditProfileModal = ({ user, onClose, onSave }) => {
  const initial = Object.fromEntries(EDITABLE.map((key) => [key, user?.[key] || ""]));
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkErrors, setLinkErrors] = useState({});

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setLinkErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Only what changed is sent, so a field this form never touched can't be
    // overwritten with a stale value. Names, CGPA and backlogs are never sent:
    // they come from the college roster and the server rejects them here.
    const changed = Object.fromEntries(
      EDITABLE.map((key) => [key, form[key].trim()]).filter(([key, value]) => value !== initial[key]),
    );
    if (Object.keys(changed).length === 0) return onClose();

    // The server takes only http(s) links; say so under the field rather than
    // after a round trip.
    const badLinks = Object.fromEntries(
      LINKS.filter((key) => changed[key] && !safeHref(changed[key])).map((key) => [
        key,
        "Use a full web address starting with https://",
      ]),
    );
    if (Object.keys(badLinks).length) {
      setLinkErrors(badLinks);
      document.getElementById(`profile-${Object.keys(badLinks)[0]}`)?.focus();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await updateProfile(changed);
      onSave(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const linkField = (key, label, placeholder) => (
    <div>
      <label htmlFor={`profile-${key}`} className={fieldLabel}>
        {label}
      </label>
      <input
        id={`profile-${key}`}
        type="url"
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        aria-invalid={linkErrors[key] ? true : undefined}
        aria-describedby={linkErrors[key] ? `profile-${key}-error` : undefined}
        className={linkErrors[key] ? fieldInputError : fieldInput}
      />
      {linkErrors[key] && (
        <p id={`profile-${key}-error`} className="mt-1.5 text-[13px] text-urgent">
          {linkErrors[key]}
        </p>
      )}
    </div>
  );

  return (
    <Modal title="Edit profile" onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="w-32 max-w-full">
          <ImageUploadZone
            label="Profile picture"
            value={form.profilePicture}
            folder="user-profiles"
            onChange={(uploadedUrl) => setForm((p) => ({ ...p, profilePicture: uploadedUrl }))}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="profile-bio" className={fieldLabel}>
              About you
            </label>
            <span className="text-xs tabular-nums text-ink-3">
              {form.bio.length}/{BIO_MAX}
            </span>
          </div>
          <textarea
            id="profile-bio"
            value={form.bio}
            onChange={set("bio")}
            maxLength={BIO_MAX}
            rows={3}
            placeholder="A line or two about yourself"
            className={`${fieldInput} resize-none py-2.5 leading-[1.55]`}
          />
        </div>

        {linkField("github", "GitHub", "https://github.com/username")}
        {linkField("linkedin", "LinkedIn", "https://linkedin.com/in/username")}
        {linkField("portfolio", "Portfolio", "https://your-site.com")}

        <div>
          <ImageUploadZone
            label="Resume"
            value={form.resumeUrl}
            folder="student-resumes"
            onChange={(uploadedUrl) => setForm((p) => ({ ...p, resumeUrl: uploadedUrl }))}
          />
          <p className="mt-1.5 text-[13px] text-ink-3">
            Uploads are images only for now, so save your resume as a PNG or JPG.
          </p>
        </div>

        {/* Beside the buttons, where the eye is after pressing Save: the
            dialog scrolls, and a message at its top would be out of view. */}
        {error && <Alert>{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhostSm}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={btnSm}>
            {loading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Change Password Modal ────────────────────────────────────
// Declared at module level: defined inside the dialog it would be a new
// component on every keystroke and the input would lose focus each time.
const PasswordField = ({ id, label, value, onChange, shown, onToggle, placeholder, autoComplete }) => (
  <div>
    <label htmlFor={id} className={fieldLabel}>
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${fieldInput} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={shown ? `Hide: ${label}` : `Show: ${label}`}
        aria-pressed={shown}
        className={`absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition-colors hover:text-ink ${focusRing}`}
      >
        {shown ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
      </button>
    </div>
  </div>
);

const ChangePasswordModal = ({ onClose }) => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow] = useState({
    current: false,
    newPw: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const toggle = (field) => setShow((p) => ({ ...p, [field]: !p[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.current || !form.newPw || !form.confirm) {
      setError("All fields are required");
      return;
    }
    if (form.newPw.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (form.newPw !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await changePasswordApi({
        currentPassword: form.current,
        newPassword: form.newPw,
      });
      setSuccess(true);
      // The server ended every session, this one included: sign in again.
      setTimeout(() => {
        setUser(null);
        navigate("/login", {
          replace: true,
          state: { notice: "Password changed. Sign in with your new password." },
        });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, placeholder, autoComplete) => (
    <PasswordField
      id={`password-${key}`}
      label={label}
      value={form[key]}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      shown={show[key]}
      onToggle={() => toggle(key)}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
  );

  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {success && <Alert kind="success">Password changed. Signing you out…</Alert>}
        {field("current", "Current password", "", "current-password")}
        {field("newPw", "New password", "At least 8 characters", "new-password")}
        {field("confirm", "Confirm new password", "Repeat new password", "new-password")}
        <p className="text-[13px] text-ink-3">Changing it signs you out on every device.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhostSm}>
            Cancel
          </button>
          <button type="submit" disabled={loading || success} className={btnSm}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── One link the student can add ─────────────────────────────
// A stored URL that is not http(s) is shown as missing rather than linked.
const LinkRow = ({ label, url, text, onAdd }) => {
  const href = safeHref(url);
  return (
    <li className="grid min-h-14 grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
      <span className="text-[14.5px] text-ink-2">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`justify-self-start truncate rounded text-[14.5px] text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink-3 ${focusRing} max-w-full`}
        >
          {text || prettyUrl(href)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="text-[14.5px] text-ink-3">Not added yet</span>
      )}
      {!href && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add: ${label}`}
          className={`rounded text-[14.5px] font-[550] text-ink underline-offset-[3px] hover:underline ${focusRing}`}
        >
          Add
        </button>
      )}
    </li>
  );
};

// ─── Main ─────────────────────────────────────────────────────
const Profile = () => {
  const { user: authUser, setUser, logout } = useAuth();
  const { isClassRep } = useIsClassRep();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllClubs, setShowAllClubs] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfile();
      setProfile(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (_) {}
    logout();
    navigate("/login");
  };

  if (loading) return <Skeleton />;
  if (!profile)
    return (
      <div className="pb-10">
        <PageTitle title="Profile" />
        <div className="mt-9">
          <LoadError onRetry={fetchProfile}>Could not load your profile.</LoadError>
        </div>
      </div>
    );

  const {
    classroom,
    followedClubs = [],
    registeredEvents = [],
    recentApplications = [],
  } = profile;

  // GET /auth/profile leaves out the bio, the links and the resume, so those
  // come from the signed-in user (GET /auth/me), which carries them. After a
  // save both copies hold the server's reply.
  const own = Object.fromEntries(EDITABLE.map((key) => [key, authUser?.[key]]));
  const user = { ...own, ...profile.user };

  const fullName = `${user.firstName} ${user.lastName}`;
  const visibleClubs = showAllClubs ? followedClubs : followedClubs.slice(0, LIST_SHOWN);
  // The page lists what is still ahead, soonest first; the rest are counted.
  const upcoming = registeredEvents
    .filter((event) => event && daysFromToday(event.startDateTime) >= 0)
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  const pastCount = registeredEvents.length - upcoming.length;
  const visibleEvents = showAllEvents ? upcoming : upcoming.slice(0, LIST_SHOWN);
  const applications = recentApplications.filter((app) => app.drive);

  const handleSaved = (updated) => {
    setProfile((p) => ({ ...p, user: { ...p.user, ...updated } }));
    // The top bar's avatar and this page's links read the signed-in user.
    setUser((current) => (current ? { ...current, ...updated } : current));
  };

  return (
    <div className="pb-10 lg:pb-20">
      {editModal && (
        <EditProfileModal user={user} onClose={() => setEditModal(false)} onSave={handleSaved} />
      )}
      {pwModal && <ChangePasswordModal onClose={() => setPwModal(false)} />}

      <PageTitle
        lead={<Avatar user={user} />}
        title={fullName}
        sub={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="break-all">{user.email}</span>
            {staffLabel[user.role] && <Tag>{staffLabel[user.role]}</Tag>}
            {isClassRep && <Tag>Class representative</Tag>}
          </span>
        }
      >
        {/* Phones: the two quiet buttons share a row, the main one takes the next */}
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          <button type="button" onClick={handleLogout} className={`max-lg:flex-1 ${btnGhost}`}>
            Log out
          </button>
          <button type="button" onClick={() => setPwModal(true)} className={`max-lg:flex-1 ${btnGhost}`}>
            Change password
          </button>
          <button type="button" onClick={() => setEditModal(true)} className={`max-lg:w-full ${btn}`}>
            Edit profile
          </button>
        </div>
      </PageTitle>

      <Facts
        className="mt-9"
        facts={[
          { label: "Roll number", value: user.rollNumber || missing },
          { label: "Branch", value: `${user.branch}, section ${user.section}` },
          { label: "Year", value: `Year ${user.year}` },
          { label: "CGPA", value: user.cgpa != null ? user.cgpa.toFixed(2) : missing },
          { label: "Backlogs", value: user.backlogs ?? missing },
        ]}
      />
      <p className="mt-3.5 text-[13.5px] leading-[1.55] text-ink-3">
        Name, roll number, branch, year, CGPA and backlogs come from the college roster and can only
        be changed by the placement office.{" "}
        {classroom ? (
          <>
            Your classroom is{" "}
            <Link
              to={`/academics/classroom/${classroom._id}`}
              className={`rounded text-ink-2 underline decoration-line-2 underline-offset-[3px] hover:text-ink ${focusRing}`}
            >
              {classroom.branch} {classroom.batch}, Section {classroom.section}
            </Link>
            .
          </>
        ) : (
          "You are not assigned to a classroom yet."
        )}
      </p>

      <div className="mt-11 grid grid-cols-1 gap-y-11 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        <div className="min-w-0 space-y-11 lg:space-y-14">
          <section>
            <SectionHead title="About" />
            {user.bio ? (
              <p className="max-w-[64ch] whitespace-pre-line break-words text-base leading-[1.6] text-ink/90">
                {user.bio}
              </p>
            ) : (
              <p className={note}>
                Nothing here yet.{" "}
                <button type="button" onClick={() => setEditModal(true)} className={inlineLink}>
                  Add a line about yourself
                </button>
              </p>
            )}
          </section>

          <section>
            <SectionHead title="Links" />
            <ul className="divide-y divide-line">
              <LinkRow
                label="Resume"
                url={user.resumeUrl}
                text="Open resume"
                onAdd={() => setEditModal(true)}
              />
              <LinkRow label="GitHub" url={user.github} onAdd={() => setEditModal(true)} />
              <LinkRow label="LinkedIn" url={user.linkedin} onAdd={() => setEditModal(true)} />
              <LinkRow label="Portfolio" url={user.portfolio} onAdd={() => setEditModal(true)} />
            </ul>
          </section>

          {(user.role === "student" || applications.length > 0) && (
            <section>
              <SectionHead
                title="Applications"
                linkTo="/career/my-applications"
                linkLabel="All applications"
              />
              {applications.length > 0 ? (
                <Rows>
                  {applications.map((app) => {
                    const status = APPLICATION_STATUS[app.status] ?? APPLICATION_STATUS.active;
                    return (
                      <Row
                        key={app._id}
                        to={`/career/drives/${app.drive._id}`}
                        lead={<LogoTile src={app.drive.companyLogo} name={app.drive.companyName} />}
                        title={app.drive.companyName}
                        meta={app.drive.role}
                        end={<Pill tone={status.tone}>{status.label}</Pill>}
                      />
                    );
                  })}
                </Rows>
              ) : (
                <p className={note}>You haven't applied to any placement drives yet.</p>
              )}
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-11 lg:space-y-14">
          <section>
            <SectionHead title="Clubs you follow" linkTo="/community/clubs" linkLabel="All clubs" />
            {followedClubs.length > 0 ? (
              <>
                <Rows>
                  {visibleClubs.map((club) => (
                    <Row
                      key={club._id}
                      to={`/community/clubs/${club._id}`}
                      lead={<LogoTile src={club.logo} name={club.clubName} cover />}
                      title={club.clubName}
                    />
                  ))}
                </Rows>
                {followedClubs.length > LIST_SHOWN && (
                  <button
                    type="button"
                    onClick={() => setShowAllClubs((p) => !p)}
                    aria-expanded={showAllClubs}
                    className={`mt-2 ${textLink}`}
                  >
                    {showAllClubs ? "Show fewer" : `Show ${followedClubs.length - LIST_SHOWN} more`}
                  </button>
                )}
              </>
            ) : (
              <p className={note}>You're not following any clubs yet.</p>
            )}
          </section>

          <section>
            <SectionHead
              title="Events you're going to"
              linkTo="/community/events"
              linkLabel="All events"
            />
            {upcoming.length > 0 ? (
              <>
                <Rows>
                  {visibleEvents.map((event) => (
                    <Row
                      key={event._id}
                      to={`/community/events/${event._id}`}
                      lead={<DateTile date={event.startDateTime} />}
                      title={event.eventName}
                      meta={[describeWhen(event.startDateTime), event.venue].filter(Boolean).join(", ")}
                    />
                  ))}
                </Rows>
                {upcoming.length > LIST_SHOWN && (
                  <button
                    type="button"
                    onClick={() => setShowAllEvents((p) => !p)}
                    aria-expanded={showAllEvents}
                    className={`mt-2 ${textLink}`}
                  >
                    {showAllEvents ? "Show fewer" : `Show ${upcoming.length - LIST_SHOWN} more`}
                  </button>
                )}
              </>
            ) : (
              <p className={note}>You're not registered for any upcoming events.</p>
            )}
            {pastCount > 0 && (
              <p className="mt-2 text-[13.5px] text-ink-3">
                Plus {pastCount} earlier {pastCount === 1 ? "event" : "events"} you registered for.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
