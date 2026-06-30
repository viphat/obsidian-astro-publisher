type NoteLike = {
  data: {
    title: string;
    updated_at: string;
    tags?: string[];
  };
};

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
