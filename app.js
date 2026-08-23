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
};

const MACHINE_IMAGES = {
  'keg_wine': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Keg.png',
  'keg_beer': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Keg.png',
  'preserves': 'https://stardewvalleywiki.com/mediawiki/images/1/1e/Preserves_Jar.png',
  'cask_silver': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png',
  'cask_gold': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png',
  'cask_iridium': 'https://stardewvalleywiki.com/mediawiki/images/7/7c/Cask.png',
  'solar_panel': 'https://stardewvalleywiki.com/mediawiki/images/5/5d/Solar_Panel.png'
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
  { key: 'mango', name: 'Mango Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', type: 'Tree' }
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
    activeSeason: c.activeSeason || c.season,
    getDays: (fert, agri) => {
      if (c.isTree) return 28;
      return calculateGrowthDays(c.base, fert, agri);
    }
  };
});

const MACHINE_PRESETS = {
  keg_wine: { name: 'Keg (Wine)', duration: 7 },
  keg_beer: { name: 'Keg (Beer/Pale Ale)', duration: 2 },
  preserves: { name: 'Preserves Jar', duration: 3 },
  cask_silver: { name: 'Cask aging (Silver)', duration: 14 },
  cask_gold: { name: 'Cask aging (Gold)', duration: 28 },
  cask_iridium: { name: 'Cask aging (Iridium)', duration: 56 },
  solar_panel: { name: 'Solar Panel', duration: 10 }
};

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
  // Machines / yields
  'keg_wine': '#a21caf',     // Wine violet
  'keg_beer': '#b45309',     // Amber
  'preserves': '#be185d',    // Jelly red
  'cask_silver': '#94a3b8',  // Silver gray
  'cask_gold': '#fbbf24',    // Gold yellow
  'cask_iridium': '#c084fc', // Purple iridium
  'solar_panel': '#38bdf8',  // Sky blue battery
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
  
  item.style.backgroundColor = hexToRgba(baseColor, 0.16);
  item.style.borderColor = hexToRgba(baseColor, 0.4);
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
  } else {
    if (task.machineKey === 'solar_panel' && task.id && typeof task.id === 'string' && task.id.includes('ready')) {
       return 'https://stardewvalleywiki.com/mediawiki/images/2/25/Battery_Pack.png';
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
        <button class="add-task-btn" onclick="openModal(${day})">+</button>
      </div>
      <div class="tasks-list" id="tasks-day-${day}"></div>
    `;

    calendarGrid.appendChild(card);
    renderTasksForDay(day);
  }
}

// Render tasks within a day card
function renderTasksForDay(day) {
  const listContainer = document.getElementById(`tasks-day-${day}`);
  listContainer.innerHTML = '';
  
  const currentYearSchedule = getYearSchedule(currentYear);
  const dayTasks = currentYearSchedule[currentSeason][day] || [];

  // Render all gathered tasks
  dayTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.type}`;
    applyTaskItemColor(item, task);
    
    const imgUrl = getTaskIconUrl(task);
    const iconHtml = imgUrl ? `<img src="${imgUrl}" class="crop-icon" alt="" style="width: 18px; height: 18px; object-fit: contain; margin-right: 6px; vertical-align: middle; flex-shrink: 0;">` : '';
    
    const lastIndex = task.label.lastIndexOf('(');
    let titleText = task.label;
    let subtitleText = '';
    if (lastIndex !== -1) {
      titleText = task.label.substring(0, lastIndex).trim();
      subtitleText = task.label.substring(lastIndex + 1).replace(')', '').trim();
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
    listContainer.appendChild(item);
  });
}

// Modal handling
window.openModal = function(day) {
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
      applyTaskItemColor(item, task);
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.padding = '0.35rem 0.5rem';
      item.style.borderRadius = '6px';
      item.style.fontSize = '0.85rem';
      item.style.margin = '0.2rem 0';
      
      const imgUrl = getTaskIconUrl(task);
      const iconHtml = imgUrl ? `<img src="${imgUrl}" class="crop-icon" alt="" style="width: 18px; height: 18px; object-fit: contain; margin-right: 6px; vertical-align: middle; flex-shrink: 0;">` : '';
      
      const lastIndex = task.label.lastIndexOf('(');
      let titleText = task.label;
      let subtitleText = '';
      if (lastIndex !== -1) {
        titleText = task.label.substring(0, lastIndex).trim();
        subtitleText = task.label.substring(lastIndex + 1).replace(')', '').trim();
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
      : (crop.isTree ? `🌳 Plant ${crop.name} (${location})` : `🌱 Plant ${crop.name} (${location})`),
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
    label: crop.isTree 
      ? `🌳 Harvest ${crop.name} (${location})` 
      : `🌾 Harvest ${crop.name} (${location})`,
    groupId: groupId,
    absDay: harvestAbs
  };

  let shouldAddFirst = true;
  if (crop.isTree && location === 'Main Farm' && harvestDate.season !== crop.activeSeason) {
    shouldAddFirst = false;
  }
  if (shouldAddFirst) {
    addStaticTask(harvestDate, firstHarvestTask);
  }

  // Regrows (for multi-harvest crops or trees)
  const regrowInterval = crop.regrow;
  if (regrowInterval > 0) {
    let nextHarvestDate = getFutureDate(harvestDate.year, harvestDate.season, harvestDate.day, regrowInterval);
    // Schedule up to 60 regrows (approx 4 years of harvests)
    for (let i = 0; i < 60; i++) {
      const nextHarvestAbs = getAbsoluteDay(nextHarvestDate.year, nextHarvestDate.season, nextHarvestDate.day);
      const regrowTask = {
        id: 'harvest_regrow_' + Date.now() + '_' + i,
        type: 'harvest',
        cropKey: cropKey,
        label: crop.isTree 
          ? `🌳 Harvest ${crop.name} (${location})`
          : `🌾 Harvest ${crop.name} (Regrow - ${location})`,
        groupId: groupId,
        absDay: nextHarvestAbs
      };

      let shouldAddRegrow = true;
      if (crop.isTree && location === 'Main Farm' && nextHarvestDate.season !== crop.activeSeason) {
        shouldAddRegrow = false;
      }

      if (shouldAddRegrow) {
        addStaticTask(nextHarvestDate, regrowTask);
      }

      nextHarvestDate = getFutureDate(nextHarvestDate.year, nextHarvestDate.season, nextHarvestDate.day, regrowInterval);
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
  const loadTask = {
    id: 'load_' + Date.now(),
    type: isSolar ? 'solar' : (machineKey.includes('keg') ? 'keg' : 'cask'),
    machineKey: machineKey,
    label: isSolar ? `📥 Place ${preset.name} (${location})` : `📥 Load ${preset.name} (${location})`,
    groupId: groupId,
    absDay: loadAbs
  };
  const currentYearSchedule = getYearSchedule(currentYear);
  if (!currentYearSchedule[currentSeason][activeDay]) currentYearSchedule[currentSeason][activeDay] = [];
  currentYearSchedule[currentSeason][activeDay].push(loadTask);

  // 2. Add Ready Task to future day
  const readyDate = getFutureDate(currentYear, currentSeason, activeDay, preset.duration);
  const readyAbs = getAbsoluteDay(readyDate.year, readyDate.season, readyDate.day);
  const readyTask = {
    id: 'ready_' + Date.now(),
    type: machineKey.includes('keg') ? 'keg' : (machineKey === 'solar_panel' ? 'solar' : 'cask'),
    machineKey: machineKey,
    label: `📦 ${preset.name} Ready (${location})`,
    sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`,
    groupId: groupId,
    absDay: readyAbs
  };
  
  const targetYearSchedule = getYearSchedule(readyDate.year);
  if (!targetYearSchedule[readyDate.season][readyDate.day]) targetYearSchedule[readyDate.season][readyDate.day] = [];
  targetYearSchedule[readyDate.season][readyDate.day].push(readyTask);

  // 3. If Solar Panel, schedule repeating yields every 10 days indefinitely (placed once, produces forever)
  if (machineKey === 'solar_panel') {
    let nextReadyDate = getFutureDate(readyDate.year, readyDate.season, readyDate.day, 10);
    for (let i = 0; i < 60; i++) {
      const nextReadyAbs = getAbsoluteDay(nextReadyDate.year, nextReadyDate.season, nextReadyDate.day);
      const repeatTask = {
        id: 'ready_repeat_' + Date.now() + '_' + i,
        type: 'solar',
        machineKey: machineKey,
        label: `📦 ${preset.name} Ready (${location})`,
        sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`,
        groupId: groupId,
        absDay: nextReadyAbs
      };
      const ys = getYearSchedule(nextReadyDate.year);
      if (!ys[nextReadyDate.season][nextReadyDate.day]) ys[nextReadyDate.season][nextReadyDate.day] = [];
      ys[nextReadyDate.season][nextReadyDate.day].push(repeatTask);
      
      nextReadyDate = getFutureDate(nextReadyDate.year, nextReadyDate.season, nextReadyDate.day, 10);
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

// Init
renderCalendar();
initFirebase();

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

      // Listen for remote updates
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
    }
  } catch (e) {
    console.warn("Firebase initialization failed:", e);
  }
}

// Crop Manager DOM Elements
const cropManagerOverlay = document.getElementById('crop-manager-overlay');
const cropManagerClose = document.getElementById('crop-manager-close');
const cropSearchInput = document.getElementById('crop-search-input');
const cropManagerList = document.getElementById('crop-manager-list');
const btnManageCrops = document.getElementById('btn-manage-crops');

// Populate crop select field based on active list
function populateCropDropdown() {
  const activeKeys = JSON.parse(localStorage.getItem('stardew_active_crops')) || ['starfruit', 'ancient', 'strawberry', 'rhubarb', 'blueberry', 'sweetgem', 'cherry', 'apricot', 'orange', 'peach', 'apple', 'pomegranate', 'banana', 'mango'];
  const select = document.getElementById('crop-select');
  if (!select) return;
  select.innerHTML = '';
  
  const activeCrops = MASTER_CROPS.filter(c => activeKeys.includes(c.key));
  activeCrops.forEach(c => {
    const option = document.createElement('option');
    option.value = c.key;
    let label = `${c.name} (${c.base}d`;
    if (c.regrow > 0) label += ` + ${c.regrow}d regrow`;
    if (c.isTree) label += `, ${c.activeSeason.toUpperCase()}`;
    label += `)`;
    option.innerText = label;
    select.appendChild(option);
  });
}

// Initial populate
populateCropDropdown();

// Render selector list inside Crop Manager
function renderCropManagerList() {
  const query = cropSearchInput.value.toLowerCase().trim();
  const activeKeys = JSON.parse(localStorage.getItem('stardew_active_crops')) || ['starfruit', 'ancient', 'strawberry', 'rhubarb', 'blueberry', 'sweetgem', 'cherry', 'apricot', 'orange', 'peach', 'apple', 'pomegranate', 'banana', 'mango'];
  
  cropManagerList.innerHTML = '';
  
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
}

// Open Crop Manager Overlay
btnManageCrops.addEventListener('click', () => {
  cropSearchInput.value = '';
  renderCropManagerList();
  cropManagerOverlay.style.display = 'flex';
});

// Close Crop Manager Overlay
cropManagerClose.addEventListener('click', () => {
  cropManagerOverlay.style.display = 'none';
});

cropManagerOverlay.addEventListener('click', (e) => {
  if (e.target === cropManagerOverlay) {
    cropManagerOverlay.style.display = 'none';
  }
});

// Filter search input
cropSearchInput.addEventListener('input', renderCropManagerList);

// Auto-save crop selections on change
cropManagerList.addEventListener('change', (e) => {
  if (e.target.classList.contains('crop-select-checkbox')) {
    const checkboxes = document.querySelectorAll('.crop-select-checkbox');
    const activeKeys = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        activeKeys.push(cb.dataset.key);
      }
    });
    
    // Also preserve checked keys that were filtered out during search
    const currentActive = JSON.parse(localStorage.getItem('stardew_active_crops')) || ['starfruit', 'ancient', 'strawberry', 'rhubarb', 'blueberry', 'sweetgem', 'cherry', 'apricot', 'orange', 'peach', 'apple', 'pomegranate', 'banana', 'mango'];
    const query = cropSearchInput.value.toLowerCase().trim();
    if (query) {
      currentActive.forEach(key => {
        const match = MASTER_CROPS.find(c => c.key === key);
        if (match && !match.name.toLowerCase().includes(query) && !match.type.toLowerCase().includes(query)) {
          if (!activeKeys.includes(key)) {
            activeKeys.push(key);
          }
        }
      });
    }
    
    localStorage.setItem('stardew_active_crops', JSON.stringify(activeKeys));
    populateCropDropdown();
  }
});
