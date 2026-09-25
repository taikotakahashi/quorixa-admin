/** CMS row types used by the admin app. */

export type TalentRegion = "Americas" | "Europe" | "Asia";

export type TalentLocationRow = {
  id: string;
  name: string;
  region: TalentRegion;
  flag: string;
  utc_offset: string;
  x: number;
  y: number;
  open_roles_override: number | null;
  sort_order: number;
  published: boolean;
};

export type TeamMemberKind = "team" | "leadership" | "testimonial";

/** One row = one person. Legacy kind/role still present; leadership may be in bio meta. */
export type TeamMemberRow = {
  id: string;
  slug: string | null;
  name: string;
  role: string;
  bio: string | null;
  region: string | null;
  quote: string | null;
  photo_url: string | null;
  kind: TeamMemberKind;
  team_role?: string | null;
  leadership_role?: string | null;
  sort_order: number;
  published: boolean;
};

export type JobType = "Remote" | "Hybrid" | "On-site";

export type JobRow = {
  id: string;
  title: string;
  department: string;
  location_label: string;
  type: JobType;
  level: string;
  technologies: string[];
  summary: string;
  responsibilities: string[];
  requirements: string[];
  location_id: string | null;
  sort_order: number;
  published: boolean;
};

export type InsightSection = "Insights" | "Articles" | "News";

export type InsightRow = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  section: InsightSection;
  tags: string[];
  published_at: string | null;
  read_time: string;
  image_url: string | null;
  content: string[];
  featured: boolean;
  sort_order: number;
  published: boolean;
};

export type CaseStudyTag = {
  label: string;
  color: string;
  textColor: string;
};

export type CaseStudyRow = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  tags: CaseStudyTag[];
  href: string | null;
  industry: string | null;
  result: string | null;
  sort_order: number;
  published: boolean;
};

export type CaseStudyDetailRow = {
  case_study_id: string;
  detail: Record<string, unknown>;
};

export type ClientRow = {
  id: string;
  name: string;
  logo_url: string | null;
  url: string | null;
  sort_order: number;
  published: boolean;
};

export type FeedbackAuthorType = "team" | "user" | "client";
export type FeedbackStatus = "pending" | "approved" | "rejected";

export type FeedbackRow = {
  id: string;
  author_name: string;
  author_role: string;
  author_type: FeedbackAuthorType;
  quote: string;
  location: string | null;
  photo_url: string | null;
  status: FeedbackStatus;
  sort_order: number;
  published: boolean;
};
