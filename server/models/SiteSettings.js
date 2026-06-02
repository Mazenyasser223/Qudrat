const mongoose = require('mongoose');

const DEFAULT_CURRICULUM_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const siteSettingsSchema = new mongoose.Schema({
  singleton: {
    type: String,
    default: 'main',
    unique: true
  },
  curriculumGroupOrder: {
    type: [Number],
    default: () => [...DEFAULT_CURRICULUM_ORDER]
  }
}, {
  timestamps: true
});

siteSettingsSchema.statics.getMain = async function getMain() {
  let settings = await this.findOne({ singleton: 'main' });
  if (!settings) {
    settings = await this.create({ singleton: 'main' });
  }
  return settings;
};

siteSettingsSchema.statics.getCurriculumGroupOrder = async function getCurriculumGroupOrder() {
  const settings = await this.getMain();
  const order = settings.curriculumGroupOrder;
  if (!Array.isArray(order) || order.length !== 9) {
    return [...DEFAULT_CURRICULUM_ORDER];
  }
  const valid = order.every((n) => Number.isInteger(n) && n >= 0 && n <= 8);
  const unique = new Set(order).size === 9;
  if (!valid || !unique) {
    return [...DEFAULT_CURRICULUM_ORDER];
  }
  return order;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
module.exports.DEFAULT_CURRICULUM_ORDER = DEFAULT_CURRICULUM_ORDER;
