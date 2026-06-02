export const DEFAULT_CURRICULUM_GROUP_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function sortExamGroupNumbers(
  groupNums,
  curriculumGroupOrder = DEFAULT_CURRICULUM_GROUP_ORDER,
  customGroups = []
) {
  const curriculumRank = new Map(
    curriculumGroupOrder.map((slot, index) => [slot, index])
  );
  const customOrder = new Map(
    customGroups
      .filter((g) => g.groupNumber >= 9)
      .sort((a, b) => (a.displayOrder ?? a.groupNumber) - (b.displayOrder ?? b.groupNumber))
      .map((g, index) => [g.groupNumber, index])
  );

  return [...groupNums].sort((a, b) => {
    const aNum = typeof a === 'string' ? parseInt(a, 10) : a;
    const bNum = typeof b === 'string' ? parseInt(b, 10) : b;
    if (aNum <= 8 && bNum <= 8) {
      return (curriculumRank.get(aNum) ?? aNum) - (curriculumRank.get(bNum) ?? bNum);
    }
    if (aNum <= 8) return -1;
    if (bNum <= 8) return 1;
    const ao = customOrder.has(aNum) ? customOrder.get(aNum) : aNum;
    const bo = customOrder.has(bNum) ? customOrder.get(bNum) : bNum;
    return ao - bo;
  });
}
