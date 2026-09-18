function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Turns [subtitle, title, year] tuples into { id, subtitle, title, year } options with
// stable, unique, deterministic slug ids (so repeat votes for the same option keep landing
// on the same blob key even though nothing else about the poll has a natural identifier).
function buildOptions(rawTuples) {
  const seenSlugs = new Map();
  return rawTuples.map(([subtitle, title, year]) => {
    const base = slugify(`${subtitle}-${title}`);
    const seenCount = seenSlugs.get(base) || 0;
    seenSlugs.set(base, seenCount + 1);
    const id = seenCount === 0 ? base : `${base}-${seenCount + 1}`;
    return { id, subtitle, title, year };
  });
}

module.exports = { buildOptions };
