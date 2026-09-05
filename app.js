// App State
let currentYear = parseInt(localStorage.getItem('stardew_current_year')) || 1;
let currentSeason = localStorage.getItem('stardew_current_season') || 'spring';
let activeDay = 1;
let firebaseDb = null;
let syncKey = null;

// Migrate old data if necessary (and save clean version back)
let rawSchedule = JSON.parse(localStorage.getItem('stardew_schedule')) || {};
let schedule = {};
if (rawSchedule.spring || rawSchedule.summer || rawSchedule.fall || rawSchedule.winter) {
  schedule[1] = {
    spring: rawSchedule.spring || {},
    summer: rawSchedule.summer || {},
    fall: rawSchedule.fall || {},
    winter: rawSchedule.winter || {}
  };
  localStorage.setItem('stardew_schedule', JSON.stringify(schedule));
} else {
  schedule = rawSchedule;
}

const CROP_IMAGES = {
  'parsnip': 'https://stardewvalleywiki.com/mediawiki/images/d/db/Parsnip.png',
  'potato': 'https://stardewvalleywiki.com/mediawiki/images/c/c2/Potato.png',
  'cauliflower': 'https://stardewvalleywiki.com/mediawiki/images/a/aa/Cauliflower.png',
  'kale': 'https://stardewvalleywiki.com/mediawiki/images/d/d1/Kale.png',
  'garlic': 'https://stardewvalleywiki.com/mediawiki/images/c/cc/Garlic.png',
  'unmilled_rice': 'https://stardewvalleywiki.com/mediawiki/images/f/fe/Unmilled_Rice.png',
  'strawberry': 'https://stardewvalleywiki.com/mediawiki/images/6/6d/Strawberry.png',
  'rhubarb': 'https://stardewvalleywiki.com/mediawiki/images/6/6e/Rhubarb.png',
  'green_bean': 'https://stardewvalleywiki.com/mediawiki/images/5/5c/Green_Bean.png',
  'melon': 'https://stardewvalleywiki.com/mediawiki/images/1/19/Melon.png',
  'blueberry': 'https://stardewvalleywiki.com/mediawiki/images/a/af/Blueberries.png',
  'starfruit': 'https://stardewvalleywiki.com/mediawiki/images/d/db/Starfruit.png',
  'corn': 'https://stardewvalleywiki.com/mediawiki/images/f/f8/Corn.png',
  'hot_pepper': 'https://stardewvalleywiki.com/mediawiki/images/f/f1/Hot_Pepper.png',
  'tomato': 'https://stardewvalleywiki.com/mediawiki/images/9/9d/Tomato.png',
  'radish': 'https://stardewvalleywiki.com/mediawiki/images/d/d5/Radish.png',
  'red_cabbage': 'https://stardewvalleywiki.com/mediawiki/images/2/2d/Red_Cabbage.png',
  'hops': 'https://stardewvalleywiki.com/mediawiki/images/5/59/Hops.png',
  'pumpkin': 'https://stardewvalleywiki.com/mediawiki/images/6/64/Pumpkin.png',
  'cranberry': 'https://stardewvalleywiki.com/mediawiki/images/6/6e/Cranberries.png',
  'grape': 'https://stardewvalleywiki.com/mediawiki/images/c/c2/Grape.png',
  'eggplant': 'https://stardewvalleywiki.com/mediawiki/images/8/8f/Eggplant.png',
  'amaranth': 'https://stardewvalleywiki.com/mediawiki/images/f/f6/Amaranth.png',
  'artichoke': 'https://stardewvalleywiki.com/mediawiki/images/d/dd/Artichoke.png',
  'beet': 'https://stardewvalleywiki.com/mediawiki/images/a/a4/Beet.png',
  'bok_choy': 'https://stardewvalleywiki.com/mediawiki/images/4/40/Bok_Choy.png',
  'sweetgem': 'https://stardewvalleywiki.com/mediawiki/images/8/88/Sweet_Gem_Berry.png',
  'ancient': 'https://stardewvalleywiki.com/mediawiki/images/0/01/Ancient_Fruit.png',
  'pineapple': 'https://stardewvalleywiki.com/mediawiki/images/f/fb/Pineapple.png',
  'taro': 'https://stardewvalleywiki.com/mediawiki/images/0/01/Taro_Root.png',
  'coffee': 'https://stardewvalleywiki.com/mediawiki/images/3/33/Coffee_Bean.png',
  'cherry': 'https://stardewvalleywiki.com/mediawiki/images/2/20/Cherry.png',
  'apricot': 'https://stardewvalleywiki.com/mediawiki/images/f/fc/Apricot.png',
  'orange': 'https://stardewvalleywiki.com/mediawiki/images/4/43/Orange.png',
  'peach': 'https://stardewvalleywiki.com/mediawiki/images/e/e2/Peach.png',
  'apple': 'https://stardewvalleywiki.com/mediawiki/images/7/7d/Apple.png',
  'pomegranate': 'https://stardewvalleywiki.com/mediawiki/images/1/1b/Pomegranate.png',
  'banana': 'https://stardewvalleywiki.com/mediawiki/images/6/69/Banana.png',
  'mango': 'https://stardewvalleywiki.com/mediawiki/images/e/e4/Mango.png',
  'mahogany': 'https://stardewvalleywiki.com/Special:FilePath/Mahogany_Seed.png',
  'hardwood': 'https://stardewvalleywiki.com/Special:FilePath/Hardwood.png',
  'oak_tree': 'https://stardewvalleywiki.com/Special:FilePath/Acorn.png',
  'maple_tree': 'https://stardewvalleywiki.com/Special:FilePath/Maple_Seed.png',
  'pine_tree': 'https://stardewvalleywiki.com/Special:FilePath/Pine_Cone.png',
  'mystic_tree': 'https://stardewvalleywiki.com/Special:FilePath/Mystic_Tree_Seed.png',
};

const MACHINE_IMAGES = {
  'keg_wine': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Keg.png',
  'keg_beer': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Keg.png',
  'preserves': 'https://stardewvalleywiki.com/mediawiki/images/1/1e/Preserves_Jar.png',
  'cask_silver': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png',
  'cask_gold': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png',
  'cask_iridium': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png',
  'solar_panel': 'https://stardewvalleywiki.com/mediawiki/images/5/5d/Solar_Panel.png',
  'crystal_diamond': 'https://stardewvalleywiki.com/mediawiki/images/e/ea/Diamond.png',
  'crystal_ruby': 'https://stardewvalleywiki.com/mediawiki/images/a/a9/Ruby.png',
  'crystal_jade': 'https://stardewvalleywiki.com/mediawiki/images/7/7e/Jade.png',
  'crystal_emerald': 'https://stardewvalleywiki.com/mediawiki/images/6/6a/Emerald.png',
  'crystal_aquamarine': 'https://stardewvalleywiki.com/mediawiki/images/a/a2/Aquamarine.png',
  'crystal_topaz': 'https://stardewvalleywiki.com/mediawiki/images/a/a5/Topaz.png',
  'crystal_amethyst': 'https://stardewvalleywiki.com/mediawiki/images/2/2e/Amethyst.png',
  'tapper_maple': 'https://stardewvalleywiki.com/mediawiki/images/6/6a/Maple_Syrup.png',
  'tapper_oak': 'https://stardewvalleywiki.com/mediawiki/images/4/40/Oak_Resin.png',
  'tapper_pine': 'https://stardewvalleywiki.com/mediawiki/images/0/01/Pine_Tar.png',
  'tapper_mushroom': 'https://stardewvalleywiki.com/mediawiki/images/4/4b/Purple_Mushroom.png',
  'tapper_mystic': 'https://stardewvalleywiki.com/Special:FilePath/Mystic_Syrup.png',
  'heavy_tapper_maple': 'https://stardewvalleywiki.com/mediawiki/images/6/6a/Maple_Syrup.png',
  'heavy_tapper_oak': 'https://stardewvalleywiki.com/mediawiki/images/4/40/Oak_Resin.png',
  'heavy_tapper_pine': 'https://stardewvalleywiki.com/mediawiki/images/0/01/Pine_Tar.png',
  'heavy_tapper_mushroom': 'https://stardewvalleywiki.com/mediawiki/images/4/4b/Purple_Mushroom.png',
  'heavy_tapper_mystic': 'https://stardewvalleywiki.com/Special:FilePath/Mystic_Syrup.png'
};

// Initialize current year structure if not present (guarantees all seasons exist)
function getYearSchedule(year) {
  if (!schedule[year]) {
    schedule[year] = {};
  }
  const seasons = ['spring', 'summer', 'fall', 'winter'];
  seasons.forEach(s => {
    if (!schedule[year][s]) {
      schedule[year][s] = {};
    }
  });
  return schedule[year];
}

// MASTER CROPS DATA & SELECTION MANAGER
const MASTER_CROPS = [
  // Spring
  { key: 'parsnip', name: 'Parsnip', base: 4, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'potato', name: 'Potato', base: 6, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'cauliflower', name: 'Cauliflower', base: 12, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'kale', name: 'Kale', base: 6, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'garlic', name: 'Garlic', base: 4, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'unmilled_rice', name: 'Unmilled Rice', base: 8, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'strawberry', name: 'Strawberry', base: 8, regrow: 4, season: 'spring', type: 'Spring' },
  { key: 'rhubarb', name: 'Rhubarb', base: 13, regrow: 0, season: 'spring', type: 'Spring' },
  { key: 'green_bean', name: 'Green Bean', base: 10, regrow: 3, season: 'spring', type: 'Spring' },
  // Summer
  { key: 'melon', name: 'Melon', base: 12, regrow: 0, season: 'summer', type: 'Summer' },
  { key: 'blueberry', name: 'Blueberry', base: 13, regrow: 4, season: 'summer', type: 'Summer' },
  { key: 'starfruit', name: 'Starfruit', base: 13, regrow: 0, season: 'summer', type: 'Summer' },
  { key: 'corn', name: 'Corn', base: 14, regrow: 4, season: 'summer', type: 'Summer' },
  { key: 'hot_pepper', name: 'Hot Pepper', base: 5, regrow: 3, season: 'summer', type: 'Summer' },
  { key: 'tomato', name: 'Tomato', base: 11, regrow: 4, season: 'summer', type: 'Summer' },
  { key: 'radish', name: 'Radish', base: 6, regrow: 0, season: 'summer', type: 'Summer' },
  { key: 'red_cabbage', name: 'Red Cabbage', base: 9, regrow: 0, season: 'summer', type: 'Summer' },
  { key: 'hops', name: 'Hops', base: 11, regrow: 1, season: 'summer', type: 'Summer' },
  // Fall
  { key: 'pumpkin', name: 'Pumpkin', base: 13, regrow: 0, season: 'fall', type: 'Fall' },
  { key: 'cranberry', name: 'Cranberries', base: 7, regrow: 5, season: 'fall', type: 'Fall' },
  { key: 'grape', name: 'Grape', base: 10, regrow: 3, season: 'fall', type: 'Fall' },
  { key: 'eggplant', name: 'Eggplant', base: 7, regrow: 5, season: 'fall', type: 'Fall' },
  { key: 'amaranth', name: 'Amaranth', base: 7, regrow: 0, season: 'fall', type: 'Fall' },
  { key: 'artichoke', name: 'Artichoke', base: 8, regrow: 0, season: 'fall', type: 'Fall' },
  { key: 'beet', name: 'Beet', base: 6, regrow: 0, season: 'fall', type: 'Fall' },
  { key: 'bok_choy', name: 'Bok Choy', base: 4, regrow: 0, season: 'fall', type: 'Fall' },
  { key: 'sweetgem', name: 'Sweet Gem Berry', base: 24, regrow: 0, season: 'fall', type: 'Fall' },
  // Special / Trees
  { key: 'ancient', name: 'Ancient Fruit', base: 28, regrow: 7, season: 'spring', type: 'Special' },
  { key: 'pineapple', name: 'Pineapple', base: 14, regrow: 7, season: 'summer', type: 'Special' },
  { key: 'taro', name: 'Taro Root', base: 10, regrow: 0, season: 'summer', type: 'Special' },
  { key: 'coffee', name: 'Coffee Bean', base: 10, regrow: 2, season: 'spring', type: 'Special' },
  { key: 'cherry', name: 'Cherry Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'spring', type: 'Tree' },
  { key: 'apricot', name: 'Apricot Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'spring', type: 'Tree' },
  { key: 'orange', name: 'Orange Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', type: 'Tree' },
  { key: 'peach', name: 'Peach Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', type: 'Tree' },
  { key: 'apple', name: 'Apple Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'fall', type: 'Tree' },
  { key: 'pomegranate', name: 'Pomegranate Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'fall', type: 'Tree' },
  { key: 'banana', name: 'Banana Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', type: 'Tree' },
  { key: 'mango', name: 'Mango Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', type: 'Tree' },
  { key: 'mahogany', name: 'Mahogany Tree', base: 26, regrow: 0, isTree: true, isWildTree: true, activeSeason: 'all', type: 'Tree' },
  { key: 'oak_tree', name: 'Oak Tree', base: 24, regrow: 0, isTree: true, isWildTree: true, activeSeason: 'all', type: 'Tree' },
  { key: 'maple_tree', name: 'Maple Tree', base: 24, regrow: 0, isTree: true, isWildTree: true, activeSeason: 'all', type: 'Tree' },
  { key: 'pine_tree', name: 'Pine Tree', base: 24, regrow: 0, isTree: true, isWildTree: true, activeSeason: 'all', type: 'Tree' },
  { key: 'mystic_tree', name: 'Mystic Tree', base: 24, regrow: 0, isTree: true, isWildTree: true, activeSeason: 'all', type: 'Tree' }
];

// Helper to calculate speed growth days dynamically
function calculateGrowthDays(baseDays, fertilizer, hasAgriculturist) {
  let multiplier = 1.0;
  if (fertilizer === 'speed') multiplier -= 0.1;
  if (fertilizer === 'deluxe') multiplier -= 0.25;
  if (fertilizer === 'hyper') multiplier -= 0.33;
  if (hasAgriculturist) multiplier -= 0.1;
  return Math.max(1, Math.floor(baseDays * multiplier));
}

const CROP_GROWTH_PRESETS = {};

// Populate presets table dynamically
MASTER_CROPS.forEach(c => {
  CROP_GROWTH_PRESETS[c.key] = {
    name: c.name,
    base: c.base,
    regrow: c.regrow,
    isTree: c.isTree || false,
    isWildTree: c.isWildTree || false,
    activeSeason: c.activeSeason || c.season,
    getDays: (fert, agri) => {
      if (c.key === 'mahogany') {
        if (fert === 'tree_fert') return 7; // Mahogany with Tree Fertilizer averages ~7 days
        return 26; // Unfertilized Mahogany averages ~26 days
      }
      if (c.isWildTree) {
        if (fert === 'tree_fert') return 5; // Wild Trees with Tree Fertilizer take exactly 5 days (1 day/stage)
        return c.base || 24;
      }
      if (c.isTree) return 28; // Fruit trees always take 28 days
      return calculateGrowthDays(c.base, fert, agri);
    }
  };
});

const MASTER_MACHINES = [
  { key: 'keg_wine', name: 'Keg (Wine)', duration: 7, type: 'Keg' },
  { key: 'keg_beer', name: 'Keg (Beer/Pale Ale)', duration: 2, type: 'Keg' },
  { key: 'preserves', name: 'Preserves Jar', duration: 3, type: 'Jar' },
  { key: 'cask_silver', name: 'Cask aging (Silver)', duration: 14, type: 'Cask' },
  { key: 'cask_gold', name: 'Cask aging (Gold)', duration: 28, type: 'Cask' },
  { key: 'cask_iridium', name: 'Cask aging (Iridium)', duration: 56, type: 'Cask' },
  { key: 'solar_panel', name: 'Solar Panel', duration: 7, isRepeating: true, type: 'Utility' },
  { key: 'tapper_maple', name: 'Tapper: Maple Tree (Syrup)', duration: 9, isRepeating: true, type: 'Tapper' },
  { key: 'tapper_oak', name: 'Tapper: Oak Tree (Resin)', duration: 7, isRepeating: true, type: 'Tapper' },
  { key: 'tapper_pine', name: 'Tapper: Pine Tree (Tar)', duration: 5, isRepeating: true, type: 'Tapper' },
  { key: 'tapper_mushroom', name: 'Tapper: Mushroom Tree', duration: 1, isRepeating: true, type: 'Tapper' },
  { key: 'tapper_mystic', name: 'Tapper: Mystic Tree (Syrup)', duration: 7, isRepeating: true, type: 'Tapper' },
  { key: 'heavy_tapper_maple', name: 'Heavy Tapper: Maple (Syrup)', duration: 4, isRepeating: true, type: 'Heavy Tapper' },
  { key: 'heavy_tapper_oak', name: 'Heavy Tapper: Oak (Resin)', duration: 3, isRepeating: true, type: 'Heavy Tapper' },
  { key: 'heavy_tapper_pine', name: 'Heavy Tapper: Pine (Tar)', duration: 2, isRepeating: true, type: 'Heavy Tapper' },
  { key: 'heavy_tapper_mushroom', name: 'Heavy Tapper: Mushroom Tree', duration: 1, isRepeating: true, type: 'Heavy Tapper' },
  { key: 'heavy_tapper_mystic', name: 'Heavy Tapper: Mystic (Syrup)', duration: 3, isRepeating: true, type: 'Heavy Tapper' },
  { key: 'crystal_diamond', name: 'Crystalarium: Diamond', duration: 5, isRepeating: true, type: 'Crystalarium' },
  { key: 'crystal_ruby', name: 'Crystalarium: Ruby', duration: 2, isRepeating: true, type: 'Crystalarium' },
  { key: 'crystal_jade', name: 'Crystalarium: Jade', duration: 2, isRepeating: true, type: 'Crystalarium' },
  { key: 'crystal_emerald', name: 'Crystalarium: Emerald', duration: 2, isRepeating: true, type: 'Crystalarium' },
  { key: 'crystal_aquamarine', name: 'Crystalarium: Aquamarine', duration: 2, isRepeating: true, type: 'Crystalarium' },
  { key: 'crystal_topaz', name: 'Crystalarium: Topaz', duration: 1, isRepeating: true, type: 'Crystalarium' },
  { key: 'crystal_amethyst', name: 'Crystalarium: Amethyst', duration: 1, isRepeating: true, type: 'Crystalarium' }
];

const MACHINE_PRESETS = {};
MASTER_MACHINES.forEach(m => {
  MACHINE_PRESETS[m.key] = {
    name: m.name,
    duration: m.duration,
    isRepeating: m.isRepeating || false,
    getDuration: (loc) => {
      if (m.key === 'solar_panel') {
        // Desert (and Ginger Island) have guaranteed 100% sunshine with zero rain -> exactly 7 days
        if (loc === 'Desert' || loc === 'Ginger Island') return 7;
        return 10; // Valley average with rain days
      }
      return m.duration;
    }
  };
});

// UI Elements
const calendarGrid = document.getElementById('calendar-grid');
const seasonBtns = document.querySelectorAll('.season-selector .season-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');

const yearDisplay = document.getElementById('year-display');
const yearUpBtn = document.getElementById('year-up');
const yearDownBtn = document.getElementById('year-down');

// Initialize year display
yearDisplay.innerText = currentYear;

// Helper to save schedule
function saveSchedule() {
  const lastUpdated = Date.now();
  localStorage.setItem('stardew_schedule', JSON.stringify(schedule));
  localStorage.setItem('stardew_last_updated', lastUpdated);
  
  if (firebaseDb && syncKey) {
    firebaseDb.ref(`stardew_calendar/${syncKey}`).set({
      schedule: schedule,
      lastUpdated: lastUpdated
    }).catch(err => console.warn("Firebase save error:", err));
  }
}

// Date conversion helpers
function getAbsoluteDay(year, season, day) {
  const seasonsOrder = ['spring', 'summer', 'fall', 'winter'];
  return (year - 1) * 112 + seasonsOrder.indexOf(season) * 28 + day;
}

// Calculate future date helper (handles Season AND Year rollover)
function getFutureDate(startYear, startSeason, startDay, durationDays) {
  const seasonsOrder = ['spring', 'summer', 'fall', 'winter'];
  let y = startYear;
  let currentSeasonIdx = seasonsOrder.indexOf(startSeason);
  let targetDay = startDay + durationDays;

  while (targetDay > 28) {
    targetDay -= 28;
    currentSeasonIdx++;
    if (currentSeasonIdx >= 4) {
      currentSeasonIdx = 0;
      y++;
    }
  }

  return {
    year: y,
    season: seasonsOrder[currentSeasonIdx],
    day: targetDay
  };
}

// Helper to convert hex to RGBA
function hexToRgba(hex, alpha) {
  let c = hex.substring(1);
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

// Master color map matching crop or machine dominant colors
const ITEM_COLORS = {
  // Spring crops
  'parsnip': '#dcd1b4',      // Light cream/yellowish white
  'potato': '#b38f6b',       // Brown
  'cauliflower': '#e9f5db',  // Cream white
  'kale': '#477a3d',         // Green
  'garlic': '#f2ebd9',       // Off-white
  'unmilled_rice': '#94a867',// Greenish gold
  'strawberry': '#e0284c',   // Red
  'rhubarb': '#be184a',      // Pinkish red
  'green_bean': '#4f802f',   // Dark green
  // Summer crops
  'melon': '#f43f5e',        // Coral pink
  'blueberry': '#1d4ed8',    // Royal blue
  'starfruit': '#ffc300',    // Golden yellow
  'corn': '#eab308',         // Yellow
  'hot_pepper': '#dc2626',   // Bright red
  'tomato': '#ea580c',       // Orange-red
  'radish': '#ec4899',       // Pink
  'red_cabbage': '#7c3aed',  // Purple
  'hops': '#84cc16',         // Lime green
  // Fall crops
  'pumpkin': '#ea580c',      // Orange
  'cranberry': '#991b1b',    // Wine red
  'grape': '#6d28d9',        // Dark violet
  'eggplant': '#4c1d95',     // Indigo/dark purple
  'amaranth': '#be185d',     // Magenta
  'artichoke': '#65a30d',    // Olive green
  'beet': '#881337',         // Deep crimson
  'bok_choy': '#a3e635',     // Bright green
  'sweetgem': '#6366f1',     // Indigo
  // Special
  'ancient': '#00a082',      // Teal cyan
  'pineapple': '#facc15',    // Bright yellow
  'taro': '#854d0e',         // Brownish green
  'coffee': '#78350f',       // Coffee brown
  // Trees
  'cherry': '#be123c',       // Cherry red
  'apricot': '#f97316',      // Apricot orange
  'orange': '#ea580c',       // Orange
  'peach': '#fda4af',        // Peach pink
  'apple': '#dc2626',        // Apple red
  'pomegranate': '#991b1b',  // Crimson red
  'banana': '#fef08a',       // Yellow
  'mango': '#facc15',        // Yellow-orange
  'mahogany': '#b45309',     // Hardwood amber brown
  'oak_tree': '#65a30d',     // Oak green
  'maple_tree': '#ea580c',   // Maple orange
  'pine_tree': '#059669',    // Pine green
  'mystic_tree': '#db2777',   // Mystic pink
  // Machines / yields
  'keg_wine': '#a21caf',     // Wine violet
  'keg_beer': '#b45309',     // Amber
  'preserves': '#be185d',    // Jelly red
  'cask_silver': '#94a3b8',  // Silver gray
  'cask_gold': '#fbbf24',    // Gold yellow
  'cask_iridium': '#c084fc', // Purple iridium
  'solar_panel': '#38bdf8',  // Sky blue battery
  'tapper_maple': '#f97316', // Maple orange
  'tapper_oak': '#84cc16',   // Oak amber/green
  'tapper_pine': '#10b981',  // Pine green
  'tapper_mushroom': '#a855f7', // Purple mushroom
  'tapper_mystic': '#ec4899', // Mystic pink
  'heavy_tapper_maple': '#ea580c', // Darker orange
  'heavy_tapper_oak': '#65a30d',   // Darker green
  'heavy_tapper_pine': '#059669',  // Darker teal
  'heavy_tapper_mushroom': '#9333ea', // Dark purple
  'heavy_tapper_mystic': '#db2777', // Dark pink
  'crystal_diamond': '#e0f2fe',
  'crystal_ruby': '#ef4444',
  'crystal_jade': '#059669',
  'crystal_emerald': '#10b981',
  'crystal_aquamarine': '#38bdf8',
  'crystal_topaz': '#f59e0b',
  'crystal_amethyst': '#a855f7'
};

function applyTaskItemColor(item, task) {
  if (!item || !task) return;
  let baseColor = '#94a3b8'; // Slate default
  if (task.type === 'plant') baseColor = '#22c55e'; // Green
  else if (task.type === 'harvest') baseColor = '#eab308'; // Yellow
  else if (task.type === 'keg') baseColor = '#a855f7'; // Purple
  else if (task.type === 'cask') baseColor = '#f97316'; // Orange
  else if (task.type === 'solar') baseColor = '#06b6d4'; // Cyan
  
  let imageKey = task.cropKey || task.machineKey;
  if (!imageKey) {
    if (!task.label) return;
    const cleanLabel = task.label.toLowerCase();
    for (const crop of MASTER_CROPS) {
      if (cleanLabel.includes(crop.name.toLowerCase())) {
        imageKey = crop.key;
        break;
      }
    }
    if (!imageKey) {
      if (cleanLabel.includes('solar panel') || cleanLabel.includes('battery')) imageKey = 'solar_panel';
      else if (cleanLabel.includes('wine')) imageKey = 'keg_wine';
      else if (cleanLabel.includes('beer')) imageKey = 'keg_beer';
      else if (cleanLabel.includes('preserves') || cleanLabel.includes('jelly')) imageKey = 'preserves';
      else if (cleanLabel.includes('cask')) {
        if (cleanLabel.includes('silver')) imageKey = 'cask_silver';
        else if (cleanLabel.includes('gold')) imageKey = 'cask_gold';
        else if (cleanLabel.includes('iridium')) imageKey = 'cask_iridium';
      }
    }
  }
  
  if (imageKey && ITEM_COLORS[imageKey]) {
    baseColor = ITEM_COLORS[imageKey];
  }

  const isStartTask = task.id && typeof task.id === 'string' && (task.id.startsWith('plant') || task.id.startsWith('load'));
  
  if (isStartTask) {
    item.classList.add('start-action-task');
    // Planting/Loading: Dashed border, darker muted background
    item.style.backgroundColor = 'rgba(24, 24, 37, 0.6)';
    item.style.borderColor = hexToRgba(baseColor, 0.45);
    item.style.borderStyle = 'dashed';
    item.style.borderWidth = '1.2px';
    item.style.opacity = '0.85';
  } else {
    item.classList.remove('start-action-task');
    // Harvesting/Ready: Solid thick border, vibrant colorful background
    item.style.backgroundColor = hexToRgba(baseColor, 0.22);
    item.style.borderColor = hexToRgba(baseColor, 0.85);
    item.style.borderStyle = 'solid';
    item.style.borderWidth = '1.5px';
    item.style.opacity = '1';
  }
  item.style.color = '#ffffff';
}

// Helper to get image URL for a task, fallback to parsing label text
function getTaskIconUrl(task) {
  if (!task) return null;
  let imageKey = task.cropKey || task.machineKey;
  
  if (!imageKey) {
    if (!task.label) return null;
    const cleanLabel = task.label.toLowerCase();
    for (const crop of MASTER_CROPS) {
      if (cleanLabel.includes(crop.name.toLowerCase())) {
        return CROP_IMAGES[crop.key];
      }
    }
    if (cleanLabel.includes('solar panel') || cleanLabel.includes('battery')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/2/25/Battery_Pack.png';
    }
    if (cleanLabel.includes('keg')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Keg.png';
    }
    if (cleanLabel.includes('preserves') || cleanLabel.includes('jelly')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/1/1e/Preserves_Jar.png';
    }
    if (cleanLabel.includes('cask')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png';
    }
    if (cleanLabel.includes('mystic syrup') || cleanLabel.includes('mystic')) {
      return 'https://stardewvalleywiki.com/Special:FilePath/Mystic_Syrup.png';
    }
    if (cleanLabel.includes('maple syrup')) {
      return 'https://stardewvalleywiki.com/Special:FilePath/Maple_Syrup.png';
    }
    if (cleanLabel.includes('oak resin')) {
      return 'https://stardewvalleywiki.com/Special:FilePath/Oak_Resin.png';
    }
    if (cleanLabel.includes('pine tar')) {
      return 'https://stardewvalleywiki.com/Special:FilePath/Pine_Tar.png';
    }
  } else {
    if (task.machineKey && task.machineKey.startsWith('crystal_') && task.id && typeof task.id === 'string' && task.id.includes('load')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/d/d4/Crystalarium.png';
    }
    if (task.machineKey && task.machineKey.startsWith('heavy_tapper_') && task.id && typeof task.id === 'string' && task.id.includes('load')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/0/0c/Heavy_Tapper.png';
    }
    if (task.machineKey && task.machineKey.startsWith('tapper_') && task.id && typeof task.id === 'string' && task.id.includes('load')) {
      return 'https://stardewvalleywiki.com/mediawiki/images/d/da/Tapper.png';
    }
    if (task.machineKey === 'solar_panel' && task.id && typeof task.id === 'string' && task.id.includes('ready')) {
       return 'https://stardewvalleywiki.com/mediawiki/images/2/25/Battery_Pack.png';
    }
    if (imageKey === 'mahogany' && task.label && (task.label.includes('Mature') || task.label.includes('Ready') || task.label.includes('Hardwood'))) {
      return CROP_IMAGES['hardwood'] || CROP_IMAGES['mahogany'];
    }
    if (CROP_IMAGES[imageKey]) return CROP_IMAGES[imageKey];
    if (MACHINE_IMAGES[imageKey]) return MACHINE_IMAGES[imageKey];
  }
  return null;
}

// Render Calendar Day Cards
function renderCalendar() {
  calendarGrid.innerHTML = '';
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentYearSchedule = getYearSchedule(currentYear);

  for (let day = 1; day <= 28; day++) {
    const weekdayName = weekdays[(day - 1) % 7];
    const card = document.createElement('div');
    
    const dayTasks = currentYearSchedule[currentSeason][day] || [];
    if (dayTasks.length > 0) {
      card.className = 'day-card has-tasks';
    } else {
      card.className = 'day-card empty-day';
    }
    
    card.dataset.day = day;

    card.innerHTML = `
      <div class="day-header">
        <span class="day-number">${day}</span>
        <span class="day-name">${weekdayName}</span>
        <button class="add-task-btn" onclick="openModal(${day}, event)">+</button>
      </div>
      <div class="tasks-container-compact" id="tasks-day-${day}">
        <div class="tasks-list ready-tasks" id="tasks-ready-${day}"></div>
        <div class="tasks-list plant-tasks" id="tasks-plant-${day}"></div>
      </div>
    `;

    // Tap card to toggle hover details popup on phone without opening modal GUI
    card.addEventListener('click', (e) => {
      if (e.target.closest('.checkmark-overlay') || e.target.closest('.task-delete') || e.target.closest('.add-task-btn') || e.target.closest('.task-icon-wrapper')) {
        return;
      }
      
      const wasActive = card.classList.contains('touch-hover-active');
      document.querySelectorAll('.day-card.touch-hover-active').forEach(c => c.classList.remove('touch-hover-active'));
      
      if (!wasActive && card.classList.contains('has-tasks')) {
        card.classList.add('touch-hover-active');
      }
    });

    calendarGrid.appendChild(card);
    renderTasksForDay(day);
  }
  setTimeout(adjustTaskFontSizes, 0);
}

// Render tasks within a day card
function renderTasksForDay(day) {
  const readyContainer = document.getElementById(`tasks-ready-${day}`);
  const plantContainer = document.getElementById(`tasks-plant-${day}`);
  if (readyContainer) readyContainer.innerHTML = '';
  if (plantContainer) plantContainer.innerHTML = '';
  
  const currentYearSchedule = getYearSchedule(currentYear);
  const dayTasks = currentYearSchedule[currentSeason][day] || [];

  dayTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.type}`;
    if (task.completed) {
      item.classList.add('task-completed');
    }
    applyTaskItemColor(item, task);
    
    const imgUrl = getTaskIconUrl(task);
    const isStartTask = task.id && typeof task.id === 'string' && (task.id.startsWith('plant') || task.id.startsWith('load'));
    const iconHtml = imgUrl ? (isStartTask ? `
      <img src="${imgUrl}" class="crop-icon" alt="" style="width: 20px; height: 20px; object-fit: contain; margin-right: 6px; vertical-align: middle; flex-shrink: 0;">
    ` : `
      <div class="task-icon-wrapper" onclick="toggleTaskCompleted(${day}, '${task.id}', event)">
        <img src="${imgUrl}" class="crop-icon" alt="" style="width: 100%; height: 100%; object-fit: contain; display: block;">
        <div class="checkmark-overlay">✓</div>
      </div>
    `) : '';
    
    const safeLabel = (task.label && typeof task.label === 'string') ? task.label : String(task.label || '');
    const lastIndex = safeLabel.lastIndexOf('(');
    let titleText = safeLabel;
    let subtitleText = '';
    if (lastIndex !== -1) {
      titleText = safeLabel.substring(0, lastIndex).trim();
      subtitleText = safeLabel.substring(lastIndex + 1).replace(')', '').trim();
    }
    
    // Clean starting emojis
    titleText = titleText.replace(/^[^\w\s]*\s*/, '');
    
    const subtitleHtml = subtitleText ? `<span class="task-subtitle" style="font-size: 0.7rem; opacity: 0.75; font-weight: normal; display: block; margin-top: 1px;">${subtitleText}</span>` : '';
    
    item.innerHTML = `
      <div style="display: flex; align-items: center; flex-grow: 1; min-width: 0;">
        ${iconHtml}
        <div class="task-text-container" style="display: flex; flex-direction: column; min-width: 0; text-align: left; line-height: 1.1;">
          <span style="font-weight: 600; word-break: break-word;">${titleText}</span>
          ${subtitleHtml}
        </div>
      </div>
      <button class="task-delete" onclick="deleteTask(${day}, '${task.id}', event)">×</button>
    `;

    if (isStartTask) {
      if (plantContainer) plantContainer.appendChild(item);
    } else {
      if (readyContainer) readyContainer.appendChild(item);
    }
  });

  if (!document.body.classList.contains('hide-task-labels')) {
    setTimeout(adjustTaskFontSizes, 0);
  }
}

// Modal handling
window.openModal = function(day, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  activeDay = day;
  modalTitle.innerText = `Year ${currentYear} - ${currentSeason.toUpperCase()} - Day ${day}`;
  
  const modalTasksSection = document.getElementById('modal-tasks-section');
  const modalTasksList = document.getElementById('modal-tasks-list');
  
  const currentYearSchedule = getYearSchedule(currentYear);
  const dayTasks = currentYearSchedule[currentSeason][day] || [];
  
  if (dayTasks.length > 0) {
    modalTasksSection.style.display = 'block';
    modalTasksList.innerHTML = '';
    dayTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.type}`;
      if (task.completed) {
        item.classList.add('task-completed');
      }
      applyTaskItemColor(item, task);
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.padding = '0.35rem 0.5rem';
      item.style.borderRadius = '6px';
      item.style.fontSize = '0.85rem';
      item.style.margin = '0.2rem 0';
      
      const imgUrl = getTaskIconUrl(task);
      const isStartTask = task.id && typeof task.id === 'string' && (task.id.startsWith('plant') || task.id.startsWith('load'));
      const iconHtml = imgUrl ? (isStartTask ? `
        <img src="${imgUrl}" class="crop-icon" alt="" style="width: 20px; height: 20px; object-fit: contain; margin-right: 6px; vertical-align: middle; flex-shrink: 0;">
      ` : `
        <div class="task-icon-wrapper" onclick="toggleTaskCompleted(${day}, '${task.id}', event)">
          <img src="${imgUrl}" class="crop-icon" alt="" style="width: 100%; height: 100%; object-fit: contain; display: block;">
          <div class="checkmark-overlay">✓</div>
        </div>
      `) : '';
      
      const safeLabel = (task.label && typeof task.label === 'string') ? task.label : String(task.label || '');
      const lastIndex = safeLabel.lastIndexOf('(');
      let titleText = safeLabel;
      let subtitleText = '';
      if (lastIndex !== -1) {
        titleText = safeLabel.substring(0, lastIndex).trim();
        subtitleText = safeLabel.substring(lastIndex + 1).replace(')', '').trim();
      }
      
      // Clean starting emojis
      titleText = titleText.replace(/^[^\w\s]*\s*/, '');
      
      const subtitleHtml = subtitleText ? `<span class="task-subtitle" style="font-size: 0.75rem; opacity: 0.75; font-weight: normal; display: block; margin-top: 2px;">${subtitleText}</span>` : '';
      
      item.innerHTML = `
        <div style="display: flex; align-items: center; min-width: 0;">
          ${iconHtml}
          <div class="task-text-container" style="display: flex; flex-direction: column; min-width: 0; text-align: left; line-height: 1.15;">
            <span style="font-weight: 600;">${titleText}</span>
            ${subtitleHtml}
          </div>
        </div>
        <button class="task-delete" onclick="deleteTask(${day}, '${task.id}', event)" style="background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 1.15rem; font-weight: bold; padding: 0 0.25rem; flex-shrink: 0; margin-left: 0.5rem;">×</button>
      `;
      modalTasksList.appendChild(item);
    });
  } else {
    modalTasksSection.style.display = 'none';
  }
  
  modalOverlay.style.display = 'flex';
};

function closeModal() {
  modalOverlay.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Schedule Manual Note
document.getElementById('form-manual').addEventListener('submit', (e) => {
  e.preventDefault();
  const label = document.getElementById('manual-label').value.trim() || document.getElementById('manual-label').value;
  if (!label) return;

  const task = {
    id: 'man_' + Date.now(),
    type: 'manual',
    label: label
  };

  const currentYearSchedule = getYearSchedule(currentYear);
  if (!currentYearSchedule[currentSeason][activeDay]) currentYearSchedule[currentSeason][activeDay] = [];
  currentYearSchedule[currentSeason][activeDay].push(task);
  
  saveSchedule();
  renderTasksForDay(activeDay);
  closeModal();
  document.getElementById('manual-label').value = '';
});

// Helper to determine if a crop is viable to grow on the Main Farm in a target season
function canGrowInSeason(cropKey, targetSeason) {
  const wildTrees = ['mahogany', 'oak_tree', 'maple_tree', 'pine_tree', 'mystic_tree'];
  if (wildTrees.includes(cropKey)) {
    return true; // Wild trees and Mahogany survive & grow in all seasons
  }

  // Ancient Fruit grows in Spring, Summer, Fall
  if (cropKey === 'ancient') {
    return ['spring', 'summer', 'fall'].includes(targetSeason);
  }
  // Coffee grows in Spring and Summer
  if (cropKey === 'coffee') {
    return ['spring', 'summer'].includes(targetSeason);
  }
  // Corn grows in Summer and Fall
  if (cropKey === 'corn') {
    return ['summer', 'fall'].includes(targetSeason);
  }
  
  // Find from MASTER_CROPS
  const crop = MASTER_CROPS.find(c => c.key === cropKey);
  if (!crop) return false;
  
  // For wild trees or all-season trees
  if (crop.isTree && (crop.isWildTree || crop.activeSeason === 'all')) {
    return true;
  }

  // For fruit trees
  if (crop.isTree) {
    return crop.activeSeason === targetSeason;
  }
  
  // Standard single-season crops
  return crop.season === targetSeason;
}

// Schedule Crop Planting
document.getElementById('form-crop').addEventListener('submit', (e) => {
  e.preventDefault();
  const cropKey = document.getElementById('crop-select').value;
  const fertilizer = document.getElementById('crop-fert').value;
  const location = document.getElementById('crop-loc').value;
  const cropStage = document.getElementById('crop-stage').value;
  const crop = CROP_GROWTH_PRESETS[cropKey];
  
  if (cropStage === 'regrow' && crop.regrow === 0) {
    alert(`❌ ${crop.name} is a single-harvest crop and does not support regrow cycles.`);
    return;
  }

  const groupId = 'crop_group_' + Date.now();
  const plantAbs = getAbsoluteDay(currentYear, currentSeason, activeDay);

  // 1. Save the planting/regrow-start task
  const plantTask = {
    id: 'plant_' + Date.now(),
    type: 'plant',
    cropKey: cropKey,
    fertilizer: fertilizer,
    location: location,
    stage: cropStage,
    label: cropStage === 'regrow' 
      ? (crop.isTree ? `🌳 Mature Tree: ${crop.name} (${location})` : `🌱 Regrow Start: ${crop.name} (${location})`) 
      : (crop.key === 'mahogany' ? `🪵 Mahogany Seed Planted (${location})` : (crop.isTree ? `🌳 ${crop.name} Planted (${location})` : `🌱 ${crop.name} Planted (${location})`)),
    groupId: groupId,
    absDay: plantAbs
  };

  const currentYearSchedule = getYearSchedule(currentYear);
  if (!currentYearSchedule[currentSeason][activeDay]) currentYearSchedule[currentSeason][activeDay] = [];
  currentYearSchedule[currentSeason][activeDay].push(plantTask);

  // 2. Save future harvest & regrow tasks
  const growthDays = cropStage === 'regrow' ? 0 : crop.getDays(fertilizer, false);
  const firstHarvestDelay = growthDays + (cropStage === 'regrow' ? crop.regrow : 0);
  
  let harvestDate = getFutureDate(currentYear, currentSeason, activeDay, firstHarvestDelay);
  let harvestAbs = getAbsoluteDay(harvestDate.year, harvestDate.season, harvestDate.day);

  function addStaticTask(date, task) {
    const ys = getYearSchedule(date.year);
    if (!ys[date.season][date.day]) ys[date.season][date.day] = [];
    ys[date.season][date.day].push(task);
  }

  // First Harvest Task
  const firstHarvestTask = {
    id: 'harvest_' + Date.now(),
    type: 'harvest',
    cropKey: cropKey,
    label: crop.key === 'mahogany'
      ? `🪵 Mahogany Tree Mature (Hardwood) (${location})`
      : (crop.isTree ? `🌳 ${crop.name} Ready (${location})` : `🌾 ${crop.name} Ready (${location})`),
    groupId: groupId,
    absDay: harvestAbs
  };

  let shouldAddFirst = true;
  if ((location === 'Main Farm' || location === 'Train Station') && !canGrowInSeason(cropKey, harvestDate.season)) {
    shouldAddFirst = false;
  }
  if (shouldAddFirst) {
    addStaticTask(harvestDate, firstHarvestTask);
  }

  // Regrows (for multi-harvest crops or trees)
  const regrowInterval = crop.regrow;
  if (regrowInterval > 0) {
    // For normal crops on Main Farm, if the first harvest was invalid, they died and won't regrow
    const canRegrow = crop.isTree || shouldAddFirst;
    
    if (canRegrow) {
      let nextHarvestDate = getFutureDate(harvestDate.year, harvestDate.season, harvestDate.day, regrowInterval);
      // Schedule up to 60 regrows (approx 4 years of harvests)
      for (let i = 0; i < 60; i++) {
        const nextHarvestAbs = getAbsoluteDay(nextHarvestDate.year, nextHarvestDate.season, nextHarvestDate.day);
        const regrowTask = {
          id: 'harvest_regrow_' + Date.now() + '_' + i,
          type: 'harvest',
          cropKey: cropKey,
          label: crop.isTree 
            ? `🌳 ${crop.name} Ready (${location})`
            : `🌾 ${crop.name} Ready (Regrow - ${location})`,
          groupId: groupId,
          absDay: nextHarvestAbs
        };

        let shouldAddRegrow = true;
        if ((location === 'Main Farm' || location === 'Train Station') && !canGrowInSeason(cropKey, nextHarvestDate.season)) {
          if (!crop.isTree) {
            // Normal crops die on the Main Farm when their season ends, stopping future years
            break;
          } else {
            shouldAddRegrow = false;
          }
        }

        if (shouldAddRegrow) {
          addStaticTask(nextHarvestDate, regrowTask);
        }

        nextHarvestDate = getFutureDate(nextHarvestDate.year, nextHarvestDate.season, nextHarvestDate.day, regrowInterval);
      }
    }
  }

  saveSchedule();
  renderCalendar();
  closeModal();
});

// Schedule Machine Loading
document.getElementById('form-machine').addEventListener('submit', (e) => {
  e.preventDefault();
  const machineKey = document.getElementById('machine-select').value;
  const location = document.getElementById('machine-loc').value;
  const preset = MACHINE_PRESETS[machineKey];
  const groupId = 'machine_group_' + Date.now();
  const loadAbs = getAbsoluteDay(currentYear, currentSeason, activeDay);

  // 1. Add Load/Place Task to selected day
  const isSolar = machineKey === 'solar_panel';
  const isCrystal = machineKey.startsWith('crystal_');
  const isTapper = machineKey.startsWith('tapper_') || machineKey.startsWith('heavy_tapper_');
  const isPlaceAction = isSolar || isCrystal || isTapper;
  
  const loadTask = {
    id: 'load_' + Date.now(),
    type: isPlaceAction ? 'solar' : (machineKey.includes('keg') ? 'keg' : 'cask'),
    machineKey: machineKey,
    label: isPlaceAction ? `📥 ${preset.name} Placed (${location})` : `📥 ${preset.name} Loaded (${location})`,
    groupId: groupId,
    absDay: loadAbs
  };
  const currentYearSchedule = getYearSchedule(currentYear);
  if (!currentYearSchedule[currentSeason][activeDay]) currentYearSchedule[currentSeason][activeDay] = [];
  currentYearSchedule[currentSeason][activeDay].push(loadTask);

  // Determine location-sensitive machine duration (e.g. Solar Panel: 7d in Desert/Island vs 10d in Valley)
  const duration = (typeof preset.getDuration === 'function') ? preset.getDuration(location) : preset.duration;

  // 2. Add Ready Task to future day
  const readyDate = getFutureDate(currentYear, currentSeason, activeDay, duration);
  const readyAbs = getAbsoluteDay(readyDate.year, readyDate.season, readyDate.day);
  const readyTask = {
    id: 'ready_' + Date.now(),
    type: isPlaceAction ? 'solar' : (machineKey.includes('keg') ? 'keg' : 'cask'),
    machineKey: machineKey,
    label: `📦 ${preset.name} Ready (${location})`,
    sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`,
    groupId: groupId,
    absDay: readyAbs
  };
  
  const targetYearSchedule = getYearSchedule(readyDate.year);
  if (!targetYearSchedule[readyDate.season][readyDate.day]) targetYearSchedule[readyDate.season][readyDate.day] = [];
  targetYearSchedule[readyDate.season][readyDate.day].push(readyTask);

  // 3. If repeating machine (Solar Panel or Crystalariums), schedule repeating yields indefinitely
  if (preset.isRepeating) {
    let nextReadyDate = getFutureDate(readyDate.year, readyDate.season, readyDate.day, duration);
    for (let i = 0; i < 60; i++) {
      const nextReadyAbs = getAbsoluteDay(nextReadyDate.year, nextReadyDate.season, nextReadyDate.day);
      const repeatTask = {
        id: 'ready_repeat_' + Date.now() + '_' + i,
        type: isPlaceAction ? 'solar' : (machineKey.includes('keg') ? 'keg' : 'cask'),
        machineKey: machineKey,
        label: `📦 ${preset.name} Ready (${location})`,
        sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`,
        groupId: groupId,
        absDay: nextReadyAbs
      };
      const ys = getYearSchedule(nextReadyDate.year);
      if (!ys[nextReadyDate.season][nextReadyDate.day]) ys[nextReadyDate.season][nextReadyDate.day] = [];
      ys[nextReadyDate.season][nextReadyDate.day].push(repeatTask);
      
      nextReadyDate = getFutureDate(nextReadyDate.year, nextReadyDate.season, nextReadyDate.day, duration);
    }
  }

  saveSchedule();
  
  // Auto-switch view to the target season/year so the user sees the ready task immediately
  if (readyDate.year !== currentYear) {
    currentYear = readyDate.year;
    localStorage.setItem('stardew_current_year', currentYear);
    document.getElementById('year-display').innerText = currentYear;
  }
  if (readyDate.season !== currentSeason) {
    switchSeason(readyDate.season);
  } else {
    renderCalendar();
  }
  
  closeModal();
});

// Auto-select Desert location when choosing Solar Panel
document.getElementById('machine-select').addEventListener('change', function() {
  if (this.value === 'solar_panel') {
    document.getElementById('machine-loc').value = 'Desert';
  }
});

// Delete task (supports cascade delete on threads from the clicked point forward)
window.deleteTask = function(day, id, event) {
  event.stopPropagation(); // Avoid opening modal when clicking delete
  
  const currentYearSchedule = getYearSchedule(currentYear);
  const list = currentYearSchedule[currentSeason][day] || [];
  const taskToDelete = list.find(t => t.id === id);
  
  if (taskToDelete && taskToDelete.groupId) {
    const targetGroupId = taskToDelete.groupId;
    const cutoffAbs = taskToDelete.absDay || 0;
    
    // Cascade delete across all years, seasons, and days for tasks with the same groupId that are on or after cutoffAbs
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    Object.keys(schedule).forEach(y => {
      if (isNaN(y)) return;
      seasons.forEach(s => {
        if (!schedule[y] || !schedule[y][s]) return;
        for (let d = 1; d <= 28; d++) {
          if (schedule[y][s][d]) {
            schedule[y][s][d] = schedule[y][s][d].filter(t => {
              if (t.groupId === targetGroupId) {
                // Delete it if it is on or after the cutoff day
                return t.absDay < cutoffAbs;
              }
              return true;
            });
          }
        }
      });
    });
  } else {
    // Standard individual delete
    currentYearSchedule[currentSeason][day] = list.filter(t => t.id !== id);
  }
  
  saveSchedule();
  renderCalendar();
  
  // If deletion occurred from within the modal list, refresh it
  if (modalOverlay.style.display === 'flex') {
    openModal(activeDay);
  }
};

// Season selection helper
function switchSeason(newSeason) {
  currentSeason = newSeason;
  localStorage.setItem('stardew_current_season', currentSeason);
  
  // Update button active states
  seasonBtns.forEach(btn => {
    if (btn.dataset.season === currentSeason) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderCalendar();
}

// Season selection events
seasonBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchSeason(btn.dataset.season);
  });
});

// Set active season button on load
seasonBtns.forEach(btn => {
  if (btn.dataset.season === currentSeason) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
});

// Keyboard Navigation (Arrow keys toggle between seasons and transition years)
window.addEventListener('keydown', (e) => {
  // Prevent switching if user is actively typing in inputs
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    return;
  }

  const seasons = ['spring', 'summer', 'fall', 'winter'];
  let currentIdx = seasons.indexOf(currentSeason);

  if (e.key === 'ArrowRight') {
    if (currentIdx === 3) { // Winter -> Spring (Next Year)
      currentYear++;
      yearDisplay.innerText = currentYear;
      localStorage.setItem('stardew_current_year', currentYear);
      saveSchedule();
      switchSeason('spring');
    } else {
      switchSeason(seasons[currentIdx + 1]);
    }
  } else if (e.key === 'ArrowLeft') {
    if (currentIdx === 0) { // Spring -> Winter (Previous Year)
      if (currentYear > 1) {
        currentYear--;
        yearDisplay.innerText = currentYear;
        localStorage.setItem('stardew_current_year', currentYear);
        saveSchedule();
        switchSeason('winter');
      }
    } else {
      switchSeason(seasons[currentIdx - 1]);
    }
  }
});

// Year selection events
yearUpBtn.addEventListener('click', () => {
  currentYear++;
  yearDisplay.innerText = currentYear;
  localStorage.setItem('stardew_current_year', currentYear);
  saveSchedule(); // Persist newly initialized year structure
  renderCalendar();
});

yearDownBtn.addEventListener('click', () => {
  if (currentYear > 1) {
    currentYear--;
    yearDisplay.innerText = currentYear;
    localStorage.setItem('stardew_current_year', currentYear);
    saveSchedule();
    renderCalendar();
  }
});

// Dynamic shrink-to-fit text scaling inside narrow day columns
function adjustTaskFontSizes() {
  if (document.body.classList.contains('hide-task-labels')) return;

  const taskItems = document.querySelectorAll('.calendar-grid .task-item');
  taskItems.forEach(item => {
    const textContainer = item.querySelector('.task-text-container');
    if (!textContainer) return;
    
    const span = textContainer.querySelector('span');
    if (!span) return;
    
    // Reset inline styles to read natural layout dimensions
    span.style.fontSize = '';
    span.style.whiteSpace = 'nowrap';
    span.style.display = 'inline-block';
    
    const parentWidth = textContainer.clientWidth;
    if (parentWidth <= 0) return;
    
    let fontSize = 11; // Base starting px size
    span.style.fontSize = `${fontSize}px`;
    
    // Shrink text step-by-step until it fits within the column width
    while (span.scrollWidth > parentWidth && fontSize > 6) {
      fontSize -= 0.5;
      span.style.fontSize = `${fontSize}px`;
    }
    
    // If it still does not fit at the minimum readable size (6px), wrap normally
    if (span.scrollWidth > parentWidth) {
      span.style.whiteSpace = 'normal';
    }
    
    // Auto-scale subtitle location details proportionally
    const subtitle = textContainer.querySelector('.task-subtitle');
    if (subtitle) {
      subtitle.style.fontSize = '';
      let subFontSize = Math.max(5.5, fontSize * 0.85);
      subtitle.style.fontSize = `${subFontSize}px`;
    }
  });
}

// Bind resize listener to adjust font sizes on window resize
window.addEventListener('resize', adjustTaskFontSizes);

// Init
renderCalendar();
initFirebase();

// Label Visibility Toggle Init
const btnToggleLabels = document.getElementById('btn-toggle-labels');
const labelToggleIcon = document.getElementById('label-toggle-icon');
const labelToggleText = document.getElementById('label-toggle-text');

function setLabelsVisibility(show) {
  localStorage.setItem('stardew_show_labels', show);
  if (show) {
    document.body.classList.remove('hide-task-labels');
    if (labelToggleIcon) labelToggleIcon.innerText = '👁️';
    if (labelToggleText) labelToggleText.innerText = 'Labels: On';
    setTimeout(adjustTaskFontSizes, 0);
  } else {
    document.body.classList.add('hide-task-labels');
    if (labelToggleIcon) labelToggleIcon.innerText = '👓';
    if (labelToggleText) labelToggleText.innerText = 'Labels: Hover';
    
    // Clear inline style overrides so hover popouts use full CSS text sizing
    const taskSpans = document.querySelectorAll('.task-text-container span');
    taskSpans.forEach(span => {
      span.style.fontSize = '';
      span.style.whiteSpace = '';
      span.style.display = '';
    });
    const taskSubtitles = document.querySelectorAll('.task-subtitle');
    taskSubtitles.forEach(sub => {
      sub.style.fontSize = '';
    });
  }
}

if (btnToggleLabels) {
  btnToggleLabels.addEventListener('click', () => {
    const isCurrentlyShowing = localStorage.getItem('stardew_show_labels') === 'true';
    setLabelsVisibility(!isCurrentlyShowing);
  });
}

// Initial state load (defaults to collapsed/hover for tidy look)
const savedShowLabels = localStorage.getItem('stardew_show_labels');
setLabelsVisibility(savedShowLabels === 'true');

function isScheduleEmpty() {
  if (!schedule) return true;
  const years = Object.keys(schedule);
  if (years.length === 0) return true;
  const seasons = ['spring', 'summer', 'fall', 'winter'];
  let hasTasks = false;
  years.forEach(y => {
    if (isNaN(y)) return;
    seasons.forEach(s => {
      if (!schedule[y] || !schedule[y][s]) return;
      for (let d = 1; d <= 28; d++) {
        if (schedule[y][s][d] && schedule[y][s][d].length > 0) {
          hasTasks = true;
        }
      }
    });
  });
  return !hasTasks;
}

function isRemoteScheduleEmpty(remoteSched) {
  if (!remoteSched) return true;
  const years = Object.keys(remoteSched);
  if (years.length === 0) return true;
  const seasons = ['spring', 'summer', 'fall', 'winter'];
  let hasTasks = false;
  years.forEach(y => {
    if (isNaN(y)) return;
    seasons.forEach(s => {
      if (!remoteSched[y] || !remoteSched[y][s]) return;
      for (let d = 1; d <= 28; d++) {
        if (remoteSched[y][s][d] && remoteSched[y][s][d].length > 0) {
          hasTasks = true;
        }
      }
    });
  });
  return !hasTasks;
}


// ==========================================================================
// PERFECTION TRACKER CLOUD SYNC & STORAGE HELPERS
// ==========================================================================
const INITIAL_MUSEUM_DONATIONS = {
  "mus_opal": true, "mus_kyanite": true, "mus_jasper": true, "mus_ornamental_fan": true, 
  "mus_obsidian": true, "mus_trilobite": true, "mus_nekoite": true, "mus_orpiment": true, 
  "mus_chipped_amphora": true, "mus_dried_starfish": true, "mus_ancient_drum": true, 
  "mus_emerald": true, "mus_dinosaur_egg": true, "mus_dwarf_scroll_i": true, 
  "mus_dwarf_scroll_ii": true, "mus_dwarf_scroll_iii": true, "mus_dwarf_scroll_iv": true, 
  "mus_ancient_doll": true, "mus_chewing_stick": true, "mus_rare_disc": true, 
  "mus_rusty_spoon": true, "mus_rusty_spur": true, "mus_rusty_cog": true, 
  "mus_chicken_statue": true, "mus_ancient_seed": true, "mus_prehistoric_tool": true, 
  "mus_anchor": true, "mus_bone_flute": true, "mus_dwarvish_helm": true, 
  "mus_dwarf_gadget": true, "mus_strange_doll_(yellow)": true, "mus_prehistoric_tibia": true, 
  "mus_prehistoric_rib": true, "mus_skeletal_tail": true, "mus_nautilus_fossil": true, 
  "mus_amphibian_fossil": true, "mus_quartz": true, "mus_earth_crystal": true, 
  "mus_frozen_tear": true, "mus_fire_quartz": true, "mus_aquamarine": true, 
  "mus_ruby": true, "mus_amethyst": true, "mus_topaz": true, "mus_jade": true, 
  "mus_diamond": true, "mus_prismatic_shard": true, "mus_alamite": true, 
  "mus_calcite": true, "mus_dolomite": true, "mus_esperite": true, "mus_geminite": true, 
  "mus_jamborite": true, "mus_jagoite": true, "mus_lunarite": true, "mus_malachite": true, 
  "mus_petrified_slime": true, "mus_thunder_egg": true, "mus_ocean_stone": true, 
  "mus_celestine": true, "mus_granite": true, "mus_basalt": true, "mus_limestone": true, 
  "mus_star_shards": true
};

function getTrackerState(sheetKey) {
  try {
    const raw = localStorage.getItem(`stardew_tracker_${sheetKey}`);
    if (!raw) {
      if (sheetKey === 'museum') {
        localStorage.setItem('stardew_tracker_museum', JSON.stringify(INITIAL_MUSEUM_DONATIONS));
        return { ...INITIAL_MUSEUM_DONATIONS };
      }
      return {};
    }
    return JSON.parse(raw) || {};
  } catch {
    return sheetKey === 'museum' ? { ...INITIAL_MUSEUM_DONATIONS } : {};
  }
}

function getAllLocalTrackerState() {
  const sheets = ['shipped', 'crafting', 'cooking', 'fish', 'museum', 'walnuts', 'villagers'];
  const allTracker = {};
  sheets.forEach(s => {
    allTracker[s] = getTrackerState(s);
  });
  return allTracker;
}

function getLocalTrackerCheckedCount(stateObj) {
  let count = 0;
  if (!stateObj) return 0;
  Object.keys(stateObj).forEach(s => {
    if (stateObj[s] && typeof stateObj[s] === 'object') {
      count += Object.values(stateObj[s]).filter(Boolean).length;
    }
  });
  return count;
}

function saveTrackerStateToCloud() {
  const lastUpdated = Date.now();
  localStorage.setItem('stardew_tracker_last_updated', lastUpdated);
  
  if (firebaseDb && syncKey) {
    const allTracker = getAllLocalTrackerState();
    firebaseDb.ref(`stardew_tracker/${syncKey}`).set({
      data: allTracker,
      lastUpdated: lastUpdated
    }).catch(err => console.warn("Firebase tracker save error:", err));
  }
}

function setTrackerItemState(sheetKey, itemId, isObtained) {
  const state = getTrackerState(sheetKey);
  state[itemId] = isObtained;
  localStorage.setItem(`stardew_tracker_${sheetKey}`, JSON.stringify(state));
  saveTrackerStateToCloud();
}

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      const dbUrlToUse = "https://jeycub-stardew-farm-calendar-default-rtdb.firebaseio.com/";
      const config = {
        databaseURL: dbUrlToUse
      };
      
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      firebaseDb = firebase.database();
      
      // Use subdomain as sync key (e.g. 'jeycubb' from 'jeycubb.github.io')
      syncKey = window.location.hostname.split('.')[0] || 'default_local';
      // Sanitize syncKey (Firebase paths cannot contain '.', '#', '$', '[', or ']')
      syncKey = syncKey.replace(/[\.#\$\[\]]/g, '_');

      // 1. Listen for Calendar schedule remote updates
      firebaseDb.ref(`stardew_calendar/${syncKey}`).on('value', snapshot => {
        const data = snapshot.val();
        if (data && data.schedule) {
          const localLastUpdated = parseInt(localStorage.getItem('stardew_last_updated')) || 0;
          const remoteLastUpdated = data.lastUpdated || 0;

          const localEmpty = isScheduleEmpty();
          const remoteEmpty = isRemoteScheduleEmpty(data.schedule);

          if (localEmpty && !remoteEmpty) {
            // Local is empty, remote has tasks. ALWAYS pull remote data!
            schedule = data.schedule;
            localStorage.setItem('stardew_schedule', JSON.stringify(schedule));
            localStorage.setItem('stardew_last_updated', remoteLastUpdated);
            renderCalendar();
          } else if (!localEmpty && remoteEmpty) {
            // Local has tasks, remote is empty. ALWAYS push local data!
            saveSchedule();
          } else if (remoteLastUpdated > localLastUpdated) {
            // Remote data is newer, apply it
            schedule = data.schedule;
            localStorage.setItem('stardew_schedule', JSON.stringify(schedule));
            localStorage.setItem('stardew_last_updated', remoteLastUpdated);
            renderCalendar();
          } else if (localLastUpdated > remoteLastUpdated) {
            // Local data is newer, push to cloud
            saveSchedule();
          }
        } else {
          // No remote data yet, push local data to initialize it (only if local is not empty)
          if (!isScheduleEmpty()) {
            saveSchedule();
          }
        }
      }, err => {
        console.warn("Firebase sync failed or database URL incorrect");
      });

      // 2. Listen for Perfection Tracker remote updates (Auto-syncs across devices)
      firebaseDb.ref(`stardew_tracker/${syncKey}`).on('value', snapshot => {
        const trackerNode = snapshot.val();
        const localTracker = getAllLocalTrackerState();
        const localChecked = getLocalTrackerCheckedCount(localTracker);
        const localLastUpdated = parseInt(localStorage.getItem('stardew_tracker_last_updated')) || 0;

        if (!trackerNode || !trackerNode.data) {
          // Remote tracker is empty. If this device has progress (e.g. laptop with 117 items), UPLOAD TO CLOUD!
          if (localChecked > 0) {
            saveTrackerStateToCloud();
          }
          return;
        }

        const remoteData = trackerNode.data;
        const remoteLastUpdated = trackerNode.lastUpdated || 0;
        // Intelligent Union Merge:
        // Always take the superset of checked items so progress is NEVER lost on any device!
        const sheets = ['shipped', 'crafting', 'cooking', 'fish', 'museum', 'walnuts', 'villagers'];
        let hasNewData = false;
        
        sheets.forEach(s => {
          const localSheet = localTracker[s] || {};
          const remoteSheet = remoteData[s] || {};
          
          // Union merge: keep true if either local or remote has true
          const mergedSheet = { ...localSheet };
          Object.keys(remoteSheet).forEach(k => {
            if (remoteSheet[k]) {
              if (!mergedSheet[k]) hasNewData = true;
              mergedSheet[k] = true;
            }
          });

          localStorage.setItem(`stardew_tracker_${s}`, JSON.stringify(mergedSheet));
        });

        localStorage.setItem('stardew_tracker_last_updated', Math.max(Date.now(), remoteLastUpdated));

        // Re-render tracker UI immediately
        if (typeof renderTrackerSheet === 'function' && document.getElementById('tracker-main-view')) {
          renderTrackerSheet();
        }

        // If this device has local progress that cloud doesn't have yet, push superset to cloud
        if (localChecked > remoteChecked) {
          saveTrackerStateToCloud();
        }
      }, err => {
        console.warn("Firebase tracker sync failed:", err);
      });
    }
  } catch (e) {
    console.warn("Firebase initialization failed:", e);
  }
}

// Settings / Items Manager DOM Elements
const cropManagerOverlay = document.getElementById('crop-manager-overlay');
const cropManagerClose = document.getElementById('crop-manager-close');
const cropSearchInput = document.getElementById('crop-search-input');
const cropManagerList = document.getElementById('crop-manager-list');
const btnManageCrops = document.getElementById('btn-manage-crops');
const btnManageMachines = document.getElementById('btn-manage-machines');
const tabBtnCrops = document.getElementById('tab-btn-crops');
const tabBtnMachines = document.getElementById('tab-btn-machines');
const managerTitle = document.getElementById('manager-title');

let activeManagerTab = 'crops'; // 'crops' or 'machines'

const DEFAULT_ACTIVE_CROPS = [
  'starfruit', 'ancient', 'strawberry', 'rhubarb', 'blueberry', 'sweetgem', 
  'cherry', 'apricot', 'orange', 'peach', 'apple', 'pomegranate', 'banana', 'mango',
  'mahogany', 'oak_tree', 'maple_tree', 'pine_tree', 'mystic_tree'
];

const DEFAULT_ACTIVE_MACHINES = [
  'keg_wine', 'keg_beer', 'preserves', 'cask_silver', 'cask_gold', 'cask_iridium', 'solar_panel',
  'tapper_maple', 'tapper_oak', 'tapper_pine', 'tapper_mushroom', 'tapper_mystic',
  'heavy_tapper_maple', 'heavy_tapper_oak', 'heavy_tapper_pine', 'heavy_tapper_mushroom', 'heavy_tapper_mystic',
  'crystal_diamond', 'crystal_ruby', 'crystal_jade', 'crystal_emerald', 'crystal_aquamarine', 'crystal_topaz', 'crystal_amethyst'
];

// Populate crop select field based on active list
function populateCropDropdown() {
  let activeKeys = JSON.parse(localStorage.getItem('stardew_active_crops')) || DEFAULT_ACTIVE_CROPS;
  // Ensure new tree options are automatically included
  ['mahogany', 'oak_tree', 'maple_tree', 'pine_tree', 'mystic_tree'].forEach(k => {
    if (!activeKeys.includes(k)) activeKeys.push(k);
  });
  localStorage.setItem('stardew_active_crops', JSON.stringify(activeKeys));

  const select = document.getElementById('crop-select');
  if (!select) return;
  select.innerHTML = '';
  
  const activeCrops = MASTER_CROPS.filter(c => activeKeys.includes(c.key));
  activeCrops.forEach(c => {
    const option = document.createElement('option');
    option.value = c.key;
    let label = c.name;
    if (c.key === 'mahogany') {
      label += ` (26d / 7d Tree Fert, ALL SEASONS)`;
    } else if (c.isWildTree) {
      label += ` (${c.base}d / 5d Tree Fert, ALL SEASONS)`;
    } else if (c.isTree) {
      label += ` (${c.base}d, ${c.activeSeason.toUpperCase()})`;
    } else {
      label += ` (${c.base}d`;
      if (c.regrow > 0) label += ` + ${c.regrow}d regrow`;
      label += `)`;
    }
    option.innerText = label;
    select.appendChild(option);
  });
}

// Populate machine select field based on active list
function populateMachineDropdown() {
  const activeKeys = JSON.parse(localStorage.getItem('stardew_active_machines')) || DEFAULT_ACTIVE_MACHINES;
  const select = document.getElementById('machine-select');
  if (!select) return;
  select.innerHTML = '';
  
  const activeMachines = MASTER_MACHINES.filter(m => activeKeys.includes(m.key));
  activeMachines.forEach(m => {
    const option = document.createElement('option');
    option.value = m.key;
    let label = m.name;
    if (m.key === 'solar_panel') {
      label += ` (7d Desert / 10d Valley repeating)`;
    } else {
      label += ` (${m.duration}d`;
      if (m.isRepeating) label += ` repeating`;
      label += `)`;
    }
    option.innerText = label;
    select.appendChild(option);
  });
}

// Initial populate
populateCropDropdown();
populateMachineDropdown();

// Render selector list inside Settings Manager Modal
function renderManagerList() {
  const query = cropSearchInput.value.toLowerCase().trim();
  cropManagerList.innerHTML = '';
  
  if (activeManagerTab === 'crops') {
    const activeKeys = JSON.parse(localStorage.getItem('stardew_active_crops')) || DEFAULT_ACTIVE_CROPS;
    const filtered = MASTER_CROPS.filter(c => c.name.toLowerCase().includes(query) || c.type.toLowerCase().includes(query));
    
    filtered.forEach(c => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'space-between';
      div.style.padding = '0.35rem 0.5rem';
      div.style.background = 'rgba(255,255,255,0.02)';
      div.style.borderRadius = '6px';
      div.style.border = '1px solid rgba(255,255,255,0.05)';
      div.style.marginBottom = '0.35rem';
      
      const isChecked = activeKeys.includes(c.key) ? 'checked' : '';
      const imgUrl = CROP_IMAGES[c.key] || '';
      const imgHtml = imgUrl ? `<img src="${imgUrl}" style="width: 20px; height: 20px; object-fit: contain; margin-right: 8px; vertical-align: middle;">` : '';
      
      div.innerHTML = `
        <div style="display: flex; align-items: center; color: var(--text-main); font-size: 0.9rem;">
          ${imgHtml}
          <span>${c.name} <span style="font-size: 0.75rem; color: var(--text-muted);">(${c.type})</span></span>
        </div>
        <input type="checkbox" class="crop-select-checkbox" data-key="${c.key}" ${isChecked} style="width: 18px; height: 18px; cursor: pointer;">
      `;
      cropManagerList.appendChild(div);
    });
  } else {
    // Machines Tab
    const activeKeys = JSON.parse(localStorage.getItem('stardew_active_machines')) || DEFAULT_ACTIVE_MACHINES;
    const filtered = MASTER_MACHINES.filter(m => m.name.toLowerCase().includes(query) || m.type.toLowerCase().includes(query));
    
    filtered.forEach(m => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'space-between';
      div.style.padding = '0.35rem 0.5rem';
      div.style.background = 'rgba(255,255,255,0.02)';
      div.style.borderRadius = '6px';
      div.style.border = '1px solid rgba(255,255,255,0.05)';
      div.style.marginBottom = '0.35rem';
      
      const isChecked = activeKeys.includes(m.key) ? 'checked' : '';
      const imgUrl = MACHINE_IMAGES[m.key] || '';
      const imgHtml = imgUrl ? `<img src="${imgUrl}" style="width: 20px; height: 20px; object-fit: contain; margin-right: 8px; vertical-align: middle;">` : '';
      
      div.innerHTML = `
        <div style="display: flex; align-items: center; color: var(--text-main); font-size: 0.9rem;">
          ${imgHtml}
          <span>${m.name} <span style="font-size: 0.75rem; color: var(--text-muted);">(${m.type})</span></span>
        </div>
        <input type="checkbox" class="machine-select-checkbox" data-key="${m.key}" ${isChecked} style="width: 18px; height: 18px; cursor: pointer;">
      `;
      cropManagerList.appendChild(div);
    });
  }
}

// Switch Tab logic
function switchManagerTab(tab) {
  activeManagerTab = tab;
  cropSearchInput.value = '';
  
  if (tab === 'crops') {
    tabBtnCrops.classList.add('active');
    tabBtnMachines.classList.remove('active');
    managerTitle.innerText = '⚙️ Manage Crops list';
    cropSearchInput.placeholder = 'Search crops (e.g. Starfruit, Ancient)...';
  } else {
    tabBtnCrops.classList.remove('active');
    tabBtnMachines.classList.add('active');
    managerTitle.innerText = '⚙️ Manage Machines list';
    cropSearchInput.placeholder = 'Search machines (e.g. Keg, Diamond)...';
  }
  
  renderManagerList();
}

// Tab Click Events
tabBtnCrops.addEventListener('click', () => switchManagerTab('crops'));
tabBtnMachines.addEventListener('click', () => switchManagerTab('machines'));

// Open Managers
btnManageCrops.addEventListener('click', () => {
  switchManagerTab('crops');
  cropManagerOverlay.style.display = 'flex';
});

if (btnManageMachines) {
  btnManageMachines.addEventListener('click', () => {
    switchManagerTab('machines');
    cropManagerOverlay.style.display = 'flex';
  });
}

// Close managers
cropManagerClose.addEventListener('click', () => {
  cropManagerOverlay.style.display = 'none';
});

cropManagerOverlay.addEventListener('click', (e) => {
  if (e.target === cropManagerOverlay) {
    cropManagerOverlay.style.display = 'none';
  }
});

// Filter search input
cropSearchInput.addEventListener('input', renderManagerList);

// Auto-save item selections on change
cropManagerList.addEventListener('change', (e) => {
  if (activeManagerTab === 'crops') {
    if (e.target.classList.contains('crop-select-checkbox')) {
      const checkboxes = document.querySelectorAll('.crop-select-checkbox');
      const activeKeys = [];
      checkboxes.forEach(cb => {
        if (cb.checked) activeKeys.push(cb.dataset.key);
      });
      
      // Preserve checked keys that were filtered out during search
      const currentActive = JSON.parse(localStorage.getItem('stardew_active_crops')) || DEFAULT_ACTIVE_CROPS;
      const query = cropSearchInput.value.toLowerCase().trim();
      if (query) {
        currentActive.forEach(key => {
          const match = MASTER_CROPS.find(c => c.key === key);
          if (match && !match.name.toLowerCase().includes(query) && !match.type.toLowerCase().includes(query)) {
            if (!activeKeys.includes(key)) activeKeys.push(key);
          }
        });
      }
      
      localStorage.setItem('stardew_active_crops', JSON.stringify(activeKeys));
      populateCropDropdown();
    }
  } else {
    // Machines Tab save
    if (e.target.classList.contains('machine-select-checkbox')) {
      const checkboxes = document.querySelectorAll('.machine-select-checkbox');
      const activeKeys = [];
      checkboxes.forEach(cb => {
        if (cb.checked) activeKeys.push(cb.dataset.key);
      });
      
      // Preserve checked keys that were filtered out during search
      const currentActive = JSON.parse(localStorage.getItem('stardew_active_machines')) || DEFAULT_ACTIVE_MACHINES;
      const query = cropSearchInput.value.toLowerCase().trim();
      if (query) {
        currentActive.forEach(key => {
          const match = MASTER_MACHINES.find(m => m.key === key);
          if (match && !match.name.toLowerCase().includes(query) && !match.type.toLowerCase().includes(query)) {
            if (!activeKeys.includes(key)) activeKeys.push(key);
          }
        });
      }
      
      localStorage.setItem('stardew_active_machines', JSON.stringify(activeKeys));
      populateMachineDropdown();
    }
  }
});

// Toggle a task's completed state and save/re-render
window.toggleTaskCompleted = function(day, taskId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const currentYearSchedule = getYearSchedule(currentYear);
  const dayTasks = currentYearSchedule[currentSeason][day] || [];
  const task = dayTasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveSchedule();
    renderTasksForDay(day);
    if (!document.body.classList.contains('hide-task-labels')) {
      setTimeout(adjustTaskFontSizes, 0);
    }
    
    // If the modal happens to be open already, refresh the modal list state
    const modalTasksSection = document.getElementById('modal-tasks-section');
    if (modalTasksSection && modalOverlay && modalOverlay.style.display === 'flex') {
      const modalTasksList = document.getElementById('modal-tasks-list');
      if (modalTasksList) {
        modalTasksList.querySelectorAll('.task-item').forEach(el => {
          // re-sync completed class in open modal without reopening
          if (el.innerHTML.includes(`'${taskId}'`)) {
            el.classList.toggle('task-completed', task.completed);
          }
        });
      }
    }
  }
};

/* ==========================================================================
   PERFECTION TRACKER ENGINE
   ========================================================================== */
let activeTrackerSheet = localStorage.getItem('stardew_active_tracker_sheet') || 'shipped';
let currentTrackerFilter = localStorage.getItem(`stardew_tracker_filter_${activeTrackerSheet}`) || 'all';
let currentTrackerSearch = '';

// Mode switching (Calendar vs Tracker vs Planner)
const btnViewCalendar = document.getElementById('btn-view-calendar');
const btnViewTracker = document.getElementById('btn-view-tracker');
const btnViewPlanner = document.getElementById('btn-view-planner');
const calendarMainView = document.getElementById('calendar-main-view');
const trackerMainView = document.getElementById('tracker-main-view');
const plannerMainView = document.getElementById('planner-main-view');
const calendarHeaderControls = document.getElementById('calendar-header-controls');
const trackerHeaderControls = document.getElementById('tracker-header-controls');

function setAppViewMode(mode) {
  localStorage.setItem('stardew_view_mode', mode);
  
  // Set body class for bulletproof CSS-based header visibility
  document.body.classList.remove('view-calendar', 'view-tracker', 'view-planner');
  document.body.classList.add(`view-${mode}`);

  // Reset all mode buttons
  [btnViewCalendar, btnViewTracker, btnViewPlanner].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  // Hide all main containers and header control rows
  if (calendarMainView) calendarMainView.style.display = 'none';
  if (trackerMainView) trackerMainView.style.display = 'none';
  if (plannerMainView) plannerMainView.style.display = 'none';
  if (calendarHeaderControls) calendarHeaderControls.style.display = 'none';
  if (trackerHeaderControls) trackerHeaderControls.style.display = 'none';

  if (mode === 'tracker') {
    if (btnViewTracker) btnViewTracker.classList.add('active');
    if (trackerMainView) trackerMainView.style.display = 'flex';
    if (trackerHeaderControls) trackerHeaderControls.style.display = 'flex';
    renderTrackerSheet();
  } else if (mode === 'planner') {
    if (btnViewPlanner) btnViewPlanner.classList.add('active');
    if (plannerMainView) plannerMainView.style.display = 'block';
  } else {
    if (btnViewCalendar) btnViewCalendar.classList.add('active');
    if (calendarMainView) calendarMainView.style.display = 'flex';
    if (calendarHeaderControls) calendarHeaderControls.style.display = 'flex';
    renderCalendar();
  }
}

if (btnViewCalendar) btnViewCalendar.addEventListener('click', () => setAppViewMode('calendar'));
if (btnViewTracker) btnViewTracker.addEventListener('click', () => setAppViewMode('tracker'));
if (btnViewPlanner) btnViewPlanner.addEventListener('click', () => setAppViewMode('planner'));

// Sheet tab switching
const trackerTabBtns = document.querySelectorAll('.tracker-tab-btn');
trackerTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    trackerTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTrackerSheet = btn.dataset.sheet;
    localStorage.setItem('stardew_active_tracker_sheet', activeTrackerSheet);
    currentTrackerFilter = localStorage.getItem(`stardew_tracker_filter_${activeTrackerSheet}`) || 'all';
    currentTrackerSearch = '';
    const searchInput = document.getElementById('tracker-search-input');
    if (searchInput) searchInput.value = '';
    renderTrackerSheet();
  });
});

// Search input
const trackerSearchInput = document.getElementById('tracker-search-input');
if (trackerSearchInput) {
  // Pressing Backspace inside search bar immediately clears all text for a clean new search
  trackerSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      if (trackerSearchInput.value) {
        e.preventDefault();
        trackerSearchInput.value = '';
        currentTrackerSearch = '';
        renderTrackerGridOnly();
      }
    }
  });

  trackerSearchInput.addEventListener('input', (e) => {
    currentTrackerSearch = e.target.value.toLowerCase().trim();
    if (currentTrackerSearch && currentTrackerFilter !== 'all') {
      currentTrackerFilter = 'all';
      localStorage.setItem(`stardew_tracker_filter_${activeTrackerSheet}`, 'all');
      renderTrackerSubfilters();
    }
    renderTrackerGridOnly();
  });
}

// Global hot-typing search on Perfection Tracker
window.addEventListener('keydown', (e) => {
  // Only capture keystrokes when on Perfection Tracker view and no modal is open
  const trackerSection = document.getElementById('tracker-main-view');
  if (!trackerSection || trackerSection.style.display === 'none') return;
  
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  for (let m of modalOverlays) {
    if (m && m.style.display && m.style.display !== 'none') return;
  }

  // Ignore special hotkeys or ctrl/cmd/alt combos
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (['Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

  const searchInput = document.getElementById('tracker-search-input');
  if (!searchInput) return;

  // Pressing Backspace anywhere on tracker tab removes all text in search bar for a new search
  if (e.key === 'Backspace') {
    if (searchInput.value || currentTrackerSearch) {
      e.preventDefault();
      searchInput.value = '';
      currentTrackerSearch = '';
      renderTrackerGridOnly();
      searchInput.focus();
    }
    return;
  }

  // Escape clears search and blurs
  if (e.key === 'Escape') {
    if (searchInput.value) {
      searchInput.value = '';
      currentTrackerSearch = '';
      renderTrackerGridOnly();
      searchInput.blur();
    }
    return;
  }

  // If focus is already in an input/textarea or select, allow standard behavior
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    return;
  }

  // If printable character typed, focus search bar immediately and switch filter to All
  if (e.key.length === 1) {
    if (currentTrackerFilter !== 'all') {
      currentTrackerFilter = 'all';
      localStorage.setItem(`stardew_tracker_filter_${activeTrackerSheet}`, 'all');
      renderTrackerSubfilters();
    }
    searchInput.focus();
  }
});

// Reset sheet button
const btnResetTracker = document.getElementById('btn-reset-tracker');
if (btnResetTracker) {
  btnResetTracker.addEventListener('click', () => {
    const sheetTitles = {
      'shipped': 'Produce & Forage Shipped',
      'crafting': 'Crafting Recipes',
      'cooking': 'Cooking Recipes',
      'fish': 'Fish Caught',
      'museum': 'Museum Donations',
      'walnuts': 'Golden Walnuts',
      'villagers': 'Villager Friendships'
    };
    const title = sheetTitles[activeTrackerSheet] || 'current sheet';
    if (confirm(`Reset all checked progress on the "${title}" sheet?`)) {
      localStorage.setItem(`stardew_tracker_${activeTrackerSheet}`, JSON.stringify({}));
      saveTrackerStateToCloud();
      renderTrackerSheet();
    }
  });
}

// State storage and sync handled above via getTrackerState & setTrackerItemState

// Toggle individual item
window.toggleTrackerItem = function(sheetKey, itemId, event) {
  if (event) event.stopPropagation();
  const state = getTrackerState(sheetKey);
  const newState = !state[itemId];
  setTrackerItemState(sheetKey, itemId, newState);
  
  renderTrackerGridOnly();
  updateTrackerProgressBar();
};

// Render subfilters bar based on active sheet
function renderTrackerSubfilters() {
  const container = document.getElementById('tracker-subfilters');
  if (!container) return;
  container.innerHTML = '';

  let filters = [{ key: 'all', label: 'All' }];

  if (activeTrackerSheet === 'shipped') {
    filters.push(
      { key: 'spring', label: '🌸 Spring' },
      { key: 'summer', label: '☀️ Summer' },
      { key: 'fall', label: '🍂 Fall' },
      { key: 'winter', label: '❄️ Winter' },
      { key: 'tree', label: '🍎 Trees & Island' },
      { key: 'animal', label: '🧀 Animal & Artisan' },
      { key: 'resource', label: '⛏️ Ores & Resources' }
    );
  } else if (activeTrackerSheet === 'crafting') {
    filters.push(
      { key: 'bombs', label: '💣 Bombs & Combat' },
      { key: 'fences', label: '🪵 Fences & Paths' },
      { key: 'farming', label: '🌾 Sprinklers & Farming' },
      { key: 'artisan', label: '⚙️ Artisan Equipment' },
      { key: 'lighting', label: '🏮 Lighting & Torches' },
      { key: 'rings', label: '💍 Rings & Totems' }
    );
  } else if (activeTrackerSheet === 'cooking') {
    filters.push(
      { key: 'buff', label: '⚡ Energy & Stat Buffs' },
      { key: 'fish', label: '🐟 Seafood Dishes' },
      { key: 'dessert', label: '🍰 Sweets & Desserts' },
      { key: 'soup', label: '🍲 Soups & Stews' }
    );
  } else if (activeTrackerSheet === 'fish') {
    filters.push(
      { key: 'spring', label: '🌸 Spring' },
      { key: 'summer', label: '☀️ Summer' },
      { key: 'fall', label: '🍂 Fall' },
      { key: 'winter', label: '❄️ Winter' },
      { key: 'ocean', label: '🌊 Ocean' },
      { key: 'river', label: '🏞️ River & Lake' },
      { key: 'legendary', label: '👑 Legendary' },
      { key: 'crabpot', label: '🦞 Crab Pot & Forage' }
    );
  } else if (activeTrackerSheet === 'museum') {
    filters.push(
      { key: 'artifact', label: '🏺 Artifacts (42)' },
      { key: 'mineral', label: '💎 Minerals & Gems (53)' }
    );
  } else if (activeTrackerSheet === 'walnuts') {
    filters.push(
      { key: 'east', label: 'Jungle / East' },
      { key: 'north', label: 'Volcano / North' },
      { key: 'west', label: 'Farm / West' },
      { key: 'south', label: 'Docks / South' }
    );
  } else if (activeTrackerSheet === 'villagers') {
    filters.push(
      { key: 'bachelor', label: '🤵 Bachelors (6)' },
      { key: 'bachelorette', label: '👰 Bachelorettes (6)' },
      { key: 'town', label: '🏡 Townspeople (22)' }
    );
  }

  filters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = `tracker-subfilter-btn ${currentTrackerFilter === f.key ? 'active' : ''}`;
    btn.innerText = f.label;
    btn.onclick = () => {
      currentTrackerFilter = f.key;
      localStorage.setItem(`stardew_tracker_filter_${activeTrackerSheet}`, currentTrackerFilter);
      renderTrackerSubfilters();
      renderTrackerGridOnly();
    };
    container.appendChild(btn);
  });
}

// Update header summary text & progress bar
function updateTrackerProgressBar() {
  const dataList = (typeof PERFECTION_TRACKER_DATA !== 'undefined') ? (PERFECTION_TRACKER_DATA[activeTrackerSheet] || []) : [];
  const state = getTrackerState(activeTrackerSheet);
  const total = dataList.length;
  const completed = dataList.filter(item => !!state[item.id]).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const countEl = document.getElementById('tracker-progress-count');
  const barEl = document.getElementById('tracker-progress-bar');
  if (countEl) countEl.innerText = `${completed} / ${total} (${percent}%)`;
  if (barEl) barEl.style.width = `${percent}%`;
}

// Render the entire tracker sheet view
function renderTrackerSheet() {
  const titleEl = document.getElementById('tracker-sheet-title');
  const descEl = document.getElementById('tracker-sheet-desc');

  const sheetMeta = {
    'shipped': {
      title: '📦 Produce & Forage Shipped',
      desc: 'Ship one of every farm crop, forage, animal product, artisan good, and resource for the Full Shipment milestone.'
    },
    'crafting': {
      title: '🔨 Craft Master (Crafting Recipes)',
      desc: 'Craft every single item in the crafting menu for the Craft Master achievement and Perfection milestone.'
    },
    'cooking': {
      title: '🍳 Gourmet Chef (Cooking Recipes)',
      desc: 'Cook every single recipe in the kitchen for the Gourmet Chef achievement and Perfection milestone.'
    },
    'fish': {
      title: '🎣 Master Angler (Fish Caught)',
      desc: 'Catch one of every species of fish across all seasons, weather, and secret waters in the valley and Ginger Island.'
    },
    'museum': {
      title: '🏺 Museum Collection Guide',
      desc: 'Donate all 42 Artifacts and 53 Minerals & Gems to Gunther to complete the Museum.'
    },
    'walnuts': {
      title: '🌰 Ginger Island Golden Walnuts',
      desc: 'Find all 130 Golden Walnuts scattered across Ginger Island (East, North Volcano, West Farm, and South Docks).'
    },
    'villagers': {
      title: '❤️ Great Friends (Villagers & Liked Gifts)',
      desc: 'Reach maximum friendship hearts with all 34 villagers (8 hearts for singles, 10 hearts for others) for the Perfection milestone. Track loved gifts, birthdays, locations, and daily schedules!'
    }
  };

  const meta = sheetMeta[activeTrackerSheet] || sheetMeta['shipped'];
  if (titleEl) titleEl.innerText = meta.title;
  if (descEl) descEl.innerText = meta.desc;

  // Active tab button sync
  trackerTabBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.sheet === activeTrackerSheet);
  });

  renderTrackerSubfilters();
  renderTrackerGridOnly();
  updateTrackerProgressBar();
}

// Filter and render items grid
function renderTrackerGridOnly() {
  const grid = document.getElementById('tracker-items-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const dataList = (typeof PERFECTION_TRACKER_DATA !== 'undefined') ? (PERFECTION_TRACKER_DATA[activeTrackerSheet] || []) : [];
  const state = getTrackerState(activeTrackerSheet);

  const filtered = dataList.filter(item => {
    // 1. Search Query Filter
    if (currentTrackerSearch) {
      const q = currentTrackerSearch;
      const matchName = item.name && item.name.toLowerCase().includes(q);
      const matchSource = item.source && item.source.toLowerCase().includes(q);
      const matchNotes = item.notes && item.notes.toLowerCase().includes(q);
      const matchCategory = item.category && item.category.toLowerCase().includes(q);
      const matchDetails = item.details && item.details.toLowerCase().includes(q);
      const matchLoved = item.loved && item.loved.toLowerCase().includes(q);
      const matchLiked = item.liked && item.liked.toLowerCase().includes(q);
      const matchSchedule = item.schedule && item.schedule.toLowerCase().includes(q);
      const matchBirthday = item.birthday && item.birthday.toLowerCase().includes(q);
      if (!matchName && !matchSource && !matchNotes && !matchCategory && !matchDetails && !matchLoved && !matchLiked && !matchSchedule && !matchBirthday) {
        return false;
      }
    }

    // 2. Subfilter
    if (currentTrackerFilter !== 'all') {
      if (activeTrackerSheet === 'shipped') {
        const s = (item.season || '').toLowerCase();
        const c = (item.category || '').toLowerCase();
        if (currentTrackerFilter === 'spring' && !s.includes('spring')) return false;
        if (currentTrackerFilter === 'summer' && !s.includes('summer')) return false;
        if (currentTrackerFilter === 'fall' && !s.includes('fall')) return false;
        if (currentTrackerFilter === 'winter' && !s.includes('winter')) return false;
        if (currentTrackerFilter === 'tree' && !c.includes('tree') && !c.includes('island') && !c.includes('special')) return false;
        if (currentTrackerFilter === 'animal' && !c.includes('animal') && !c.includes('artisan') && !c.includes('fish pond')) return false;
        if (currentTrackerFilter === 'resource' && !c.includes('resource') && !c.includes('ore') && !c.includes('bar') && !c.includes('tapper') && !c.includes('monster')) return false;
      } else if (activeTrackerSheet === 'crafting') {
        const n = (item.name || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        if (currentTrackerFilter === 'bombs' && !n.includes('bomb') && !n.includes('explosive') && !n.includes('bait') && !n.includes('arrow')) return false;
        if (currentTrackerFilter === 'fences' && !n.includes('fence') && !n.includes('gate') && !n.includes('floor') && !n.includes('path') && !n.includes('cobblestone') && !n.includes('stepping')) return false;
        if (currentTrackerFilter === 'farming' && !n.includes('sprinkler') && !n.includes('fertilizer') && !n.includes('scarecrow') && !n.includes('soil') && !n.includes('speed-gro') && !n.includes('totem') && !n.includes('hydrator')) return false;
        if (currentTrackerFilter === 'artisan' && !n.includes('press') && !n.includes('maker') && !n.includes('keg') && !n.includes('jar') && !n.includes('furnace') && !n.includes('cask') && !n.includes('smoker') && !n.includes('dehydrator') && !n.includes('loom') && !n.includes('kiln') && !n.includes('tapper') && !n.includes('mill') && !n.includes('incubator') && !n.includes('rod') && !n.includes('crystalarium')) return false;
        if (currentTrackerFilter === 'lighting' && !n.includes('torch') && !n.includes('brazier') && !n.includes('lamp') && !n.includes('candle') && !n.includes('light')) return false;
        if (currentTrackerFilter === 'rings' && !n.includes('ring') && !n.includes('band') && !n.includes('totem') && !n.includes('elixir') && !n.includes('warp')) return false;
      } else if (activeTrackerSheet === 'cooking') {

        const n = (item.name || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        if (currentTrackerFilter === 'buff' && !notes.includes('buffs:')) return false;
        if (currentTrackerFilter === 'fish' && !notes.includes('fish') && !notes.includes('salmon') && !notes.includes('eel') && !notes.includes('trout') && !notes.includes('calamari') && !notes.includes('squid') && !notes.includes('lobster') && !notes.includes('crab') && !notes.includes('shrimp') && !notes.includes('seafoam') && !notes.includes('carp') && !notes.includes('bass') && !notes.includes('chowder') && !notes.includes('algae')) return false;
        if (currentTrackerFilter === 'dessert' && !n.includes('cake') && !n.includes('pie') && !n.includes('cookie') && !n.includes('pudding') && !n.includes('ice cream') && !n.includes('tart') && !n.includes('candy') && !n.includes('muffin') && !n.includes('bar') && !n.includes('cobbler')) return false;
        if (currentTrackerFilter === 'soup' && !n.includes('soup') && !n.includes('stew') && !n.includes('broth') && !n.includes('chowder') && !n.includes('bisque') && !n.includes('hotpot') && !n.includes('curry')) return false;
      } else if (activeTrackerSheet === 'fish') {
        const s = (item.season || '').toLowerCase();
        const src = (item.source || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const legendaries = ['crimsonfish', 'angler', 'legend', 'glacierfish', 'mutant carp'];
        if (currentTrackerFilter === 'spring' && !s.includes('spring') && !s.includes('all season')) return false;
        if (currentTrackerFilter === 'summer' && !s.includes('summer') && !s.includes('all season')) return false;
        if (currentTrackerFilter === 'fall' && !s.includes('fall') && !s.includes('all season')) return false;
        if (currentTrackerFilter === 'winter' && !s.includes('winter') && !s.includes('all season')) return false;
        if (currentTrackerFilter === 'ocean' && !src.includes('ocean') && !src.includes('saltwater') && !src.includes('submarine') && !src.includes('beach')) return false;
        if (currentTrackerFilter === 'river' && !src.includes('river') && !src.includes('mountain') && !src.includes('lake') && !src.includes('forest') && !src.includes('pond') && !src.includes('freshwater')) return false;
        if (currentTrackerFilter === 'legendary' && !legendaries.includes(name)) return false;
        if (currentTrackerFilter === 'crabpot' && !['clam', 'cockle', 'crab', 'crayfish', 'lobster', 'mussel', 'oyster', 'periwinkle', 'shrimp', 'snail', 'seaweed', 'green algae', 'white algae', 'sea jelly', 'river jelly', 'cave jelly'].includes(name)) return false;
      } else if (activeTrackerSheet === 'museum') {
        const t = (item.type || '').toLowerCase();
        if (currentTrackerFilter === 'artifact' && !t.includes('artifact')) return false;
        if (currentTrackerFilter === 'mineral' && !t.includes('mineral')) return false;
      } else if (activeTrackerSheet === 'scarecrows') {
        const t = (item.type || '').toLowerCase();
        if (currentTrackerFilter === 'rarecrow' && !t.includes('rarecrow')) return false;
        if (currentTrackerFilter === 'craftable' && !t.includes('craftable')) return false;
      } else if (activeTrackerSheet === 'walnuts') {
        const z = (item.zone || '').toLowerCase();
        if (currentTrackerFilter === 'east' && !z.includes('east')) return false;
        if (currentTrackerFilter === 'north' && !z.includes('north') && !z.includes('field') && !z.includes('volcano')) return false;
        if (currentTrackerFilter === 'west' && !z.includes('west')) return false;
        if (currentTrackerFilter === 'south' && !z.includes('south')) return false;
      } else if (activeTrackerSheet === 'villagers') {
        const c = (item.category || '').toLowerCase();
        if (currentTrackerFilter === 'bachelor' && c !== 'bachelor') return false;
        if (currentTrackerFilter === 'bachelorette' && c !== 'bachelorette') return false;
        if (currentTrackerFilter === 'town' && c !== 'townsperson') return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; font-size: 0.95rem;">No items matched your filter or search query.</div>';
    return;
  }

  // Sort: Incomplete items first (0), Completed / Obtained items moved to bottom (1)
  filtered.sort((a, b) => {
    const aDone = state[a.id] ? 1 : 0;
    const bDone = state[b.id] ? 1 : 0;
    return aDone - bDone;
  });

  filtered.forEach(item => {
    const isObtained = !!state[item.id];
    const card = document.createElement('div');
    card.className = `tracker-card ${isObtained ? 'obtained' : ''}`;
    card.id = `tracker-card-${item.id}`;
    card.onclick = (e) => toggleTrackerItem(activeTrackerSheet, item.id, e);

    // Build badge & badge color
    let badgeText = item.season || item.type || item.category || item.zone || '';
    let badgeColor = 'var(--accent-gold)';
    if (badgeText.includes('Spring')) badgeColor = '#22c55e';
    else if (badgeText.includes('Summer')) badgeColor = '#eab308';
    else if (badgeText.includes('Fall')) badgeColor = '#f97316';
    else if (badgeText.includes('Winter')) badgeColor = '#38bdf8';
    else if (badgeText.includes('Bachelorette')) badgeColor = '#f472b6';
    else if (badgeText.includes('Bachelor')) badgeColor = '#38bdf8';
    else if (badgeText.includes('Townsperson')) badgeColor = '#c084fc';
    else if (badgeText.includes('Mineral')) badgeColor = '#c084fc';
    else if (badgeText.includes('Rarecrow')) badgeColor = '#fbbf24';
    else if (badgeText.includes('Cooking')) badgeColor = '#fb923c';
    else if (badgeText.includes('Fish')) badgeColor = '#38bdf8';

    let detailsText = item.source || item.growth || item.details || item.desc || '';
    let notesText = item.notes || '';
    let dayText = item.day ? `<div style="font-size: 0.72rem; color: #fbbf24; font-weight: 600; margin-bottom: 2px;">📅 ${item.day}</div>` : '';

    if (activeTrackerSheet === 'villagers') {
      badgeText = item.category === 'Bachelorette' ? '👰 Bachelorette' : (item.category === 'Bachelor' ? '🤵 Bachelor' : '🏡 Townsperson');
      dayText = `<div style="font-size: 0.72rem; color: #fbbf24; font-weight: 600; margin-bottom: 4px;">🎂 Birthday: ${item.birthday} | 🏠 ${item.home}</div>`;
      detailsText = `<div style="margin-bottom: 4px; line-height: 1.3;"><strong style="color: #f87171;">❤️ Loved:</strong> ${item.loved}</div><div style="margin-bottom: 4px; line-height: 1.3;"><strong style="color: #4ade80;">👍 Liked:</strong> ${item.liked}</div>`;
      
      let mapPinsHtml = '';
      if (item.mapPins && Array.isArray(item.mapPins) && item.mapPins.length > 0) {
        item.mapPins.forEach((pin, pIdx) => {
          const posClass = pin.pos ? `pin-pos-${pin.pos}` : (pIdx % 2 === 0 ? 'pin-pos-top' : 'pin-pos-bottom');
          mapPinsHtml += `
            <div class="villager-map-pin-static ${posClass}" style="left: ${pin.x}%; top: ${pin.y}%;">
              <span class="static-pin-dot"></span>
              <span class="static-pin-label">${pin.label}</span>
            </div>
          `;
        });
      }

      notesText = `
        <div style="line-height: 1.3; margin-bottom: 6px;"><strong style="color: #60a5fa;">🕒 Schedule:</strong> ${item.schedule}</div>
        <div class="villager-static-map-wrapper"
             onmouseenter="showVillagerMapHover('${item.id}', this, event)"
             onmouseleave="hideVillagerMapHover()"
             onclick="openVillagerMapModal('${item.id}', event)"
             title="Hover to preview map / Click to enlarge">
          <div class="map-zoom-hint">🔍 Hover to Zoom</div>
          <div class="villager-static-map-frame">
            <img src="stardew_map.png" alt="Map" class="villager-static-map-img" loading="lazy">
            ${mapPinsHtml}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="tracker-card-icon">
        <img src="${item.img}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.style.display='none';">
      </div>
      <div class="tracker-card-body">
        <div class="tracker-card-badge" style="color: ${badgeColor};">${badgeText}</div>
        <div class="tracker-card-name">${item.name}</div>
        ${dayText}
        <div class="tracker-card-source">${detailsText}</div>
        ${notesText ? `<div class="tracker-card-notes">${notesText}</div>` : ''}
      </div>
      <div class="tracker-card-cb">
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
          <path d="M1 4.5L4.5 8L11 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Initial View mode loader
const savedViewMode = localStorage.getItem('stardew_view_mode') || 'calendar';
setAppViewMode(savedViewMode);

// Global handler: prevent Ctrl + scroll wheel from zooming the main website interface
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const plannerFrame = document.getElementById('planner-frame');
    if (plannerFrame && plannerFrame.contentWindow) {
      try {
        const pw = plannerFrame.contentWindow;
        if (pw.planner && pw.planner.viewport) {
          const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
          pw.planner.viewport.zoomPercent(zoomFactor - 1, true);
        }
      } catch (err) {}
    }
  }
}, { passive: false });

// Prevent double-tap / double-click zooming across mobile phone and desktop-mode browsing
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      e.preventDefault();
    }
  }
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('dblclick', (e) => {
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    e.preventDefault();
  }
}, { passive: false });

// Dismiss open day hover popups when tapping outside any day card
['click', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, (e) => {
    if (!e.target.closest('.day-card')) {
      document.querySelectorAll('.day-card.touch-hover-active').forEach(c => c.classList.remove('touch-hover-active'));
    }
  }, { passive: true });
});







// Villager Map Lightbox Modal Handler
window.openVillagerMapModal = function(villagerId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dataList = (typeof PERFECTION_TRACKER_DATA !== 'undefined') ? (PERFECTION_TRACKER_DATA['villagers'] || []) : [];
  const item = dataList.find(v => v.id === villagerId);
  if (!item) return;

  const modal = document.getElementById('villager-map-modal');
  if (!modal) return;

  const imgEl = document.getElementById('modal-villager-img');
  const nameEl = document.getElementById('modal-villager-name');
  const subEl = document.getElementById('modal-villager-sub');
  const pinsContainer = document.getElementById('modal-villager-pins-container');
  const schedBox = document.getElementById('modal-villager-schedule-box');

  if (imgEl) imgEl.src = item.img || '';
  if (nameEl) nameEl.innerText = item.name || '';
  if (subEl) subEl.innerText = `🎂 ${item.birthday || ''} | 🏠 ${item.home || ''}`;
  
  if (pinsContainer) {
    let pinsHtml = '';
    if (item.mapPins && Array.isArray(item.mapPins)) {
      item.mapPins.forEach(pin => {
        pinsHtml += `
          <div class="villager-map-pin-static modal-pin" style="left: ${pin.x}%; top: ${pin.y}%;">
            <span class="static-pin-dot modal-dot"></span>
            <span class="static-pin-label modal-label">${pin.label}</span>
          </div>
        `;
      });
    }
    pinsContainer.innerHTML = pinsHtml;
  }

  if (schedBox) {
    schedBox.innerHTML = `
      <div style="margin-bottom: 4px;"><strong style="color: #60a5fa;">🕒 Schedule:</strong> ${item.schedule || ''}</div>
      <div style="margin-bottom: 4px;"><strong style="color: #f87171;">❤️ Loved:</strong> ${item.loved || ''}</div>
      <div><strong style="color: #4ade80;">👍 Liked:</strong> ${item.liked || ''}</div>
    `;
  }

  modal.style.display = 'flex';
};

window.closeVillagerMapModal = function(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('villager-map-modal');
  if (modal) modal.style.display = 'none';
};





// Giant Floating Villager Map Hover Preview Handler
window.showVillagerMapHover = function(villagerId, el, event) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const preview = document.getElementById('villager-map-hover-preview');
  if (!preview) return;

  const dataList = (typeof PERFECTION_TRACKER_DATA !== 'undefined') ? (PERFECTION_TRACKER_DATA['villagers'] || []) : [];
  const item = dataList.find(v => v.id === villagerId);
  if (!item) return;

  const avatar = document.getElementById('hover-preview-avatar');
  const nameEl = document.getElementById('hover-preview-name');
  const subEl = document.getElementById('hover-preview-sub');
  const pinsContainer = document.getElementById('hover-preview-pins');
  const schedEl = document.getElementById('hover-preview-schedule');

  if (avatar) avatar.src = item.img || '';
  if (nameEl) nameEl.innerText = item.name || '';
  if (subEl) subEl.innerText = `🎂 ${item.birthday || ''} | 🏠 ${item.home || ''}`;
  if (schedEl) schedEl.innerHTML = `<strong style="color: #60a5fa;">🕒 Schedule:</strong> ${item.schedule || ''}`;

  if (pinsContainer) {
    let pinsHtml = '';
    if (item.mapPins && Array.isArray(item.mapPins)) {
      item.mapPins.forEach((pin, pIdx) => {
        const posClass = pin.pos ? `pin-pos-${pin.pos}` : (pIdx % 2 === 0 ? 'pin-pos-top' : 'pin-pos-bottom');
        pinsHtml += `
          <div class="hover-preview-pin ${posClass}" style="left: ${pin.x}%; top: ${pin.y}%;">
            <span class="hover-pin-dot"></span>
            <span class="hover-pin-label">${pin.label}</span>
          </div>
        `;
      });
    }
    pinsContainer.innerHTML = pinsHtml;
  }

  // Measure and position intelligently
  preview.style.display = 'flex';
  preview.style.visibility = 'hidden';

  const rect = el.getBoundingClientRect();
  const previewWidth = preview.offsetWidth || 780;
  const previewHeight = preview.offsetHeight || 520;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  // Center over card
  let left = rect.left + (rect.width / 2) - (previewWidth / 2);
  let top = rect.top + (rect.height / 2) - (previewHeight / 2);

  // Clamp within viewport margins
  if (left < 15) left = 15;
  if (left + previewWidth > winWidth - 15) left = winWidth - previewWidth - 15;
  if (top < 15) top = 15;
  if (top + previewHeight > winHeight - 15) top = winHeight - previewHeight - 15;

  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
  preview.style.visibility = 'visible';
  preview.classList.add('visible');
};

window.hideVillagerMapHover = function() {
  const preview = document.getElementById('villager-map-hover-preview');
  if (preview) {
    preview.classList.remove('visible');
    preview.style.display = 'none';
  }
};


// Auto-switch fertilizer when tree vs standard crop is selected
const cropSelectEl = document.getElementById('crop-select');
const cropFertEl = document.getElementById('crop-fert');
if (cropSelectEl && cropFertEl) {
  cropSelectEl.addEventListener('change', () => {
    const selectedKey = cropSelectEl.value;
    const crop = MASTER_CROPS.find(c => c.key === selectedKey);
    if (crop && (crop.key === 'mahogany' || crop.isWildTree)) {
      cropFertEl.value = 'tree_fert';
    } else if (cropFertEl.value === 'tree_fert') {
      cropFertEl.value = 'none';
    }
  });
}


// Auto-suggest Desert location when Solar Panel is selected
const machineSelectEl = document.getElementById('machine-select');
const machineLocEl = document.getElementById('machine-loc');
if (machineSelectEl && machineLocEl) {
  machineSelectEl.addEventListener('change', () => {
    if (machineSelectEl.value === 'solar_panel' && (machineLocEl.value === 'Shed' || machineLocEl.value === 'Tunnel')) {
      machineLocEl.value = 'Desert';
    }
  });
}
