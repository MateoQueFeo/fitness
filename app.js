const DB_NAME = 'WorkoutTrackerDB';
const STORE_NAME = 'workoutsStore';
const DEFAULT_TIMER_DURATION = 60;
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open(DB_NAME, 2);
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getStore(mode) {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
}

function addWorkout(workout) {
    return new Promise((resolve, reject) => {
        const request = getStore('readwrite').add(workout);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

function updateWorkout(workout) {
    return new Promise((resolve, reject) => {
        const request = getStore('readwrite').put(workout);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

function deleteWorkout(id) {
    return new Promise((resolve, reject) => {
        const request = getStore('readwrite').delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

function getAllWorkouts() {
    return new Promise((resolve, reject) => {
        const request = getStore('readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

function clearWorkouts() {
    return new Promise((resolve, reject) => {
        const request = getStore('readwrite').clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

const timerDisplayEl = document.getElementById('timerDisplay');
const formTitleEl = document.getElementById('formTitle');
const exerciseInputEl = document.getElementById('exercise');
const weightInputEl = document.getElementById('weight');
const repsInputEl = document.getElementById('reps');
const exerciseOptionsEl = document.getElementById('exerciseOptions');
const submitBtnEl = document.getElementById('submitBtn');
const cancelEditBtnEl = document.getElementById('cancelEditBtn');
const prContainerEl = document.getElementById('prContainer');
const chartCardEl = document.getElementById('chartCard');
const chartExerciseSelectEl = document.getElementById('chartExerciseSelect');
const chartContainerEl = document.getElementById('chartContainer');
const historyContainerEl = document.getElementById('historyContainer');
const toastEl = document.getElementById('toast');
const csvFileInputEl = document.getElementById('csvFileInput');
const addMinBtnEl = document.getElementById('addMinBtn');
const resetTimerBtnEl = document.getElementById('resetTimerBtn');
const importBtnEl = document.getElementById('importBtn');
const exportBtnEl = document.getElementById('exportBtn');
const clearDataBtnEl = document.getElementById('clearDataBtn');
const confirmationModalEl = document.getElementById('confirmationModal');
const modalMessageEl = document.getElementById('modalMessage');
const modalConfirmBtnEl = document.getElementById('modalConfirmBtn');
const modalCancelBtnEl = document.getElementById('modalCancelBtn');

let workouts = [];
let exerciseDictionary = {};
let chartInstance = null;
let editingWorkoutId = null;
let timerState = {
    interval: null,
    endTime: 0,
    timeRemaining: DEFAULT_TIMER_DURATION,
    isRunning: false,
    defaultDuration: DEFAULT_TIMER_DURATION,
    flashTimeout: null,
};
let audioCtx;
let audioInitialized = false;

const getLocalDate = () => new Date().toISOString().split('T')[0];
const calculate1RM = (weight, reps) => Math.round(weight * (1 + reps / 30));
const formatDateForDisplay = (dateString) => !dateString ? '' : new Date(dateString).toLocaleDateString(undefined, { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric' });

function sortWorkouts() {
    workouts.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
}

function resolveExerciseName(rawInput) {
    if (!rawInput) return '';
    const sanitizedInput = rawInput.trim().toLowerCase();

    for (const key in exerciseDictionary) {
        const exercise = exerciseDictionary[key];
        if (exercise.name.toLowerCase() === sanitizedInput) {
            return exercise.name;
        }
        if (exercise.aliases && exercise.aliases.includes(sanitizedInput)) {
            return exercise.name;
        }
    }
    return rawInput.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

async function loadExerciseDictionary() {
    try {
        const response = await fetch('./exercises.json');
        if (!response.ok) throw new Error('Failed to load exercises.json');
        exerciseDictionary = await response.json();
    } catch (error) {
        showToast('Could not load exercise dictionary.', 'error');
        exerciseDictionary = {};
    }
}

async function main() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.warn('Service worker registration failed.', err);
        });
    }

    if (typeof Chart === 'undefined') {
        showToast('Charting library failed to load.', 'error');
        if(chartCardEl) chartCardEl.style.display = 'none';
    }

    try {
        await Promise.all([
            initDB().then(async () => {
                workouts = await getAllWorkouts();
                sortWorkouts();
            }),
            loadExerciseDictionary()
        ]);
        renderInitial();
    } catch (e) {
        showToast(`Could not load history: ${e.message}`, "error");
    }
    setupEventListeners();
}

function renderInitial() {
    renderHistory();
    renderPRs();
    updateExerciseDropdowns();
}

function setupEventListeners() {
    const initAudioOnce = () => initAudio();
    document.addEventListener('touchend', initAudioOnce, { once: true });
    document.addEventListener('click', initAudioOnce, { once: true });
    addMinBtnEl.addEventListener('click', addMinuteToTimer);
    resetTimerBtnEl.addEventListener('click', resetTimer);
    submitBtnEl.addEventListener('click', processSet);
    cancelEditBtnEl.addEventListener('click', cancelEdit);
    chartExerciseSelectEl.addEventListener('change', handleChartSelection);
    importBtnEl.addEventListener('click', () => csvFileInputEl.click());
    exportBtnEl.addEventListener('click', exportToCSV);
    clearDataBtnEl.addEventListener('click', clearAllData);
    csvFileInputEl.addEventListener('change', importFromCSV);
    historyContainerEl.addEventListener('click', handleHistoryClick);
}

function handleHistoryClick(event) {
    const target = event.target.closest('button[data-id]');
    if (!target) return;
    const id = parseInt(target.dataset.id, 10);
    if (target.matches('.edit-btn')) {
        editSet(id);
    } else if (target.matches('.del-btn')) {
        deleteSet(id);
    }
}

function showToast(message, type = 'info') {
    toastEl.textContent = message;
    toastEl.classList.remove('show', 'success', 'error', 'info');
    toastEl.classList.add('show', type);
    setTimeout(() => {
        toastEl.classList.remove('show', 'success', 'error', 'info');
    }, 3000);
}

function showConfirmationModal(message, onConfirm) {
    modalMessageEl.textContent = message;
    confirmationModalEl.style.display = 'flex';

    const handleConfirm = () => {
        onConfirm();
        hideModal();
    };

    const hideModal = () => {
        confirmationModalEl.style.display = 'none';
        modalConfirmBtnEl.removeEventListener('click', handleConfirm);
        modalCancelBtnEl.removeEventListener('click', hideModal);
    };

    modalConfirmBtnEl.addEventListener('click', handleConfirm);
    modalCancelBtnEl.addEventListener('click', hideModal);
}

function initAudio() {
    if (audioInitialized) return;
    try {
        audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        audioInitialized = true;
    } catch (e) {
        console.warn('AudioContext could not be initialized.', e);
        audioInitialized = false;
    }
}

function playBeep(onFinish = false) {
    if (!audioInitialized) initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = onFinish ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(onFinish ? 440 : 880, audioCtx.currentTime);
        gain.gain.setValueAtTime(1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.warn('Audio playback failed.', e);
    }
}

function updateTimerUI(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    timerDisplayEl.innerText = `${mins}:${secs}`;
}

function timerTick() {
    const secondsLeft = Math.round((timerState.endTime - Date.now()) / 1000);
    if (secondsLeft <= 0) {
        playBeep(true);
        timerDisplayEl.classList.add('finished');
        timerState.flashTimeout = setTimeout(() => timerDisplayEl.classList.remove('finished'), 3000);
        resetTimer();
    } else {
        updateTimerUI(secondsLeft);
    }
}

function startTimer() {
    initAudio();
    if (timerState.isRunning) return;
    timerState.isRunning = true;
    timerState.endTime = Date.now() + (timerState.defaultDuration * 1000);
    timerDisplayEl.classList.add('active');
    updateTimerUI(timerState.defaultDuration);
    timerState.interval = setInterval(timerTick, 1000);
}

function addMinuteToTimer() {
    initAudio();
    if (!timerState.isRunning) {
        timerState.defaultDuration += 60;
        updateTimerUI(timerState.defaultDuration);
    } else {
        timerState.endTime += 60000;
        const secondsLeft = Math.round((timerState.endTime - Date.now()) / 1000);
        updateTimerUI(secondsLeft);
    }
}

function resetTimer() {
    clearInterval(timerState.interval);
    clearTimeout(timerState.flashTimeout);
    timerState.isRunning = false;
    timerDisplayEl.classList.remove('active', 'finished');
    updateTimerUI(timerState.defaultDuration);
}

async function processSet() {
    const exercise = resolveExerciseName(exerciseInputEl.value);
    const weight = parseFloat(weightInputEl.value);
    const reps = parseInt(repsInputEl.value);

    if (!exercise || isNaN(weight) || isNaN(reps) || weight < 0 || reps < 0) {
        showToast("Please enter valid exercise details.", "error");
        return;
    }

    exerciseInputEl.value = exercise;
    const estimated1RM = calculate1RM(weight, reps);
    const date = getLocalDate();

    if (editingWorkoutId !== null) {
        const workoutIndex = workouts.findIndex(w => w.id === editingWorkoutId);
        if (workoutIndex === -1) {
            showToast("Error finding set to update.", "error");
            return cancelEdit();
        }

        const workoutToUpdate = { ...workouts[workoutIndex], exercise, weight, reps, estimated1RM };
        try {
            await updateWorkout(workoutToUpdate);
            workouts[workoutIndex] = workoutToUpdate;
            sortWorkouts();
            renderHistory();
            renderPRs();
            updateExerciseDropdowns(exercise);
            updateChart();
            showToast("Set updated!", "success");
            cancelEdit();
        } catch (e) {
            showToast(`Error updating set: ${e.message}`, "error");
        }
    } else {
        const newWorkout = { date, exercise, weight, reps, estimated1RM };
        try {
            const newId = await addWorkout(newWorkout);
            newWorkout.id = newId;
            workouts.unshift(newWorkout);
            sortWorkouts();
            renderHistory();
            renderPRs();
            updateExerciseDropdowns(exercise);
            updateChart();
            startTimer();
            weightInputEl.value = '';
            repsInputEl.value = '';
            exerciseInputEl.focus();
            showToast("Set logged!", "success");
        } catch (e) {
            showToast(`Error saving data: ${e.message}`, "error");
        }
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
    formTitleEl.innerText = 'Log a Set';
    submitBtnEl.innerText = 'Log Set';
    cancelEditBtnEl.style.display = 'none';
    exerciseInputEl.value = '';
    weightInputEl.value = '';
    repsInputEl.value = '';
}

async function deleteSet(id) {
    showConfirmationModal("Are you sure you want to delete this set?", async () => {
        const workoutIndex = workouts.findIndex(w => w.id === id);
        if (workoutIndex === -1) return;

        try {
            await deleteWorkout(id);
            workouts.splice(workoutIndex, 1);
            if (editingWorkoutId === id) cancelEdit();
            renderHistory();
            renderPRs();
            updateExerciseDropdowns();
            updateChart();
            showToast("Set deleted.", "info");
        } catch (e) {
            showToast(`Error deleting set: ${e.message}`, "error");
        }
    });
}

async function clearAllData() {
    showConfirmationModal("DELETE ALL workout data? This cannot be undone.", async () => {
        try {
            await clearWorkouts();
            workouts = [];
            cancelEdit();
            renderInitial();
            updateChart();
            showToast("All data has been cleared.", "info");
        } catch (e) {
            showToast(`Error clearing data: ${e.message}`, "error");
        }
    });
}

function renderHistory() {
    if (workouts.length === 0) {
        historyContainerEl.innerHTML = '<p style="color: var(--text-secondary);">No workouts logged yet.</p>';
        return;
    }

    const sessions = workouts.reduce((acc, workout) => {
        (acc[workout.date] = acc[workout.date] || []).push(workout);
        return acc;
    }, {});

    const historyHtml = Object.keys(sessions).map(date => {
        const setsHtml = sessions[date].map(w => `
            <tr id="workout-row-${w.id}">
                <td>${w.exercise}</td>
                <td>${w.weight} × ${w.reps}</td>
                <td><strong>${w.estimated1RM}</strong></td>
                <td style="white-space: nowrap;">
                    <button class="action-btn edit-btn" data-id="${w.id}" aria-label="Edit set for ${w.exercise} on ${formatDateForDisplay(date)}">Edit</button>
                    <button class="action-btn del-btn" data-id="${w.id}" aria-label="Delete set for ${w.exercise} on ${formatDateForDisplay(date)}">Del</button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="session-group" id="session-${date}">
                <h3 class="session-header">📅 ${formatDateForDisplay(date)}</h3>
                <table>
                    <thead><tr><th>Exercise</th><th>W × R</th><th>1RM</th><th>Actions</th></tr></thead>
                    <tbody>${setsHtml}</tbody>
                </table>
            </div>
        `;
    }).join('');

    historyContainerEl.innerHTML = historyHtml;
}

function renderPRs() {
    if (workouts.length === 0) {
        prContainerEl.innerHTML = '<p style="color: var(--text-secondary); margin: 0;">Log a workout to see personal records.</p>';
        return;
    }
    const prs = workouts.reduce((acc, w) => {
        if (!acc[w.exercise] || w.estimated1RM > acc[w.exercise].estimated1RM) {
            acc[w.exercise] = w;
        }
        return acc;
    }, {});
    const sortedPRExercises = Object.keys(prs).sort();
    prContainerEl.innerHTML = `
        <table>
            <thead><tr><th>Exercise</th><th>Best Set</th><th>Best 1RM</th></tr></thead>
            <tbody>
                ${sortedPRExercises.map(exName => `
                    <tr>
                        <td><strong>${prs[exName].exercise}</strong></td>
                        <td>${prs[exName].weight} × ${prs[exName].reps}</td>
                        <td class="pr-gold">★ ${prs[exName].estimated1RM}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

function renderDatalist(exerciseArray) {
    exerciseOptionsEl.innerHTML = exerciseArray
        .map(ex => `<option value="${ex}"></option>`)
        .join('');
}

function updateExerciseDropdowns(newExercise = null) {
    const dictionaryExercises = Object.values(exerciseDictionary).map(ex => ex.name);
    const allExercises = new Set([
        ...dictionaryExercises,
        ...workouts.map(w => w.exercise)
    ]);
    if (newExercise) allExercises.add(newExercise);
    renderDatalist(Array.from(allExercises).sort());

    const uniqueLoggedExercises = [...new Set(workouts.map(w => w.exercise))].sort();
    const currentChartValue = chartExerciseSelectEl.value;

    chartExerciseSelectEl.innerHTML = '<option value="">-- Select an Exercise --</option>' + uniqueLoggedExercises.map(ex => `<option value="${ex}">${ex}</option>`).join('');

    if (uniqueLoggedExercises.includes(currentChartValue)) {
        chartExerciseSelectEl.value = currentChartValue;
    } else if (newExercise && uniqueLoggedExercises.includes(newExercise)) {
        chartExerciseSelectEl.value = newExercise;
    }
}

function handleChartSelection() {
    updateChart();
}

function updateChart() {
    const selectedExercise = chartExerciseSelectEl.value;
    if (chartInstance) chartInstance.destroy();

    if (!selectedExercise || typeof Chart === 'undefined') {
        chartContainerEl.style.display = 'none';
        return;
    }
    chartContainerEl.style.display = 'block';

    const dailyMax = workouts
        .filter(w => w.exercise === selectedExercise)
        .reduce((acc, w) => {
            if (!acc[w.date] || w.estimated1RM > acc[w.date]) {
                acc[w.date] = w.estimated1RM;
            }
            return acc;
        }, {});

    const sortedDates = Object.keys(dailyMax).sort((a, b) => new Date(a) - new Date(b));
    const chartData = sortedDates.map(date => dailyMax[date]);
    renderChartCanvas(sortedDates, chartData, selectedExercise);
}

function renderChartCanvas(labels, data, exerciseName) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    const style = getComputedStyle(document.documentElement);
    Chart.defaults.color = style.getPropertyValue('--text-secondary').trim();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(d => d.substring(5)),
            datasets: [{
                label: `Est. 1RM for ${exerciseName}`,
                data,
                borderColor: style.getPropertyValue('--gold-primary').trim(),
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                borderWidth: 2,
                pointBackgroundColor: style.getPropertyValue('--gold-primary').trim(),
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Weight' }, grid: { color: style.getPropertyValue('--chart-grid').trim() } },
                x: { grid: { color: style.getPropertyValue('--chart-grid').trim() } }
            }
        }
    });
}

function exportToCSV() {
    if (workouts.length === 0) return showToast("No data to export.", "error");
    let csvContent = "Date,Exercise,Weight,Reps,Estimated 1RM\n";
    [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(w => {
        csvContent += `${w.date},"${w.exercise.replace(/"/g, '""')}",${w.weight},${w.reps},${w.estimated1RM}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `workout_history_${getLocalDate()}.csv`;
    link.click();
    link.remove();
    showToast("Backup CSV file exported!", "success");
}

async function importFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onerror = () => {
        showToast('Failed to read the file.', 'error');
        event.target.value = '';
    };

    reader.onload = async function(e) {
        let originalWorkouts = [...workouts];
        try {
            const text = e.target.result;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) throw new Error("CSV file is empty or missing data rows.");

            const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
            const fieldMap = {
                date: headers.indexOf('date'),
                exercise: headers.findIndex(h => h.includes('exercise')),
                weight: headers.indexOf('weight'),
                reps: headers.indexOf('reps')
            };
            
            const requiredHeaders = ['date', 'exercise', 'weight', 'reps'];
            if (requiredHeaders.some(h => fieldMap[h] === -1)) {
                throw new Error("Required columns (Date, Exercise, Weight, Reps) not found in CSV.");
            }

            const parsedWorkouts = lines.slice(1).map(row => {
                const cols = row.split(',').map(c => c.trim().replace(/"/g, ''));
                if (cols.length < requiredHeaders.length) return null;
                const weight = parseFloat(cols[fieldMap.weight]);
                const reps = parseInt(cols[fieldMap.reps]);
                if (!cols[fieldMap.date] || !cols[fieldMap.exercise] || isNaN(weight) || isNaN(reps)) return null;
                return {
                    date: cols[fieldMap.date],
                    exercise: resolveExerciseName(cols[fieldMap.exercise]),
                    weight,
                    reps,
                    estimated1RM: calculate1RM(weight, reps)
                };
            }).filter(Boolean);

            if (parsedWorkouts.length === 0) throw new Error("No valid workout data found in CSV.");
            
            showConfirmationModal(`Found ${parsedWorkouts.length} sets. This will ADD them to your current history. Continue?`, async () => {
                for (const workout of parsedWorkouts) {
                    const newId = await addWorkout(workout);
                    workout.id = newId;
                    workouts.push(workout);
                }
    
                sortWorkouts();
                cancelEdit();
                renderInitial();
                updateChart();
                showToast(`Successfully imported ${parsedWorkouts.length} sets!`, 'success');
            });

        } catch (err) {
            showToast(err.message, "error");
            workouts = originalWorkouts;
            sortWorkouts();
            renderInitial();
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsText(file);
}

window.onload = main;
