export interface Chunk {
  docId: string;
  title: string;
  /** Position of the paragraph within its doc, from 0. */
  index: number;
  text: string;
}

const HEADING_ONLY = /^#{1,6} [^\n]*$/;

/** One chunk per paragraph. A heading on its own is glued to the paragraph after it. */
export function chunkDoc(doc: { id: string; title: string; body: string }): Chunk[] {
  const paragraphs = doc.body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const texts: string[] = [];
  let pendingHeading: string | null = null;
  for (const p of paragraphs) {
    if (HEADING_ONLY.test(p)) {
      pendingHeading = pendingHeading ? `${pendingHeading}\n\n${p}` : p;
      continue;
    }
    texts.push(pendingHeading ? `${pendingHeading}\n\n${p}` : p);
    pendingHeading = null;
  }
  if (pendingHeading) texts.push(pendingHeading);

  return texts.map((text, index) => ({ docId: doc.id, title: doc.title, index, text }));
}
