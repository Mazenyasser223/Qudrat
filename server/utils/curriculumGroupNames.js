const DEFAULT_CURRICULUM_GROUP_NAMES = Object.fromEntries([
  [0, 'التأسيس'],
  ...Array.from({ length: 8 }, (_, i) => [i + 1, `المجموعة ${i + 1}`])
]);

const getCurriculumGroupName = (slot, names = {}) => {
  const n = typeof slot === 'string' ? parseInt(slot, 10) : slot;
  const key = String(n);
  const custom = names[key] ?? names[n];
  if (custom && typeof custom === 'string' && custom.trim()) {
    return custom.trim();
  }
  return DEFAULT_CURRICULUM_GROUP_NAMES[n] ?? `مجلد #${n}`;
};

const normalizeCurriculumGroupNames = (stored) => {
  const result = { ...DEFAULT_CURRICULUM_GROUP_NAMES };
  if (!stored || typeof stored !== 'object') {
    return result;
  }
  for (let i = 0; i <= 8; i += 1) {
    const key = String(i);
    const value = stored[key] ?? stored[i];
    if (typeof value === 'string' && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
};

module.exports = {
  DEFAULT_CURRICULUM_GROUP_NAMES,
  getCurriculumGroupName,
  normalizeCurriculumGroupNames
};
