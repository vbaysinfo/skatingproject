'use client';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';

export type StudentForm = {
  firstName: string; lastName: string; dob: string; gender: string; parentName: string; parentMobile: string; email: string; school: string;
  className: string; address: string; city: string; state: string; pincode: string; academy: string; experienceLevel: string;
  emergencyContactName: string; emergencyContactPhone: string;
};

export const EMPTY_STUDENT: StudentForm = {
  firstName: '', lastName: '', dob: '', gender: '', parentName: '', parentMobile: '', email: '', school: '', className: '', address: '', city: '',
  state: '', pincode: '', academy: '', experienceLevel: '', emergencyContactName: '', emergencyContactPhone: '',
};

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Competitive', 'Elite'];

export function ageFromDob(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - +m[1];
  if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) age--;
  return age;
}

/** Athlete profile fields shared by registration, profile editing and admin forms. */
export function StudentFields({ value, onChange, showEmail = true, lockEmail }: {
  value: StudentForm; onChange: (v: StudentForm) => void; showEmail?: boolean; lockEmail?: boolean;
}) {
  const set = (k: keyof StudentForm) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-ink">Athlete</legend>
        <Field label="First name" htmlFor="firstName" required><Input id="firstName" value={value.firstName} onChange={set('firstName')} required autoComplete="given-name" maxLength={80} /></Field>
        <Field label="Last name" htmlFor="lastName"><Input id="lastName" value={value.lastName} onChange={set('lastName')} autoComplete="family-name" maxLength={80} /></Field>
        <Field label="Date of birth" htmlFor="dob" required><Input id="dob" type="date" value={value.dob} onChange={set('dob')} required max={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Gender" htmlFor="gender" required>
          <Select id="gender" value={value.gender} onChange={set('gender')} required>
            <option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
          </Select>
        </Field>
        {showEmail && <Field label="Email" htmlFor="email" required><Input id="email" type="email" value={value.email} onChange={set('email')} required disabled={lockEmail} autoComplete="email" /></Field>}
        <Field label="Experience level" htmlFor="experienceLevel">
          <Select id="experienceLevel" value={value.experienceLevel} onChange={set('experienceLevel')}>
            <option value="">Select</option>{EXPERIENCE_LEVELS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="School" htmlFor="school"><Input id="school" value={value.school} onChange={set('school')} maxLength={120} /></Field>
        <Field label="Class / grade" htmlFor="className"><Input id="className" value={value.className} onChange={set('className')} maxLength={20} /></Field>
        <Field label="Academy / club" htmlFor="academy" className="sm:col-span-2"><Input id="academy" value={value.academy} onChange={set('academy')} maxLength={120} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-ink">Parent / guardian</legend>
        <Field label="Parent / guardian name" htmlFor="parentName" required><Input id="parentName" value={value.parentName} onChange={set('parentName')} required maxLength={120} /></Field>
        <Field label="Parent mobile" htmlFor="parentMobile" required hint="Include country code, e.g. +91"><Input id="parentMobile" type="tel" value={value.parentMobile} onChange={set('parentMobile')} required autoComplete="tel" pattern="\+?[0-9][0-9\s\-]{8,16}" /></Field>
        <Field label="Emergency contact name" htmlFor="emergencyContactName"><Input id="emergencyContactName" value={value.emergencyContactName} onChange={set('emergencyContactName')} maxLength={120} /></Field>
        <Field label="Emergency contact phone" htmlFor="emergencyContactPhone"><Input id="emergencyContactPhone" type="tel" value={value.emergencyContactPhone} onChange={set('emergencyContactPhone')} pattern="\+?[0-9][0-9\s\-]{8,16}" /></Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-ink">Address</legend>
        <Field label="Address" htmlFor="address" className="sm:col-span-3"><Textarea id="address" value={value.address} onChange={set('address')} rows={2} className="min-h-20" maxLength={500} autoComplete="street-address" /></Field>
        <Field label="City" htmlFor="city" required><Input id="city" value={value.city} onChange={set('city')} required autoComplete="address-level2" /></Field>
        <Field label="State" htmlFor="state" required><Input id="state" value={value.state} onChange={set('state')} required autoComplete="address-level1" /></Field>
        <Field label="PIN code" htmlFor="pincode"><Input id="pincode" value={value.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={10} autoComplete="postal-code" /></Field>
      </fieldset>
    </div>
  );
}
