import { supabase } from "../lib/supabase";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  FileText,
  FolderKanban,
  MapPin,
  Megaphone,
  MessageSquareQuote,
  Users,
} from "lucide-react";

export type CmsHit = {
  id: string;
  label: string;
  hint: string;
  to: string;
  icon: LucideIcon;
  group: "Content";
};

function q(pattern: string) {
  return pattern.replace(/[%_,()"]/g, " ").replace(/\s+/g, " ").trim();
}

function orIlike(columns: string[], term: string) {
  const like = `"%${term}%"`;
  return columns.map((col) => `${col}.ilike.${like}`).join(",");
}

export async function searchCmsRecords(raw: string, limitPerTable = 5): Promise<CmsHit[]> {
  const term = q(raw);
  if (term.length < 2) return [];

  const [
    jobs,
    locations,
    team,
    insights,
    studies,
    clients,
    feedback,
    announcements,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, department, location_label, summary")
      .or(orIlike(["title", "department", "location_label", "summary", "level"], term))
      .limit(limitPerTable),
    supabase
      .from("talent_locations")
      .select("id, name, region, utc_offset")
      .or(orIlike(["name", "region", "id"], term))
      .limit(limitPerTable),
    supabase
      .from("team_members")
      .select("id, name, role, bio, region, quote")
      .or(orIlike(["name", "role", "bio", "region", "quote"], term))
      .limit(limitPerTable),
    supabase
      .from("insights")
      .select("id, title, excerpt, category, section")
      .or(orIlike(["title", "excerpt", "category", "section"], term))
      .limit(limitPerTable),
    supabase
      .from("case_studies")
      .select("id, title, description, industry, result")
      .or(orIlike(["title", "description", "industry", "result"], term))
      .limit(limitPerTable),
    supabase
      .from("clients")
      .select("id, name, url")
      .or(orIlike(["name", "url"], term))
      .limit(limitPerTable),
    supabase
      .from("feedback")
      .select("id, author_name, author_role, quote, location")
      .or(orIlike(["author_name", "author_role", "quote", "location"], term))
      .limit(limitPerTable),
    supabase
      .from("announcements")
      .select("id, title, body, link_label")
      .or(orIlike(["title", "body", "link_label"], term))
      .limit(limitPerTable),
  ]);

  const hits: CmsHit[] = [];

  for (const row of jobs.data ?? []) {
    hits.push({
      id: `job-${row.id}`,
      label: row.title,
      hint: `Job · ${row.department || row.location_label || "Open role"}`,
      to: "/jobs",
      icon: Briefcase,
      group: "Content",
    });
  }
  for (const row of locations.data ?? []) {
    hits.push({
      id: `loc-${row.id}`,
      label: row.name,
      hint: `Location · ${row.region}`,
      to: "/locations",
      icon: MapPin,
      group: "Content",
    });
  }
  for (const row of team.data ?? []) {
    hits.push({
      id: `team-${row.id}`,
      label: row.name,
      hint: `Team · ${row.role || row.region || "Member"}`,
      to: "/team",
      icon: Users,
      group: "Content",
    });
  }
  for (const row of insights.data ?? []) {
    hits.push({
      id: `insight-${row.id}`,
      label: row.title,
      hint: `Insight · ${row.section || row.category || "Post"}`,
      to: "/insights",
      icon: FileText,
      group: "Content",
    });
  }
  for (const row of studies.data ?? []) {
    hits.push({
      id: `study-${row.id}`,
      label: row.title,
      hint: `Case study · ${row.industry || "Project"}`,
      to: "/case-studies",
      icon: FolderKanban,
      group: "Content",
    });
  }
  for (const row of clients.data ?? []) {
    hits.push({
      id: `client-${row.id}`,
      label: row.name,
      hint: "Client",
      to: "/clients",
      icon: Building2,
      group: "Content",
    });
  }
  for (const row of feedback.data ?? []) {
    hits.push({
      id: `feedback-${row.id}`,
      label: row.author_name || "Feedback",
      hint: `Feedback · ${(row.quote ?? "").slice(0, 48)}`,
      to: "/feedback",
      icon: MessageSquareQuote,
      group: "Content",
    });
  }
  for (const row of announcements.data ?? []) {
    hits.push({
      id: `announcement-${row.id}`,
      label: row.title,
      hint: `Announcement · ${(row.body ?? "").slice(0, 48)}`,
      to: "/announcements",
      icon: Megaphone,
      group: "Content",
    });
  }

  return hits;
}
