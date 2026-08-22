
export const normalizeNameAggressive = (name: string) => {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\s+/g, " ") // Remove multiple spaces
    .trim()
    .toLowerCase();
};

export const calculateSimilarity = (s1: string, s2: string): number => {
  const norm1 = normalizeNameAggressive(s1);
  const norm2 = normalizeNameAggressive(s2);

  if (norm1 === norm2) return 1.0;

  const words1 = norm1.split(" ").filter(w => w.length > 2);
  const words2 = norm2.split(" ").filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let matches = 0;
  for (const w1 of words1) {
    if (words2.includes(w1)) matches++;
  }

  const overlap = (matches * 2) / (words1.length + words2.length);
  return overlap;
};

export const getSimilarCandidates = (
  name: string,
  candidates: { id: string; nome: string; nome_normalizado: string }[],
  limit = 3
) => {
  return candidates
    .map(c => ({
      ...c,
      similarity: calculateSimilarity(name, c.nome)
    }))
    .filter(c => c.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
};
