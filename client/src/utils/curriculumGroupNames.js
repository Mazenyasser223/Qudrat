export const DEFAULT_CURRICULUM_GROUP_NAMES = Object.fromEntries([
  [0, 'التأسيس'],
  ...Array.from({ length: 8 }, (_, i) => [i + 1, `المجموعة ${i + 1}`])
]);

export function getCurriculumGroupName(slot, names = {}) {
  const n = typeof slot === 'string' ? parseInt(slot, 10) : slot;
  const key = String(n);
  const custom = names[key] ?? names[n];
  if (custom && typeof custom === 'string' && custom.trim()) {
    return custom.trim();
  }
  return DEFAULT_CURRICULUM_GROUP_NAMES[n] ?? `مجلد #${n}`;
}

export function resolveGroupName(groupNumber, { curriculumGroupNames = {}, customGroups = [] } = {}) {
  const num = typeof groupNumber === 'string' ? parseInt(groupNumber, 10) : groupNumber;
  if (Number.isNaN(num)) return String(groupNumber);

  const customByNumber = customGroups.find((g) => g.groupNumber === num);
  if (customByNumber) return customByNumber.name;

  if (num >= 0 && num <= 8) {
    return getCurriculumGroupName(num, curriculumGroupNames);
  }

  return `مجلد #${num}`;
}
