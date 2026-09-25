/** Encode optional leadership title without a schema migration. */
export type PersonMeta = {
  leadershipRole?: string;
  bioText?: string;
};

const META_MARKER = '"leadershipRole"';

export function parsePersonMeta(bio: string | null | undefined): PersonMeta {
  if (!bio || !bio.includes(META_MARKER)) {
    return { bioText: bio ?? undefined };
  }
  try {
    const parsed = JSON.parse(bio) as PersonMeta;
    if (parsed && typeof parsed === "object") {
      return {
        leadershipRole:
          typeof parsed.leadershipRole === "string"
            ? parsed.leadershipRole
            : undefined,
        bioText:
          typeof parsed.bioText === "string" ? parsed.bioText : undefined,
      };
    }
  } catch {
    /* plain bio */
  }
  return { bioText: bio };
}

export function serializePersonMeta(meta: PersonMeta): string | null {
  const leadershipRole = meta.leadershipRole?.trim() || undefined;
  const bioText = meta.bioText?.trim() || undefined;
  if (!leadershipRole) return bioText ?? null;
  return JSON.stringify({ leadershipRole, bioText: bioText ?? "" });
}
