import PUBLIC_PROFILE from './public-profile.json';

export interface PrimaryAction {
  id: string;
  label: string;
  note: string;
  href: string;
}

export interface PublicProof {
  label: string;
  detail: string;
  href: string;
}

export interface ExperienceRole {
  id: string;
  org: string;
  title: string;
  start: string;
  end: string | null;
  note: string;
  summary: string[];
  details: string[];
}

export interface EducationItem {
  school: string;
  detail: string;
}

export interface Profile {
  name: string;
  role: string;
  dateModified: string;
  status: string;
  summary: string;
  experienceNote: string;
  focus: string;
  publicProof: PublicProof[];
  primaryActions: PrimaryAction[];
  identity: {
    emailLinkId: string;
    sameAsLinkIds: string[];
  };
  experience: ExperienceRole[];
  education: EducationItem[];
}

export const PROFILE: Profile = PUBLIC_PROFILE;
