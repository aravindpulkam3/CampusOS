import ImageUploadZone from "../../components/forms/ImageUploadZone";
import { CLUB_CATEGORIES } from "../../constants/categories";
import { Field, FormSection, Segmented, describedBy, inputClass } from "../../components/forms/formBits";

// The fields a club is made of, shared by the create and edit pages. `form`
// holds clubName, description, category, logo and banner; `setValue(field,
// value)` changes one and clears its error.
const ClubFields = ({ form, errors, setValue }) => (
  <>
    <FormSection first title="About the club">
      <Field id="club-clubName" label="Club name" error={errors.clubName} full>
        <input
          id="club-clubName"
          type="text"
          placeholder="e.g. Coding Club, IEEE Student Branch"
          value={form.clubName}
          onChange={(e) => setValue("clubName", e.target.value)}
          className={inputClass(errors.clubName)}
          {...describedBy("club-clubName", errors.clubName)}
        />
      </Field>
      <Field id="club-description" label="Description" error={errors.description} full>
        <textarea
          id="club-description"
          rows={5}
          placeholder="What the club does, and what members can expect"
          value={form.description}
          onChange={(e) => setValue("description", e.target.value)}
          className={`${inputClass(errors.description)} resize-none py-2.5 leading-[1.55]`}
          {...describedBy("club-description", errors.description)}
        />
      </Field>
      <Field id="club-category" label="Category" group full error={errors.category}>
        <Segmented
          options={CLUB_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
          value={form.category}
          onChange={(cat) => setValue("category", cat)}
        />
      </Field>
    </FormSection>

    <FormSection title="Pictures" hint="The logo marks the club everywhere; the banner heads its page.">
      <ImageUploadZone
        label="Logo"
        value={form.logo}
        folder="club-logos"
        onChange={(uploadedUrl) => setValue("logo", uploadedUrl)}
      />
      <ImageUploadZone
        label="Banner"
        value={form.banner}
        folder="clubs-banners"
        onChange={(uploadedUrl) => setValue("banner", uploadedUrl)}
      />
    </FormSection>
  </>
);

export default ClubFields;

export const CLUB_ORDER = ["clubName", "description", "category"];
export const clubFieldId = (key) => `club-${key}`;
