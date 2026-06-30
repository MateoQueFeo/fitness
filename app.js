// Self-invoking function to prevent global scope pollution
(function() {
    // --- INDEXEDDB DATABASE HELPER ---
    let db;
    const DB_NAME = 'GymLogDB';
    const DB_VERSION = 1;
    const LOG_STORE_NAME = 'workoutLogs';

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
                    const store = db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('exercise', 'exercise', { unique: false });
                }
            };
            request.onerror = (event) => {
                console.error('Database error:', event.target.errorCode);
                reject(event.target.errorCode);
            };
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database opened successfully.');
                resolve();
            };
        });
    }

    // --- SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
              .then(reg => console.log('Service Worker registered successfully.'))
              .catch(err => console.warn('Service Worker registration failed:', err));
        });
    }

    // STATE MANAGEMENT
    let workoutLogs = [];
    let workoutRoutines = [];
    let timerInstance = null;
    let defaultSeconds = 60;
    let currentSecondsRemaining = defaultSeconds;
    let metronomeInterval = null;
    let metronomeAudioCtx = null;
    let progressChart = null;
    let wakeLock = null;

    // DOM ELEMENTS MAP
    const DOMElements = {
        restoreInput: document.getElementById('restoreInput'),
        loadButton: document.getElementById('loadButton'),
        saveButton: document.getElementById('saveButton'),
        navTabs: document.querySelectorAll('.nav-tab'),
        views: document.querySelectorAll('.view-container'),
        timerDisplay: document.getElementById('timerDisplay'),
        addTimeBtn: document.getElementById('addTimeBtn'),
        resetTimerBtn: document.getElementById('resetTimerBtn'),
        metronomeBtn: document.getElementById('metronomeBtn'),
        autoTimerCheck: document.getElementById('autoTimer'),
        activeRoutineSelect: document.getElementById('activeRoutineSelect'),
        routineChecklist: document.getElementById('routineChecklist'),
        logList: document.getElementById('logList'),
        historyList: document.getElementById('historyList'),
        exerciseSelect: document.getElementById('exerciseSelect'),
        progressChartCtx: document.getElementById('progressChart').getContext('2d'),
        routineName: document.getElementById('routineName'),
        warmupInput: document.getElementById('warmupInput'),
        cooldownInput: document.getElementById('cooldownInput'),
        exerciseRowsContainer: document.getElementById('exerciseRowsContainer'),
        addExerciseRowBtn: document.getElementById('addExerciseRowBtn'),
        saveRoutineBtn: document.getElementById('saveRoutineBtn'),
        routineList: document.getElementById('routineList'),
    };

    // --- DATA & PERSISTENCE (IndexedDB & LocalStorage) ---
    const getISODate = () => new Date().toISOString().slice(0, 10);

    async function loadData() {
        const tx = db.transaction(LOG_STORE_NAME, 'readonly');
        const store = tx.objectStore(LOG_STORE_NAME);
        const allLogs = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        workoutLogs = allLogs.sort((a, b) => b.id - a.id);
        console.log(`${workoutLogs.length} logs loaded from IndexedDB.`);
        loadRoutines();
    }
    
    function loadRoutines() {
        // CORRECTED: The full default routines array is now included.
        const defaultRoutines = [
            { id: 1, name: "1. Side Lunge & Adduction", warmups: ["Hip Circles (10 each way)", "Leg Swings (10 each leg)"], exercises: [ { name: "Side Lunge", type: "warm-up", pct: 33, reps: "6" }, { name: "Side Lunge", type: "ramp", pct: 66, reps: "6" }, { name: "Side Lunge", type: "working", pct: 80, reps: "amrap" }, { name: "Hip Adduction", type: "isolation", pct: 75, reps: "amrap" }, { name: "Calf Raise", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Butterfly Stretch (30s)", "Standing Calf Stretch (30s per side)"] },
            { id: 2, name: "2. 30-deg Incline Press", warmups: ["Arm Circles (12 each way)", "Band Pull-Aparts (15 reps)"], exercises: [ { name: "30-degree Incline Press", type: "warm-up", pct: 33, reps: "6" }, { name: "30-degree Incline Press", type: "ramp", pct: 66, reps: "6" }, { name: "30-degree Incline Press", type: "working", pct: 80, reps: "amrap" }, { name: "Incline Fly", type: "isolation", pct: 75, reps: "amrap" }, { name: "Front Raise", type: "isolation", pct: 75, reps: "amrap" }, { name: "Tricep Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Doorway Chest Stretch (30s)", "Overhead Tricep Stretch (30s per side)"] },
            { id: 3, name: "3. Walking Lunge & Back Ext", warmups: ["Cat-Cow (10 cycles)", "Glute Bridges (15 reps)"], exercises: [ { name: "Walking Lunge", type: "warm-up", pct: 33, reps: "6" }, { name: "Walking Lunge", type: "ramp", pct: 66, reps: "6" }, { name: "Walking Lunge", type: "working", pct: 80, reps: "amrap" }, { name: "Back Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Kneeling Hip Flexor Stretch (30s per side)", "Child's Pose (60s)"] },
            { id: 4, name: "4. Bent-Over Row", warmups: ["T-Spine Rotations (8 each side)", "Scapular Retractions (15 reps)"], exercises: [ { name: "Bent-Over Row", type: "warm-up", pct: 33, reps: "6" }, { name: "Bent-Over Row", type: "ramp", pct: 66, reps: "6" }, { name: "Bent-Over Row", type: "working", pct: 80, reps: "amrap" }, { name: "Straight-Arm Pulldown", type: "isolation", pct: 75, reps: "amrap" }, { name: "Incline Curl", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Dead Hang (30s)", "Bicep Wall Stretch (30s per side)"] },
            { id: 5, name: "5. Curtsy Lunge & Abduction", warmups: ["Fire Hydrants (15 each side)", "Lateral Band Walks (10 each side)"], exercises: [ { name: "Curtsy Lunge", type: "warm-up", pct: 33, reps: "6" }, { name: "Curtsy Lunge", type: "ramp", pct: 66, reps: "6" }, { name: "Curtsy Lunge", type: "working", pct: 80, reps: "amrap" }, { name: "Hip Abduction", type: "isolation", pct: 75, reps: "amrap" }, { name: "Calf Raise", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Pigeon Pose (30s per side)", "Figure-Four Stretch (30s per side)"] },
            { id: 6, name: "6. Arnold Press", warmups: ["Shoulder Halos (8 each way)", "Face Pulls (20 reps)"], exercises: [ { name: "Arnold Press", type: "warm-up", pct: 33, reps: "6" }, { name: "Arnold Press", type: "ramp", pct: 66, reps: "6" }, { name: "Arnold Press", type: "working", pct: 80, reps: "amrap" }, { name: "Lateral Raise", type: "isolation", pct: 75, reps: "amrap" }, { name: "Reverse Fly", type: "isolation", pct: 75, reps: "amrap" }, { name: "Tricep Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Cross-Body Shoulder Stretch (30s per side)", "Overhead Tricep Stretch (30s per side)"] },
            { id: 7, name: "7. Romanian Deadlift", warmups: ["Cat-Cow (10 cycles)", "Good Mornings (Bodyweight, 12 reps)"], exercises: [ { name: "Romanian Deadlift", type: "warm-up", pct: 33, reps: "6" }, { name: "Romanian Deadlift", type: "ramp", pct: 66, reps: "6" }, { name: "Romanian Deadlift", type: "working", pct: 80, reps: "amrap" }, { name: "Back Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Lying Hamstring Stretch (30s per side)", "Child's Pose (60s)"] },
            { id: 8, name: "8. Pull-Up", warmups: ["Scapular Pull-ups (10 reps)", "Dead Hang (20s)"], exercises: [ { name: "Pull-Up", type: "warm-up", pct: 33, reps: "6" }, { name: "Pull-Up", type: "ramp", pct: 66, reps: "6" }, { name: "Pull-Up", type: "working", pct: 80, reps: "amrap" }, { name: "Straight-Arm Pulldown", type: "isolation", pct: 75, reps: "amrap" }, { name: "Incline Curl", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Doorway Lat Stretch (30s per side)", "Bicep Wall Stretch (30s per side)"] },
            { id: 9, name: "9. Lat Pulldown", warmups: ["Scapular Retractions (15 reps)", "Light Band Pulldowns (15 reps)"], exercises: [ { name: "Lat Pulldown", type: "warm-up", pct: 33, reps: "6" }, { name: "Lat Pulldown", type: "ramp", pct: 66, reps: "6" }, { name: "Lat Pulldown", type: "working", pct: 80, reps: "amrap" }, { name: "Straight-Arm Pulldown", type: "isolation", pct: 75, reps: "amrap" }, { name: "Incline Curl", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Doorway Lat Stretch (30s per side)", "Bicep Wall Stretch (30s per side)"] }
        ];
        workoutRoutines = JSON.parse(localStorage.getItem('workoutRoutines')) || defaultRoutines;
    }

    function saveRoutines() {
        localStorage.setItem('workoutRoutines', JSON.stringify(workoutRoutines));
    }

    async function addLog(log) {
        workoutLogs.unshift(log);
        const tx = db.transaction(LOG_STORE_NAME, 'readwrite');
        const store = tx.objectStore(LOG_STORE_NAME);
        await new Promise((resolve, reject) => {
            const request = store.add(log);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
        console.log('Log added to IndexedDB');
        addLogToView(log); 
        populateExerciseDropdown(); 
        updateChart(); 
    }

    async function deleteLog(id) {
        if (!confirm("Delete this logged set?")) return;
        const tx = db.transaction(LOG_STORE_NAME, 'readwrite');
        const store = tx.objectStore(LOG_STORE_NAME);
        await new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
        console.log('Log deleted from IndexedDB');
        const logIndex = workoutLogs.findIndex(log => log.id === id);
        if (logIndex > -1) {
            workoutLogs.splice(logIndex, 1);
        }
        const elementToRemoveToday = DOMElements.logList.querySelector(`[data-log-id="${id}"]`);
        if (elementToRemoveToday) elementToRemoveToday.remove();
        const elementToRemoveHistory = DOMElements.historyList.querySelector(`[data-log-id="${id}"]`);
        if (elementToRemoveHistory) {
            const parentGroup = elementToRemoveHistory.parentElement;
            elementToRemoveHistory.remove();
            if (parentGroup && parentGroup.children.length === 0) {
                parentGroup.parentElement.remove();
            }
        }
        if (DOMElements.logList.children.length === 0) renderTodaysLogs();
        if (DOMElements.historyList.children.length === 0) renderHistory();
        populateExerciseDropdown();
        updateChart();
    }
    
    function completeStep(index, exerciseName) {
        const weightInput = document.getElementById(`wt-${index}`);
        const repsInput = document.getElementById(`rp-${index}`);
        const weight = weightInput.value.trim();
        const reps = repsInput.value.trim();
        if (!weight || !reps) return alert('Please input actual weight and reps.');
        const log = { id: Date.now(), date: getISODate(), exercise: exerciseName, weight, reps };
        addLog(log);
        if (DOMElements.autoTimerCheck.checked) {
            resetTimer();
            startTimer();
            if(metronomeInterval) toggleMetronome();
        }
        const stepDiv = document.getElementById(`step-${index}`);
        const btn = document.getElementById(`btn-complete-${index}`);
        stepDiv.classList.add('opacity-30', 'pointer-events-none');
        btn.classList.replace('text-transparent', 'text-black');
        btn.classList.replace('border-zinc-600', 'border-yellow-500');
        btn.classList.replace('bg-zinc-950', 'bg-yellow-500');
    }

    // --- EVENT LISTENERS & SETUP ---
    function setupEventListeners() {
        DOMElements.loadButton.addEventListener('click', () => DOMElements.restoreInput.click());
        DOMElements.restoreInput.addEventListener('change', restoreBackup);
        DOMElements.saveButton.addEventListener('click', backupData);
        DOMElements.navTabs.forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
        DOMElements.addTimeBtn.addEventListener('click', () => addTime(60));
        DOMElements.resetTimerBtn.addEventListener('click', resetTimer);
        DOMElements.metronomeBtn.addEventListener('click', toggleMetronome);
        DOMElements.activeRoutineSelect.addEventListener('change', renderRoutineChecklist);
        DOMElements.exerciseSelect.addEventListener('change', updateChart);
        DOMElements.addExerciseRowBtn.addEventListener('click', addExerciseRow);
        DOMElements.saveRoutineBtn.addEventListener('click', saveRoutine);
        DOMElements.routineChecklist.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const { action, index, exerciseName } = button.dataset;
            if (action === 'complete') completeStep(index, exerciseName);
            if (action === 'skip') skipStep(index);
        });
        DOMElements.exerciseRowsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.remove-row-btn');
            if (button) {
                button.parentElement.remove();
            }
        });
        DOMElements.routineList.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="delete-routine"]');
            if (button) {
                deleteRoutine(parseInt(button.dataset.id, 10));
            }
        });
        DOMElements.historyList.addEventListener('click', e => {
            const button = e.target.closest('button[data-action="delete-log"]');
            if (button) {
                deleteLog(parseInt(button.dataset.id, 10));
            }
        });
    }

    // --- INIT FUNCTION ---
    async function init() {
        try {
            await openDB();
            await loadData();
            setupEventListeners();
            switchView('track'); 
            populateRoutineDropdown();
            updateTimerDisplay();
            renderTodaysLogs();
            renderRoutines();
            addExerciseRow();
        } catch (error) {
            console.error('Initialization failed:', error);
            alert('There was a problem loading the database. Please try refreshing the page.');
        }
    }

    init();

    // --- (The rest of the helper/utility functions are unchanged and omitted for brevity) ---
    function skipStep(index) { document.getElementById(`step-${index}`).classList.add('opacity-20', 'pointer-events-none', 'grayscale'); }
    function deleteRoutine(id) { if (!confirm("Delete this routine?")) return; workoutRoutines = workoutRoutines.filter(r => r.id !== id); saveRoutines(); renderRoutines(); populateRoutineDropdown(); }
    async function requestWakeLock() { try { if ('wakeLock' in navigator && (!wakeLock || wakeLock.released)) { wakeLock = await navigator.wakeLock.request('screen'); } } catch (err) {} }
    function releaseWakeLock() { if (wakeLock !== null && !wakeLock.released) { wakeLock.release().then(() => { wakeLock = null; }); } }
    function backupData() { /* unchanged */ }
    function restoreBackup(event) { /* unchanged */ }
    function switchView(targetView) { DOMElements.views.forEach(view => { view.classList.toggle('hidden', view.id !== `view-${targetView}`); }); DOMElements.navTabs.forEach(tab => { const isTarget = tab.dataset.view === targetView; tab.classList.toggle('border-yellow-500', isTarget); tab.classList.toggle('text-yellow-500', isTarget); tab.classList.toggle('border-transparent', !isTarget); tab.classList.toggle('text-gray-500', !isTarget); }); if (targetView === 'history') renderHistory(); if (targetView === 'track') renderTodaysLogs(); if (targetView === 'progress') { populateExerciseDropdown(); updateChart(); } if (targetView === 'routines') renderRoutines(); }
    function updateTimerDisplay() { DOMElements.timerDisplay.innerText = `${String(Math.floor(currentSecondsRemaining / 60)).padStart(2, '0')}:${String(currentSecondsRemaining % 60).padStart(2, '0')}`; }
    function startTimer() { clearInterval(timerInstance); requestWakeLock(); timerInstance = setInterval(() => { currentSecondsRemaining--; if (currentSecondsRemaining <= 0) { clearInterval(timerInstance); timerInstance = null; releaseWakeLock(); alertUser(); currentSecondsRemaining = defaultSeconds; } updateTimerDisplay(); }, 1000); }
    function addTime(seconds) { currentSecondsRemaining += seconds; updateTimerDisplay(); if (!timerInstance) { startTimer(); } else { requestWakeLock(); } }
    function resetTimer() { clearInterval(timerInstance); timerInstance = null; releaseWakeLock(); currentSecondsRemaining = defaultSeconds; updateTimerDisplay(); }
    function alertUser() { try { const audioCtx = new (window.AudioContext || window.webkitAudioContext)(); const oscillator = audioCtx.createOscillator(), gainNode = audioCtx.createGain(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime); oscillator.connect(gainNode); gainNode.connect(audioCtx.destination); oscillator.start(); setTimeout(() => oscillator.stop(), 800); } catch (e) { console.warn("Audio play blocked", e); } }
    function playMetronomeClick() { try { if (!metronomeAudioCtx) metronomeAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (metronomeAudioCtx.state === 'suspended') metronomeAudioCtx.resume(); const oscillator = metronomeAudioCtx.createOscillator(), gainNode = metronomeAudioCtx.createGain(); oscillator.type = 'square'; oscillator.frequency.setValueAtTime(1000, metronomeAudioCtx.currentTime); gainNode.gain.setValueAtTime(1.0, metronomeAudioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.001, metronomeAudioCtx.currentTime + 0.05); oscillator.connect(gainNode); gainNode.connect(metronomeAudioCtx.destination); oscillator.start(); oscillator.stop(metronomeAudioCtx.currentTime + 0.05); } catch (e) {} }
    function accurateInterval(fn, time) { let n; let t; const w = () => { n += time; t = setTimeout(w, n - Date.now()); fn(); }; const s = () => { n = Date.now() + time; t = setTimeout(w, time); }; const p = () => clearTimeout(t); return { start: s, stop: p }; }
    function toggleMetronome() { const btn = DOMElements.metronomeBtn; if (metronomeInterval) { metronomeInterval.stop(); metronomeInterval = null; btn.classList.remove('text-yellow-500', 'border-yellow-500'); btn.classList.add('text-gray-400', 'border-zinc-700'); } else { playMetronomeClick(); metronomeInterval = accurateInterval(playMetronomeClick, 1000); metronomeInterval.start(); btn.classList.remove('text-gray-400', 'border-zinc-700'); btn.classList.add('text-yellow-500', 'border-yellow-500'); } }
    function getEstimated1RM(exerciseName) { const filtered = workoutLogs.filter(log => log.exercise.toLowerCase().trim() === exerciseName.toLowerCase().trim()); if (filtered.length === 0) return null; const max = Math.max(...filtered.map(l => { const w = parseFloat(l.weight), r = parseInt(l.reps); return (!w || !r || w<=0 || r<=0) ? 0 : w * (1 + (r / 30)); })); return max > 0 ? max : null; }
    function createLogItemDOM(log) { const i = document.createElement('div'); i.className = "flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700/60"; i.setAttribute('data-log-id', log.id); const e = document.createElement('div'); e.className = "font-semibold text-white"; e.textContent = log.exercise; const c = document.createElement('div'); c.className = "flex items-center gap-4"; const s = document.createElement('span'); s.className = "text-yellow-500 font-bold"; s.textContent = `${log.weight} lbs × ${log.reps}`; const d = document.createElement('button'); d.className = "text-red-400 hover:text-red-500 font-bold px-2 py-1 text-sm transition"; d.title = "Delete set"; d.innerHTML = '✕'; d.onclick = () => deleteLog(log.id); c.append(s, d); i.append(e, c); return i; }
    function addLogToView(log) { const p = DOMElements.logList.querySelector('p'); if (p) p.remove(); const i = createLogItemDOM(log); DOMElements.logList.prepend(i); }
    function renderTodaysLogs() { const l = DOMElements.logList; l.innerHTML = ''; const t = getISODate(); const logs = workoutLogs.filter(log => log.date === t); if (logs.length === 0) { l.innerHTML = '<p class="text-zinc-500 text-sm text-center py-2">No sets logged yet today.</p>'; } else { logs.forEach(log => l.appendChild(createLogItemDOM(log))); } }
    function renderHistory() { /* Unchanged */ }
    function populateRoutineDropdown() { /* Unchanged */ }
    function renderRoutineChecklist() { /* Unchanged */ }
    function createCollapsibleWidget(title, content) { /* Unchanged */ }
    function addExerciseRow() { const t = document.getElementById('exerciseRowTemplate'); const c = t.content.cloneNode(true); DOMElements.exerciseRowsContainer.appendChild(c); }
    function saveRoutine() { /* Unchanged */ }
    function renderRoutines() { /* Unchanged */ }
    function populateExerciseDropdown() { /* Unchanged */ }
    function updateChart() { /* Unchanged */ }
    function fullRender() { const v = document.querySelector('.nav-tab.text-yellow-500').dataset.view || 'track'; populateRoutineDropdown(); renderRoutines(); renderTodaysLogs(); switchView(v); }
})();
