import { slugifyTag } from "./slug";

type NoteLike = {
  data: {
    title: string;
    updated_at: string;
    tags?: string[];
    publish?: boolean;
    draft?: boolean;
  };
};

export type TagGroup<TNote> = {
  slug: string;
  label: string;
  notes: TNote[];
};

// A note is public only when it is not a draft and not explicitly unpublished.
// The content schema defaults `publish` to true, so a missing flag stays public;
// an author-set `publish: false` must hide the note from every route.
export function isPublicNote(note: NoteLike): boolean {
  return note.data.publish !== false && note.data.draft !== true;
}

export function getPublicNotes<TNote extends NoteLike>(notes: TNote[]): TNote[] {
  return notes.filter((note) => isPublicNote(note));
}

export function sortNotesNewestFirst<TNote extends NoteLike>(notes: TNote[]): TNote[] {
  return [...notes].sort((left, right) => {
    return right.data.updated_at.localeCompare(left.data.updated_at);
  });
}

export function getUniqueSortedTags(notes: NoteLike[]): string[] {
  return Array.from(new Set(notes.flatMap((note) => note.data.tags ?? []))).sort((left, right) =>
    left.localeCompare(right)
  );
}

// Group notes by URL-safe tag slug so the tag route param and the hrefs built
// with getTagPath always agree. The first raw tag mapping to a slug becomes the
// display label; a note is added to a group at most once.
export function getTagGroups<TNote extends NoteLike>(notes: TNote[]): Array<TagGroup<TNote>> {
  const groups = new Map<string, { label: string; notes: TNote[]; seen: Set<TNote> }>();

  for (const note of notes) {
    for (const tag of note.data.tags ?? []) {
      const slug = slugifyTag(tag);
      if (!slug) {
        continue;
      }
      let group = groups.get(slug);
      if (!group) {
        group = { label: tag, notes: [], seen: new Set<TNote>() };
        groups.set(slug, group);
      }
      if (!group.seen.has(note)) {
        group.seen.add(note);
        group.notes.push(note);
      }
    }
  }

  return Array.from(groups.entries())
    .map(([slug, group]) => ({ slug, label: group.label, notes: group.notes }))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}
