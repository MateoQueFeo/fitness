const DB_NAME = 'WorkoutTrackerDB';
const STORE_NAME = 'workoutsStore';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onerror = (event) => reject('IndexedDB error: ' + event.target.error);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}
async function addWorkout(workout) { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); const request = store.add(workout); request.onsuccess = (event) => resolve(event.target.result); tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error); }); }
async function updateWorkout(workout) { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); store.put(workout); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }); }
async function deleteWorkout(id) { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); store.delete(id); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }); }
async function getAllWorkouts() { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readonly'); const store = tx.objectStore(STORE_NAME); const request = store.getAll(); request.onsuccess = () => resolve(request.result || []); tx.oncomplete = () => db.close(); request.onerror = () => reject(request.error); }); }
async function clearWorkouts() { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); store.clear(); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }); }

const timerDisplayEl = document.getElementById('timerDisplay');
const formTitleEl = document.getElementById('formTitle');
const exerciseInputEl = document.getElementById('exercise');
const weightInputEl = document.getElementById('weight');
const repsInputEl = document.getElementById('reps');
const exerciseOptionsEl = document.getElementById('exerciseOptions');
const submitBtnEl = document.getElementById('submitBtn');
const cancelEditBtnEl = document.getElementById('cancelEditBtn');
const prContainerEl = document.getElementById('prContainer');
const chartExerciseSelectEl = document.getElementById('chartExerciseSelect');
const historyContainerEl = document.getElementById('historyContainer');
const toastEl = document.getElementById('toast');

const defaultExercises = [ "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull Up", "Dumbbell Curl", "Leg Press", "Romanian Deadlift", "Front Squat", "Lat Pulldown", "Tricep Extension" ];
let workouts = [];
let chartInstance = null;
let editingWorkoutId = null;
let timerInterval, timeRemaining = 60, isTimerRunning = false, audioCtx, audioInitialized = false;

function initAudio() { if (!audioInitialized) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); audioInitialized = true; } catch (e) { console.error("Audio Context failed.", e); } } }
['click', 'touchstart'].forEach(evt => { document.body.addEventListener(evt, initAudio, { once: true }); });
function showToast(message, type = 'info') { toastEl.textContent = message; toastEl.className = 'show'; if (type === 'success') toastEl.classList.add('success'); if (type === 'error') toastEl.classList.add('error'); setTimeout(() => { toastEl.className = toastEl.className.replace(/show|success|error/g, '').trim(); }, 3000); }
function startTimer() { if (isTimerRunning) return; initAudio(); timeRemaining = 60; isTimerRunning = true; timerDisplayEl.classList.add('active'); updateTimerUI(timeRemaining); timerInterval = setInterval(() => { timeRemaining--; updateTimerUI(timeRemaining); if (timeRemaining <= 0) { clearInterval(timerInterval); isTimerRunning = false; timerDisplayEl.classList.remove('active'); playBeep(); timeRemaining = 60; updateTimerUI(timeRemaining); } }, 1000); }
function addMinute() { initAudio(); timeRemaining += 60; updateTimerUI(timeRemaining); }
function stopTimer() { clearInterval(timerInterval); isTimerRunning = false; timerDisplayEl.classList.remove('active'); timeRemaining = 60; updateTimerUI(timeRemaining); }
function updateTimerUI(seconds) { const mins = Math.floor(seconds / 60).toString().padStart(2, '0'); const secs = (seconds % 60).toString().padStart(2, '0'); timerDisplayEl.innerText = `${mins}:${secs}`; }
function playBeep() { if (!audioCtx || audioCtx.state === 'suspended') return; try { const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.5); } catch (e) { console.error("Audio playback failed.", e); } }
function calculate1RM(weight, reps) { if (reps === 1) return weight; return Math.round(weight * (1 + reps / 30)); }
function normalizeExerciseName(str) { if (!str) return ''; return str.trim().toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function formatDateForDisplay(dateString) { if (!dateString) return ''; const date = new Date(dateString); return date.toLocaleDateString(undefined, { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric' });}

window.onload = async function() {
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js'); }
    try {
        workouts = await getAllWorkouts();
        workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
        showToast("Could not load history.", "error");
    }
    renderHistory();
    renderPRs();
    updateExerciseDropdowns();
    updateChart();
};

function createWorkoutRow(workout) {
    const row = document.createElement('tr');
    row.id = `workout-row-${workout.id}`;
    row.innerHTML = `
        <td>${workout.exercise}</td>
        <td>${workout.weight} × ${workout.reps}</td>
        <td><strong>${workout.estimated1RM}</strong></td>
        <td style="white-space: nowrap;">
            <button class="action-btn edit-btn" onclick="editSet(${workout.id})">Edit</button>
            <button class="action-btn del-btn" onclick="deleteSet(${workout.id})">Del</button>
        </td>
    `;
    return row;
}

function findOrCreateSessionGroup(date) {
    const groupId = `session-${date}`;
    let groupEl = document.getElementById(groupId);
    if (!groupEl) {
        groupEl = document.createElement('div');
        groupEl.className = 'session-group';
        groupEl.id = groupId;
        groupEl.innerHTML = `
            <h3 class="session-header">📅 ${formatDateForDisplay(date)}</h3>
            <table>
                <thead><tr><th>Exercise</th><th>W × R</th><th>1RM</th><th>Actions</th></tr></thead>
                <tbody></tbody>
            </table>
        `;
        const existingGroups = historyContainerEl.querySelectorAll('.session-group');
        let inserted = false;
        for (const existingGroup of existingGroups) {
            const existingDate = existingGroup.id.replace('session-', '');
            if (date > existingDate) {
                historyContainerEl.insertBefore(groupEl, existingGroup);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            historyContainerEl.appendChild(groupEl);
        }
        historyContainerEl.querySelector('p')?.remove();
    }
    return groupEl.querySelector('tbody');
}

async function processSet() {
    const exercise = normalizeExerciseName(exerciseInputEl.value);
    const weight = parseFloat(weightInputEl.value);
    const reps = parseInt(repsInputEl.value);

    if (!exercise || isNaN(weight) || isNaN(reps) || weight < 0 || reps < 0) {
        showToast("Please enter valid exercise details.", "error"); return;
    }

    const estimated1RM = calculate1RM(weight, reps);

    try {
        if (editingWorkoutId !== null) {
            const workoutIndex = workouts.findIndex(w => w.id === editingWorkoutId);
            if (workoutIndex > -1) {
                const workoutToUpdate = { ...workouts[workoutIndex], exercise, weight, reps, estimated1RM };
                await updateWorkout(workoutToUpdate);
                workouts[workoutIndex] = workoutToUpdate;
                const rowToUpdate = document.getElementById(`workout-row-${editingWorkoutId}`);
                if (rowToUpdate) {
                    rowToUpdate.cells[0].textContent = workoutToUpdate.exercise;
                    rowToUpdate.cells[1].textContent = `${workoutToUpdate.weight} × ${workoutToUpdate.reps}`;
                    rowToUpdate.cells[2].querySelector('strong').textContent = workoutToUpdate.estimated1RM;
                }
                showToast("Set updated!", "success");
            }
            cancelEdit();
        } else {
            const date = new Date().toISOString().slice(0, 10);
            const newWorkout = { date, exercise, weight, reps, estimated1RM };
            const newId = await addWorkout(newWorkout);
            newWorkout.id = newId;
            workouts.unshift(newWorkout);
            const tableBody = findOrCreateSessionGroup(date);
            const newRow = createWorkoutRow(newWorkout);
            tableBody.insertBefore(newRow, tableBody.firstChild);
            startTimer();
        }
        renderPRs();
        updateExerciseDropdowns();
        updateChart();
        weightInputEl.value = ''; repsInputEl.value = ''; exerciseInputEl.value = '';
        exerciseInputEl.focus();
    } catch (e) {
        showToast("Error saving data.", "error");
    }
}

function editSet(id) {
    editingWorkoutId = id;
    const workout = workouts.find(w => w.id === id);
    if (workout) {
        exerciseInputEl.value = workout.exercise;
        weightInputEl.value = workout.weight;
        repsInputEl.value = workout.reps;
        formTitleEl.innerText = `Edit Set (${formatDateForDisplay(workout.date)})`;
        submitBtnEl.innerText = 'Update Set';
        cancelEditBtnEl.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function cancelEdit() {
    editingWorkoutId = null;
    formTitleEl.innerText = 'Log a Set'; submitBtnEl.innerText = 'Log Set';
    cancelEditBtnEl.style.display = 'none';
    exerciseInputEl.value = ''; weightInputEl.value = ''; repsInputEl.value = '';
}

async function deleteSet(id) {
    if (confirm("Are you sure you want to delete this set?")) {
        try {
            const workoutIndex = workouts.findIndex(w => w.id === id);
            if (workoutIndex === -1) return;
            await deleteWorkout(id);
            workouts.splice(workoutIndex, 1);
            const rowToDelete = document.getElementById(`workout-row-${id}`);
            if (rowToDelete) {
                const groupTable = rowToDelete.closest('table');
                rowToDelete.remove();
                if (groupTable.querySelector('tbody').rows.length === 0) {
                    groupTable.closest('.session-group').remove();
                }
            }
            if (workouts.length === 0) {
                historyContainerEl.innerHTML = '<p style="color: var(--text-secondary);">No workouts logged yet.</p>';
            }
            if (editingWorkoutId === id) cancelEdit();
            renderPRs();
            updateExerciseDropdowns();
            updateChart();
            showToast("Set deleted.", "info");
        } catch (e) {
            showToast("Error deleting set.", "error");
        }
    }
}

function renderHistory() {
    historyContainerEl.innerHTML = '';
    if (workouts.length === 0) {
        historyContainerEl.innerHTML = '<p style="color: var(--text-secondary);">No workouts logged yet.</p>';
        return;
    }
    for (const workout of workouts) {
        const tableBody = findOrCreateSessionGroup(workout.date);
        tableBody.appendChild(createWorkoutRow(workout));
    }
}

function renderPRs() { if (workouts.length === 0) { prContainerEl.innerHTML = '<p style="color: var(--text-secondary); margin: 0;">Log a workout to see personal records.</p>'; return; } const prs = workouts.reduce((acc, w) => { if (!acc[w.exercise] || w.estimated1RM > acc[w.exercise].estimated1RM) { acc[w.exercise] = w; } return acc; }, {}); const sortedPRExercises = Object.keys(prs).sort(); prContainerEl.innerHTML = `<table><thead><tr><th>Exercise</th><th>Best Set</th><th>Best 1RM</th></tr></thead><tbody>${sortedPRExercises.map(exName => `<tr><td><strong>${prs[exName].exercise}</strong></td><td>${prs[exName].weight} × ${prs[exName].reps}</td><td class="pr-gold">★ ${prs[exName].estimated1RM}</td></tr>`).join('')}</tbody></table>`; }

function updateExerciseDropdowns() {
    const historyExercises = workouts.map(w => w.exercise);
    const combinedExercises = [...new Set([...defaultExercises, ...historyExercises])].sort();
    const currentDatalistValues = Array.from(exerciseOptionsEl.options).map(opt => opt.value);

    if (JSON.stringify(combinedExercises) !== JSON.stringify(currentDatalistValues)) {
        exerciseOptionsEl.innerHTML = combinedExercises.map(ex => `<option value="${ex}"></option>`).join('');
    }

    const uniqueLoggedExercises = [...new Set(workouts.map(w => w.exercise))].sort();
    const currentSelectValues = Array.from(chartExerciseSelectEl.options).map(opt => opt.value).filter(val => val !== '');

    if (JSON.stringify(uniqueLoggedExercises) !== JSON.stringify(currentSelectValues)) {
        const currentChartValue = chartExerciseSelectEl.value;
        chartExerciseSelectEl.innerHTML = '<option value="">-- Select an Exercise --</option>' + uniqueLoggedExercises.map(ex => `<option value="${ex}">${ex}</option>`).join('');
        if (uniqueLoggedExercises.includes(currentChartValue)) {
            chartExerciseSelectEl.value = currentChartValue;
        } else if (uniqueLoggedExercises.length > 0 && !currentChartValue) {
            chartExerciseSelectEl.value = uniqueLoggedExercises[0];
        }
    }
}

function updateChart() { const selectedExercise = chartExerciseSelectEl.value; const canvas = document.getElementById('progressChart'); if (chartInstance) { chartInstance.destroy(); chartInstance = null; } if (!selectedExercise) { canvas.style.display = 'none'; return; } canvas.style.display = 'block'; const dailyMax = workouts.filter(w => w.exercise === selectedExercise).reduce((acc, w) => { if (!acc[w.date] || w.estimated1RM > acc[w.date]) acc[w.date] = w.estimated1RM; return acc; }, {}); const sortedDates = Object.keys(dailyMax).sort((a, b) => new Date(a) - new Date(b)); const chartData = sortedDates.map(date => dailyMax[date]); renderChartCanvas(sortedDates, chartData, selectedExercise); }
function renderChartCanvas(labels, data, exerciseName) { const ctx = document.getElementById('progressChart').getContext('2d'); Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(); chartInstance = new Chart(ctx, { type: 'line', data: { labels: labels.map(d => d.substring(5)), datasets: [{ label: `Est. 1RM for ${exerciseName}`, data: data, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--gold-primary').trim(), backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 2, pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--gold-primary').trim(), fill: true, tension: 0.1 }] }, options: { responsive: true, scales: { y: { beginAtZero: false, title: { display: true, text: 'Weight' }, grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() } }, x: { grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() } } } } }); }

function exportToCSV() { if (workouts.length === 0) { showToast("No data to export.", "error"); return; } let csvContent = "Date,Exercise,Weight,Reps,Estimated 1RM\n"; const sortedForExport = [...workouts].sort((a,b) => new Date(a.date) - new Date(b.date)); sortedForExport.forEach(w => { const safeExercise = `"${w.exercise.replace(/"/g, '""')}"`; csvContent += `${w.date},${safeExercise},${w.weight},${w.reps},${w.estimated1RM}\n`; }); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", `workout_history_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); showToast("Backup CSV file exported!", "success"); }

function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        if (insideQuote) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                insideQuote = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                insideQuote = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                if (char === '\r') i++;
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
}
function parseDateFromCSV(dateString) { if (!dateString) return null; const cleanStr = dateString.replace(/"/g, '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) { return cleanStr; } return null; }

async function importFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const csvText = e.target.result;
        const rows = parseCSV(csvText);
        if (rows.length <= 1) { showToast("CSV file is empty or invalid.", "error"); return; }
        let importedCount = 0;
        const promises = [];
        for (let i = 1; i < rows.length; i++) {
            try {
                const row = rows[i];
                if (row.length < 4 || !row[0]) continue;
                const date = parseDateFromCSV(row[0]);
                const exercise = row[1];
                const weight = parseFloat(row[2]);
                const reps = parseInt(row[3]);
                if (date && exercise && !isNaN(weight) && !isNaN(reps)) {
                    const estimated1RM = parseInt(row[4]) || calculate1RM(weight, reps);
                    promises.push(addWorkout({ date, exercise, weight, reps, estimated1RM }));
                    importedCount++;
                }
            } catch (err) { console.error(`Skipping invalid CSV row ${i+1}`, err); }
        }
        if (promises.length > 0) {
            await Promise.all(promises);
            workouts = await getAllWorkouts();
            workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
            renderHistory();
            renderPRs();
            updateExerciseDropdowns();
            updateChart();
            showToast(`Successfully imported ${importedCount} sets!`, 'success');
        } else {
            showToast("No valid workout data found in the CSV.", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function clearAllData() {
    if (confirm("DELETE ALL workout data? This cannot be undone.") && confirm("Are you absolutely sure?")) {
        try {
            await clearWorkouts();
            workouts = [];
            cancelEdit();
            renderHistory();
            renderPRs();
            updateExerciseDropdowns();
            updateChart();
            showToast("All data has been cleared.", "info");
        } catch (e) {
            showToast("Error clearing data.", "error");
        }
    }
}
