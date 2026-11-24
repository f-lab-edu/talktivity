export function moveItem<T>(items: readonly T[], from: number, to: number): readonly T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}
