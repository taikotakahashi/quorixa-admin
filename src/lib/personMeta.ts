/** Encode optional person fields in `team_members.bio` without a schema migration. */
export type PersonMeta = {
  leadershipRole?: string;
  bioText?: string;
  linkedin?: string;
  email?: string;
  phone?: string;
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parsePersonMeta(bio: string | null | undefined): PersonMeta {
  if (!bio) return {};
  const trimmed = bio.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as PersonMeta;
      if (parsed && typeof parsed === "object") {
        return {
          leadershipRole: asOptionalString(parsed.leadershipRole),
          bioText: asOptionalString(parsed.bioText) ?? (parsed.bioText === "" ? "" : undefined),
          linkedin: asOptionalString(parsed.linkedin),
          email: asOptionalString(parsed.email),
          phone: asOptionalString(parsed.phone),
        };
      }
    } catch {
      /* fall through to plain bio */
    }
  }
  return { bioText: bio };
}

export function serializePersonMeta(meta: PersonMeta): string | null {
  const leadershipRole = meta.leadershipRole?.trim() || undefined;
  const bioText = meta.bioText?.trim() || undefined;
  const linkedin = meta.linkedin?.trim() || undefined;
  const email = meta.email?.trim() || undefined;
  const phone = meta.phone?.trim() || undefined;

  const hasArchive = !!(leadershipRole || linkedin || email || phone);
  if (!hasArchive) return bioText ?? null;

  return JSON.stringify({
    leadershipRole: leadershipRole ?? "",
    bioText: bioText ?? "",
    linkedin: linkedin ?? "",
    email: email ?? "",
    phone: phone ?? "",
  });
}
