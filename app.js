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
  },
  cherry: { name: 'Cherry Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'spring', getDays: () => 28 },
  apricot: { name: 'Apricot Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'spring', getDays: () => 28 },
  orange: { name: 'Orange Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', getDays: () => 28 },
  peach: { name: 'Peach Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', getDays: () => 28 },
  apple: { name: 'Apple Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'fall', getDays: () => 28 },
  pomegranate: { name: 'Pomegranate Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'fall', getDays: () => 28 },
  banana: { name: 'Banana Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', getDays: () => 28 },
  mango: { name: 'Mango Tree', base: 28, regrow: 3, isTree: true, activeSeason: 'summer', getDays: () => 28 }
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

  // Render all gathered tasks
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

  // 1. Add Load Task to selected day
  const loadTask = {
    id: 'load_' + Date.now(),
    type: machineKey.includes('keg') ? 'keg' : 'cask',
    label: `📥 Load ${preset.name} (${location})`,
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
    type: machineKey.includes('keg') ? 'keg' : 'cask',
    label: `📦 ${preset.name} Ready (${location})`,
    sourceDay: `y${currentYear}_${currentSeason}_${activeDay}`,
    groupId: groupId,
    absDay: readyAbs
  };
  
  const targetYearSchedule = getYearSchedule(readyDate.year);
  if (!targetYearSchedule[readyDate.season][readyDate.day]) targetYearSchedule[readyDate.season][readyDate.day] = [];
  targetYearSchedule[readyDate.season][readyDate.day].push(readyTask);

  saveSchedule();
  renderCalendar();
  closeModal();
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
    const savedDbUrl = localStorage.getItem('stardew_firebase_url');
    const dbUrlInput = document.getElementById('sync-db-url');
    const statusMsg = document.getElementById('sync-status-msg');

    if (dbUrlInput && savedDbUrl) {
      dbUrlInput.value = savedDbUrl;
    }

    if (typeof firebase !== 'undefined') {
      const dbUrlToUse = savedDbUrl || "https://fluid-mechanics-reviewer-default-rtdb.firebaseio.com";
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

      if (statusMsg) {
        if (savedDbUrl) {
          statusMsg.innerText = `🟢 Connected (Channel: ${syncKey})`;
          statusMsg.style.color = '#10b981';
        } else {
          statusMsg.innerText = `🔴 Disconnected (Paste a Firebase URL to enable cloud sync)`;
          statusMsg.style.color = '#f59e0b';
        }
      }

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
        console.warn("Database sync error:", err);
        if (statusMsg) {
          statusMsg.innerText = `🔴 Sync error (Check database URL & rules)`;
          statusMsg.style.color = '#ef4444';
        }
      });
    }
  } catch (e) {
    console.warn("Firebase initialization failed:", e);
    const statusMsg = document.getElementById('sync-status-msg');
    if (statusMsg) {
      statusMsg.innerText = `🔴 Connection failed`;
      statusMsg.style.color = '#ef4444';
    }
  }
}

// Schedule Sync Setup listener
document.getElementById('form-sync').addEventListener('submit', (e) => {
  e.preventDefault();
  const url = document.getElementById('sync-db-url').value.trim();
  if (!url) {
    localStorage.removeItem('stardew_firebase_url');
    alert("🗑️ Cloud database URL cleared. Falling back to local storage.");
  } else {
    localStorage.setItem('stardew_firebase_url', url);
    alert("⚡ Database URL saved! Connecting to cloud database...");
  }
  window.location.reload();
});
