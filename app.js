// App State
let currentSeason = 'spring';
let activeDay = 1;
// Schedule structure: { season: { day_number: [ { id, type, label, sourceDay } ] } }
let schedule = JSON.parse(localStorage.getItem('stardew_schedule')) || {
  spring: {},
  summer: {},
  fall: {},
  winter: {}
};

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
const seasonBtns = document.querySelectorAll('.season-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Helper to save schedule
function saveSchedule() {
  localStorage.setItem('stardew_schedule', JSON.stringify(schedule));
  updateMetaStats();
}

// Calculate future date helper
function getFutureDate(startSeason, startDay, durationDays) {
  const seasonsOrder = ['spring', 'summer', 'fall', 'winter'];
  let currentSeasonIdx = seasonsOrder.indexOf(startSeason);
  let targetDay = startDay + durationDays;

  while (targetDay > 28) {
    targetDay -= 28;
    currentSeasonIdx = (currentSeasonIdx + 1) % 4;
  }

  return {
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
  
  const dayTasks = schedule[currentSeason][day] || [];
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
  modalTitle.innerText = `Day ${day} of ${currentSeason.toUpperCase()}`;
  modalOverlay.style.display = 'flex';
};

function closeModal() {
  modalOverlay.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Modal Tabs switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Gifting & Professions change trigger
function updateMetaStats() {
  let cropCount = 0;
  let kegCount = 0;
  let caskCount = 0;

  const seasons = ['spring', 'summer', 'fall', 'winter'];
  seasons.forEach(s => {
    for (let d = 1; d <= 28; d++) {
      const dayTasks = schedule[s][d] || [];
      dayTasks.forEach(task => {
        if (task.type === 'harvest') cropCount++;
        if (task.label.includes('Keg Ready')) kegCount++;
        if (task.label.includes('Cask Ready')) caskCount++;
      });
    }
  });

  document.getElementById('stat-crops').innerText = cropCount;
  document.getElementById('stat-kegs').innerText = kegCount;
  document.getElementById('stat-casks').innerText = caskCount;
}

// Schedule Manual Note
document.getElementById('form-manual').addEventListener('submit', (e) => {
  e.preventDefault();
  const label = document.getElementById('manual-label').value.strip || document.getElementById('manual-label').value;
  if (!label) return;

  const task = {
    id: 'man_' + Date.now(),
    type: 'manual',
    label: label
  };

  if (!schedule[currentSeason][activeDay]) schedule[currentSeason][activeDay] = [];
  schedule[currentSeason][activeDay].push(task);
  
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
  const agriculturist = document.getElementById('crop-agri').checked;

  const crop = CROP_GROWTH_PRESETS[cropKey];
  const growthDays = crop.getDays(fertilizer, agriculturist);

  // 1. Add "Plant [Crop]" to selected day
  const plantTask = {
    id: 'plant_' + Date.now(),
    type: 'plant',
    label: `🌱 Plant ${crop.name}`
  };
  if (!schedule[currentSeason][activeDay]) schedule[currentSeason][activeDay] = [];
  schedule[currentSeason][activeDay].push(plantTask);

  // 2. Add "Harvest [Crop]" to future day
  const harvestDate = getFutureDate(currentSeason, activeDay, growthDays);
  const harvestTask = {
    id: 'harvest_' + Date.now(),
    type: 'harvest',
    label: `🌾 Harvest ${crop.name}`,
    sourceDay: `${currentSeason}_${activeDay}`
  };
  if (!schedule[harvestDate.season][harvestDate.day]) schedule[harvestDate.season][harvestDate.day] = [];
  schedule[harvestDate.season][harvestDate.day].push(harvestTask);

  // 3. For multi-harvest crops (e.g. Ancient Fruit), schedule subsequent harvests
  if (crop.regrow > 0) {
    let nextHarvest = getFutureDate(harvestDate.season, harvestDate.day, crop.regrow);
    // Let's schedule regrows for up to 3 cycles (or end of season)
    for (let i = 0; i < 3; i++) {
      const regrowTask = {
        id: 'harvest_regrow_' + Date.now() + '_' + i,
        type: 'harvest',
        label: `🌾 Harvest ${crop.name} (Regrow)`,
        sourceDay: `${currentSeason}_${activeDay}`
      };
      if (!schedule[nextHarvest.season][nextHarvest.day]) schedule[nextHarvest.season][nextHarvest.day] = [];
      schedule[nextHarvest.season][nextHarvest.day].push(regrowTask);
      nextHarvest = getFutureDate(nextHarvest.season, nextHarvest.day, crop.regrow);
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
  const preset = MACHINE_PRESETS[machineKey];

  // 1. Add Load Task to selected day
  const loadTask = {
    id: 'load_' + Date.now(),
    type: machineKey.includes('keg') ? 'keg' : 'cask',
    label: `📥 Load ${preset.name}`
  };
  if (!schedule[currentSeason][activeDay]) schedule[currentSeason][activeDay] = [];
  schedule[currentSeason][activeDay].push(loadTask);

  // 2. Add Ready Task to future day
  const readyDate = getFutureDate(currentSeason, activeDay, preset.duration);
  const readyTask = {
    id: 'ready_' + Date.now(),
    type: machineKey.includes('keg') ? 'keg' : 'cask',
    label: `📦 ${preset.name} Ready`,
    sourceDay: `${currentSeason}_${activeDay}`
  };
  if (!schedule[readyDate.season][readyDate.day]) schedule[readyDate.season][readyDate.day] = [];
  schedule[readyDate.season][readyDate.day].push(readyTask);

  saveSchedule();
  renderCalendar();
  closeModal();
});

// Delete task
window.deleteTask = function(day, id, event) {
  event.stopPropagation(); // Avoid opening modal when clicking delete
  const list = schedule[currentSeason][day] || [];
  schedule[currentSeason][day] = list.filter(t => t.id !== id);
  
  saveSchedule();
  renderTasksForDay(day);
};

// Season selection events
seasonBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    seasonBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSeason = btn.dataset.season;
    renderCalendar();
  });
});

// Init
renderCalendar();
updateMetaStats();
