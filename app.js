// App State
let currentYear = parseInt(localStorage.getItem('stardew_current_year')) || 1;
let currentSeason = localStorage.getItem('stardew_current_season') || 'spring';
let activeDay = 1;

// Migrate old data if necessary
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

// Crop Growth Table (Pre-calculated exact values to match Stardew Wiki)
const CROP_GROWTH_PRESETS = {
  starfruit: {
    name: 'Starfruit',
    base: 13,
    regrow: 0,
    getDays: (fert, agri) => {
      if (fert === 'none' && !agri) return 13;
      if (fert === 'speed' && !agri) return 11;
      if (fert === 'deluxe' && !agri) return 9;
      if (fert === 'hyper' && !agri) return 8;
      if (fert === 'none' && agri) return 11;
      if (fert === 'speed' && agri) return 10;
      if (fert === 'deluxe' && agri) return 8;
      if (fert === 'hyper' && agri) return 7;
      return 13;
    }
  },
  ancient: {
    name: 'Ancient Fruit',
    base: 28,
    regrow: 7,
    getDays: (fert, agri) => {
      if (fert === 'none' && !agri) return 28;
      if (fert === 'speed' && !agri) return 25;
      if (fert === 'deluxe' && !agri) return 21;
      if (fert === 'hyper' && !agri) return 18;
      if (fert === 'none' && agri) return 25;
      if (fert === 'speed' && agri) return 22;
      if (fert === 'deluxe' && agri) return 18;
      if (fert === 'hyper' && agri) return 15;
      return 28;
    }
  },
  pumpkin: {
    name: 'Pumpkin',
    base: 13,
    regrow: 0,
    getDays: (fert, agri) => {
      if (fert === 'none' && !agri) return 13;
      if (fert === 'speed' && !agri) return 11;
      if (fert === 'deluxe' && !agri) return 9;
      if (fert === 'hyper' && !agri) return 8;
      if (fert === 'none' && agri) return 11;
      if (fert === 'speed' && agri) return 10;
      if (fert === 'deluxe' && agri) return 8;
      if (fert === 'hyper' && agri) return 7;
      return 13;
    }
  },
  melon: {
    name: 'Melon',
    base: 12,
    regrow: 0,
    getDays: (fert, agri) => {
      if (fert === 'none' && !agri) return 12;
      if (fert === 'speed' && !agri) return 10;
      if (fert === 'deluxe' && !agri) return 9;
      if (fert === 'hyper' && !agri) return 8;
      if (fert === 'none' && agri) return 10;
      if (fert === 'speed' && agri) return 9;
      if (fert === 'deluxe' && agri) return 7;
      if (fert === 'hyper' && agri) return 6;
      return 12;
    }
  },
  cauliflower: {
    name: 'Cauliflower',
    base: 12,
    regrow: 0,
    getDays: (fert, agri) => {
      if (fert === 'none' && !agri) return 12;
      if (fert === 'speed' && !agri) return 10;
      if (fert === 'deluxe' && !agri) return 9;
      if (fert === 'hyper' && !agri) return 8;
      if (fert === 'none' && agri) return 10;
      if (fert === 'speed' && agri) return 9;
      if (fert === 'deluxe' && agri) return 7;
      if (fert === 'hyper' && agri) return 6;
      return 12;
    }
  },
  sweetgem: {
    name: 'Sweet Gem Berry',
    base: 24,
    regrow: 0,
    getDays: (fert, agri) => {
      if (fert === 'none' && !agri) return 24;
      if (fert === 'speed' && !agri) return 21;
      if (fert === 'deluxe' && !agri) return 18;
      if (fert === 'hyper' && !agri) return 16;
      if (fert === 'none' && agri) return 21;
      if (fert === 'speed' && agri) return 19;
      if (fert === 'deluxe' && agri) return 15;
      if (fert === 'hyper' && agri) return 13;
      return 24;
    }
  }
};

const MACHINE_PRESETS = {
  keg_wine: { name: 'Keg (Wine)', duration: 7 },
  keg_beer: { name: 'Keg (Beer/Pale Ale)', duration: 2 },
  preserves: { name: 'Preserves Jar', duration: 3 },
  cask_silver: { name: 'Cask aging (Silver)', duration: 14 },
  cask_gold: { name: 'Cask aging (Gold)', duration: 28 },
  cask_iridium: { name: 'Cask aging (Iridium)', duration: 56 }
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
  localStorage.setItem('stardew_schedule', JSON.stringify(schedule));
  updateMetaStats();
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

// Render Calendar Day Cards
function renderCalendar() {
  calendarGrid.innerHTML = '';
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let day = 1; day <= 28; day++) {
    const weekdayName = weekdays[(day - 1) % 7];
    const card = document.createElement('div');
    card.className = 'day-card';
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
  dayTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.type}`;
    item.innerHTML = `
      <span>${task.label}</span>
      <button class="task-delete" onclick="deleteTask(${day}, '${task.id}', event)">×</button>
    `;
    listContainer.appendChild(item);
  });
}

// Modal handling
window.openModal = function(day) {
  activeDay = day;
  modalTitle.innerText = `Year ${currentYear} - ${currentSeason.toUpperCase()} - Day ${day}`;
  modalOverlay.style.display = 'flex';
};

function closeModal() {
  modalOverlay.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Gifting & Professions change trigger
function updateMetaStats() {
  let cropCount = 0;
  let kegCount = 0;
  let caskCount = 0;

  const seasons = ['spring', 'summer', 'fall', 'winter'];
  Object.keys(schedule).forEach(y => {
    if (isNaN(y)) return; // Ignore any non-numeric legacy keys
    
    seasons.forEach(s => {
      if (!schedule[y] || !schedule[y][s]) return;
      for (let d = 1; d <= 28; d++) {
        const dayTasks = schedule[y][s][d] || [];
        dayTasks.forEach(task => {
          if (task.type === 'harvest') cropCount++;
          if (task.label.includes('Keg Ready')) kegCount++;
          if (task.label.includes('Cask Ready')) caskCount++;
        });
      }
    });
  });

  document.getElementById('stat-crops').innerText = cropCount;
  document.getElementById('stat-kegs').innerText = kegCount;
  document.getElementById('stat-casks').innerText = caskCount;
}

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
  const agriculturist = false;

  const crop = CROP_GROWTH_PRESETS[cropKey];
  const growthDays = crop.getDays(fertilizer, agriculturist);

  // 1. Add "Plant [Crop]" to selected day
  const plantTask = {
    id: 'plant_' + Date.now(),
    type: 'plant',
    label: `🌱 Plant ${crop.name} (${location})`
  };
  const currentYearSchedule = getYearSchedule(currentYear);
  if (!currentYearSchedule[currentSeason][activeDay]) currentYearSchedule[currentSeason][activeDay] = [];
  currentYearSchedule[currentSeason][activeDay].push(plantTask);

  // 2. Add "Harvest [Crop]" to future day
  const harvestDate = getFutureDate(currentYear, currentSeason, activeDay, growthDays);
  const harvestTask = {
    id: 'harvest_' + Date.now(),
    type: 'harvest',
    label: `🌾 Harvest ${crop.name} (${location})`,
    sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`
  };
  
  const targetYearSchedule = getYearSchedule(harvestDate.year);
  if (!targetYearSchedule[harvestDate.season][harvestDate.day]) targetYearSchedule[harvestDate.season][harvestDate.day] = [];
  targetYearSchedule[harvestDate.season][harvestDate.day].push(harvestTask);

  // 3. For multi-harvest crops (e.g. Ancient Fruit), schedule subsequent harvests
  if (crop.regrow > 0) {
    let nextHarvest = getFutureDate(harvestDate.year, harvestDate.season, harvestDate.day, crop.regrow);
    // Schedule regrows for up to 60 cycles (approx 4 years of continuous weekly harvest)
    for (let i = 0; i < 60; i++) {
      const regrowTask = {
        id: 'harvest_regrow_' + Date.now() + '_' + i,
        type: 'harvest',
        label: `🌾 Harvest ${crop.name} (Regrow - ${location})`,
        sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`
      };
      
      const regrowYearSchedule = getYearSchedule(nextHarvest.year);
      if (!regrowYearSchedule[nextHarvest.season][nextHarvest.day]) regrowYearSchedule[nextHarvest.season][nextHarvest.day] = [];
      regrowYearSchedule[nextHarvest.season][nextHarvest.day].push(regrowTask);
      nextHarvest = getFutureDate(nextHarvest.year, nextHarvest.season, nextHarvest.day, crop.regrow);
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

  // 1. Add Load Task to selected day
  const loadTask = {
    id: 'load_' + Date.now(),
    type: machineKey.includes('keg') ? 'keg' : 'cask',
    label: `📥 Load ${preset.name} (${location})`
  };
  const currentYearSchedule = getYearSchedule(currentYear);
  if (!currentYearSchedule[currentSeason][activeDay]) currentYearSchedule[currentSeason][activeDay] = [];
  currentYearSchedule[currentSeason][activeDay].push(loadTask);

  // 2. Add Ready Task to future day
  const readyDate = getFutureDate(currentYear, currentSeason, activeDay, preset.duration);
  const readyTask = {
    id: 'ready_' + Date.now(),
    type: machineKey.includes('keg') ? 'keg' : 'cask',
    label: `📦 ${preset.name} Ready (${location})`,
    sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`
  };
  
  const targetYearSchedule = getYearSchedule(readyDate.year);
  if (!targetYearSchedule[readyDate.season][readyDate.day]) targetYearSchedule[readyDate.season][readyDate.day] = [];
  targetYearSchedule[readyDate.season][readyDate.day].push(readyTask);

  saveSchedule();
  renderCalendar();
  closeModal();
});

// Delete task
window.deleteTask = function(day, id, event) {
  event.stopPropagation(); // Avoid opening modal when clicking delete
  const currentYearSchedule = getYearSchedule(currentYear);
  const list = currentYearSchedule[currentSeason][day] || [];
  currentYearSchedule[currentSeason][day] = list.filter(t => t.id !== id);
  
  saveSchedule();
  renderTasksForDay(day);
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
      updateMetaStats();
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
        updateMetaStats();
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
  updateMetaStats();
});

yearDownBtn.addEventListener('click', () => {
  if (currentYear > 1) {
    currentYear--;
    yearDisplay.innerText = currentYear;
    localStorage.setItem('stardew_current_year', currentYear);
    saveSchedule();
    renderCalendar();
    updateMetaStats();
  }
});

// Init
renderCalendar();
updateMetaStats();
