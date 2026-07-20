const WIDGET_STATE = {
    HIDDEN: 'hidden',
    ACTIVE: 'active',
    SHOW: 'show',
    ERROR: 'error'
};
const STORAGE_KEYS = {
    WORKOUT_LOGS: 'workoutLogs',
    WORKOUT_MAXES: 'workoutMaxes'
};
const TIMER_CONFIG = {
    DEFAULT_REST: 60,
    MAX_SECONDS: 360
};
let workouts = [];
let currentWorkout = null;
let timerInterval = null;
let countdown = TIMER_CONFIG.DEFAULT_REST;
let audioCtx = null;
let metronomeInterval = null;
let isMetronomeOn = false;
let notificationTimeout = null;
let confirmCallback = null;
let isDirty = false;
const appLoader = document.getElementById('appLoader');
const appContainer = document.getElementById('appContainer');
const workoutSelect = document.getElementById('workoutSelect');
const timerDisplay = document.getElementById('timerDisplay');
const timerBar = document.getElementById('timerBar');
const loaderErrorText = document.getElementById('loaderErrorText');
const retryLoadBtn = document.getElementById('retryLoadBtn');
const loaderSpinner = document.querySelector('#appLoader .loader');
const exerciseDetailModal = document.getElementById('exerciseDetailModal');
const exerciseDetailTitle = document.getElementById('exerciseDetailTitle');
const exerciseDetailText = document.getElementById('exerciseDetailText');

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
            return;
        }
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.error("AudioContext resume failed:", err));
    }
}
async function initializeApp() {
    workoutSelect.disabled = true;
    loaderSpinner.classList.remove(WIDGET_STATE.HIDDEN);
    loaderErrorText.classList.add(WIDGET_STATE.HIDDEN);
    retryLoadBtn.classList.add(WIDGET_STATE.HIDDEN);
    try {
        const response = await fetch('./workouts.json');
        if (!response.ok) {
            let errorMsg = `Failed to load workout data. Status: ${response.status}`;
            throw new Error(errorMsg);
        }
        const rawJson = await response.json();
        workouts = rawJson.map(item => ({
            id: item.day_id,
            name: item.workout_day,
            warmups: item.phases.warmup.map(ex => ({
                name: ex.exercise_name,
                desc: ex.how_to
            })),
            compound: {
                name: item.phases.compound[0].exercise_name,
                desc: item.phases.compound[0].how_to
            },
            isolations: item.phases.isolation.map(ex => ({
                name: ex.exercise_name,
                desc: ex.how_to
            })),
            cooldowns: item.phases.cooldown.map(ex => ({
                name: ex.exercise_name,
                desc: ex.how_to
            }))
        }));
        workouts.forEach(w => {
            const option = new Option(w.name, w.id);
            workoutSelect.appendChild(option);
        });
        appLoader.classList.add(WIDGET_STATE.HIDDEN);
        appContainer.classList.remove(WIDGET_STATE.HIDDEN);
        workoutSelect.disabled = false;
    } catch (error) {
        console.error("Initialization Error:", error);
        let userMessage = "Failed to load workout data.";
        if (error instanceof SyntaxError) {
            userMessage += " The workout file seems to be corrupted.";
        } else if (error.message) {
            userMessage += ` Details: ${error.message}`;
        }
        loaderSpinner.classList.add(WIDGET_STATE.HIDDEN);
        loaderErrorText.textContent = userMessage;
        loaderErrorText.classList.remove(WIDGET_STATE.HIDDEN);
        retryLoadBtn.classList.remove(WIDGET_STATE.HIDDEN);
    }
}

function showNotification(message, isError = false, duration = 5000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show';
    if (isError) notification.classList.add(WIDGET_STATE.ERROR);
    clearTimeout(notificationTimeout);
    if (duration > 0) {
        notificationTimeout = setTimeout(() => {
            notification.className = 'notification hidden';
        }, duration);
    }
}

function showConfirmDialog(text, callback) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmModalText').textContent = text;
    modal.classList.remove(WIDGET_STATE.HIDDEN);
    confirmCallback = callback;
}

function showExerciseDetailModal(title, text) {
    exerciseDetailTitle.textContent = title;
    exerciseDetailText.textContent = text;
    exerciseDetailModal.classList.remove(WIDGET_STATE.HIDDEN);
}

function hideExerciseDetailModal() {
    exerciseDetailModal.classList.add(WIDGET_STATE.HIDDEN);
}

function playBeep(frequency, duration) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}
const playMetronomeBeep = () => playBeep(880, 0.05);
const playTimerEndSound = () => playBeep(1000, 0.5);

function toggleMetronome() {
    initAudio();
    isMetronomeOn = !isMetronomeOn;
    const metronomeBtn = document.getElementById('metronomeToggle');
    metronomeBtn.classList.toggle(WIDGET_STATE.ACTIVE, isMetronomeOn);
    if (isMetronomeOn) {
        metronomeInterval = setInterval(playMetronomeBeep, 1000);
        showNotification('Metronome ON.');
    } else {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
        showNotification('Metronome OFF.');
    }
}

function stopMetronome() {
    if (isMetronomeOn) {
        isMetronomeOn = false;
        const metronomeBtn = document.getElementById('metronomeToggle');
        metronomeBtn.classList.remove(WIDGET_STATE.ACTIVE);
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(countdown / 60).toString().padStart(2, '0');
    const seconds = (countdown % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${minutes}:${seconds}`;
}

function stopTimer(notify = false) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.querySelectorAll('#workoutScreen input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) {
            cb.disabled = false;
        }
    });
    if (notify) {
        showNotification('Rest timer cancelled.');
    }
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    initAudio();
    document.querySelectorAll('#workoutScreen input[type="checkbox"]').forEach(cb => {
        cb.disabled = true;
    });
    timerInterval = setInterval(() => {
        countdown--;
        updateTimerDisplay();
        if (countdown <= 0) {
            playTimerEndSound();
            resetTimer(true);
        }
    }, 1000);
}

function resetTimer(finished = false) {
    const wasRunning = timerInterval !== null;
    stopTimer();
    countdown = TIMER_CONFIG.DEFAULT_REST;
    updateTimerDisplay();
    if (wasRunning && !finished) showNotification('Timer reset.');
    if (finished) showNotification('Rest finished.');
}
const addMinute = () => {
    if (countdown >= TIMER_CONFIG.MAX_SECONDS) {
        showNotification(`Timer cannot exceed ${TIMER_CONFIG.MAX_SECONDS / 60} minutes.`, false, 3000);
        return;
    }
    countdown += 60;
    if (countdown > TIMER_CONFIG.MAX_SECONDS) {
        countdown = TIMER_CONFIG.MAX_SECONDS;
    }
    updateTimerDisplay();
};

function goHome(force = false) {
    if (!force && isDirty) {
        showConfirmDialog("You have unsaved changes. Are you sure you want to exit?", () => goHome(true));
        return;
    }
    document.getElementById('mainMenu').classList.remove(WIDGET_STATE.HIDDEN);
    document.getElementById('workoutScreen').classList.add(WIDGET_STATE.HIDDEN);
    document.getElementById('historyScreen').classList.add(WIDGET_STATE.HIDDEN);
    workoutSelect.value = '';
    if (timerInterval) {
        resetTimer();
    }
    timerBar.classList.add(WIDGET_STATE.HIDDEN);
    stopMetronome();
    currentWorkout = null;
    isDirty = false;
}

function getStoredMaxes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUT_MAXES) || '{}');
    } catch (e) {
        console.error("Failed to parse workout maxes:", e);
        return {};
    }
}

function saveStoredMax(exerciseName, rm) {
    const maxes = getStoredMaxes();
    const currentMax = maxes[exerciseName] || 0;
    if (rm > currentMax) {
        maxes[exerciseName] = rm;
        localStorage.setItem(STORAGE_KEYS.WORKOUT_MAXES, JSON.stringify(maxes));
    }
}
const roundToNearest5 = num => Math.round(num / 5) * 5;

function calculateRM(weight, reps) {
    if (reps <= 0 || weight <= 0) return 0;
    let rm;
    if (reps <= 10) {
        rm = weight / (1.0278 - (0.0278 * reps));
    } else {
        rm = weight * (1 + (reps / 30));
    }
    return Math.round(rm);
}

function validateWorkoutLog() {
    const saveBtn = document.getElementById('saveWorkoutBtn');
    if (!saveBtn) return;
    let allSetsValid = true;
    let hasAtLeastOneSet = false;
    const setRows = document.querySelectorAll('#workoutScreen .set-row');
    setRows.forEach(row => {
        if (row.dataset.skipped === 'true') return;
        hasAtLeastOneSet = true;
        const repsInput = row.querySelector('input[type="number"][placeholder="Reps"]');
        const weightInput = row.querySelector('input[type="number"][placeholder="Wt"]');
        if (!repsInput.value || parseFloat(repsInput.value) <= 0 || !weightInput.value || parseFloat(weightInput.value) <= 0) {
            allSetsValid = false;
        }
    });
    saveBtn.disabled = !allSetsValid || !hasAtLeastOneSet;
}
const parseSet = setString => {
    if (!setString || ['Not Logged', 'Skipped'].includes(setString)) return {
        reps: '',
        weight: ''
    };
    const parts = setString.replace(/\s*lbs\s*/, '').split('x');
    return {
        reps: parts[0] ? .trim() || '',
        weight: parts[1] ? .trim() || ''
    };
};

function createDOMElement(tag, options = {}) {
    const element = document.createElement(tag);
    for (const key in options) {
        if (key === 'children' && Array.isArray(options[key])) {
            options[key].forEach(child => element.appendChild(child));
        } else if (key === 'dataset') {
            Object.assign(element.dataset, options[key]);
        } else if (key === 'listeners' && typeof options[key] === 'object') {
            for (const eventName in options[key]) {
                element.addEventListener(eventName, options[key][eventName]);
            }
        } else {
            element[key] = options[key];
        }
    }
    return element;
}

function createSetRow(id, label, details, values, isAmrap) {
    const {
        reps,
        weight
    } = values;
    const repsInput = createDOMElement('input', {
        type: 'number',
        placeholder: 'Reps',
        value: reps
    });
    const weightInput = createDOMElement('input', {
        type: 'number',
        placeholder: 'Wt',
        value: weight
    });
    const setRow = createDOMElement('div', {
        id,
        className: 'set-row',
        dataset: {
            skipped: 'false'
        }
    });
    const deleteButton = createDOMElement('button', {
        className: 'delete-set-btn',
        textContent: 'Delete',
        'aria-label': `Delete ${label}`,
        listeners: {
            click: () => deleteSet(setRow)
        }
    });
    const checkbox = createDOMElement('input', {
        type: 'checkbox',
        dataset: {
            amrap: isAmrap
        },
        listeners: {
            change: (e) => handleSetCompletion(e.target, [repsInput, weightInput], isAmrap)
        }
    });
    const setDetails = createDOMElement('div', {
        className: 'set-details',
        children: [createDOMElement('strong', {
            textContent: label
        }), createDOMElement('span', {
            textContent: ` (${details})`
        })]
    });
    const setInputs = createDOMElement('div', {
        className: 'set-inputs',
        children: [repsInput, weightInput, deleteButton]
    });
    const checkboxRow = createDOMElement('div', {
        className: 'checkbox-row',
        children: [checkbox]
    });
    setRow.append(setDetails, setInputs, checkboxRow);
    return setRow;
}

function createExerciseSection(title, exercises) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createDOMElement('h3', {
        textContent: title
    }));
    exercises.forEach(ex => {
        const exerciseNameEl = createDOMElement('span', {
            className: 'exercise-name',
            textContent: ex.name,
            listeners: {
                click: () => showExerciseDetailModal(ex.name, ex.desc)
            }
        });
        fragment.appendChild(createDOMElement('div', {
            className: 'exercise-item',
            children: [exerciseNameEl]
        }));
    });
    return fragment;
}

function loadWorkout(w, logData = null) {
    currentWorkout = w;
    isDirty = false;
    if (timerInterval) resetTimer();
    timerBar.classList.remove(WIDGET_STATE.HIDDEN);
    const maxes = getStoredMaxes();
    const workoutContent = document.getElementById('workoutContent');
    workoutContent.innerHTML = '';
    document.getElementById('mainMenu').classList.add(WIDGET_STATE.HIDDEN);
    document.getElementById('workoutScreen').classList.remove(WIDGET_STATE.HIDDEN);
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createDOMElement('h2', {
        textContent: `${logData ? 'Edit' : ''} ${w.name}`
    }));
    fragment.appendChild(createExerciseSection('Warm-ups (No Load)', w.warmups));
    fragment.appendChild(createDOMElement('h3', {
        textContent: 'Compound Lift'
    }));
    const compoundRM = maxes[w.compound.name] || 1;
    const compoundRmBadge = createDOMElement('span', {
        className: 'rm-badge',
        textContent: `${compoundRM} lbs`
    });
    const compoundNameEl = createDOMElement('span', {
        className: 'exercise-name compound-summary',
        textContent: w.compound.name,
        listeners: {
            click: () => showExerciseDetailModal(w.compound.name, w.compound.desc)
        }
    });
    fragment.appendChild(createDOMElement('div', {
        className: 'exercise-item',
        children: [compoundNameEl, compoundRmBadge]
    }));
    const sets = [{
        id: 'cSet1',
        label: 'Set 1',
        details: '6 reps @ 33%',
        isAmrap: false,
        values: logData ? parseSet(logData.compound.s1) : {
            reps: 6,
            weight: roundToNearest5(compoundRM * 0.33)
        }
    }, {
        id: 'cSet2',
        label: 'Set 2',
        details: '6 reps @ 66%',
        isAmrap: false,
        values: logData ? parseSet(logData.compound.s2) : {
            reps: 6,
            weight: roundToNearest5(compoundRM * 0.66)
        }
    }, {
        id: 'cSet3',
        label: 'Set 3',
        details: 'AMRAP @ 80%',
        isAmrap: true,
        values: logData ? parseSet(logData.compound.s3) : {
            reps: '',
            weight: roundToNearest5(compoundRM * 0.80)
        }
    }];
    sets.forEach(s => fragment.appendChild(createSetRow(s.id, s.label, s.details, s.values, s.isAmrap)));
    fragment.appendChild(createDOMElement('h3', {
        textContent: 'Isolation Lifts (1x AMRAP)'
    }));
    w.isolations.forEach((iso, idx) => {
        const isoRM = maxes[iso.name] || 1;
        const isoRmBadge = createDOMElement('span', {
            className: 'rm-badge',
            textContent: `${isoRM} lbs`
        });
        const isoNameEl = createDOMElement('span', {
            className: 'exercise-name isolation-summary',
            textContent: iso.name,
            listeners: {
                click: () => showExerciseDetailModal(iso.name, iso.desc)
            }
        });
        fragment.appendChild(createDOMElement('div', {
            className: 'exercise-item',
            children: [isoNameEl, isoRmBadge]
        }));
        const isoSet = logData && logData.isolations[idx] ? parseSet(logData.isolations[idx].log) : {
            reps: '',
            weight: ''
        };
        fragment.appendChild(createSetRow(`isoSet${idx}`, `Set 1 for ${iso.name}`, 'AMRAP', isoSet, true));
    });
    fragment.appendChild(createExerciseSection('Cool-downs', w.cooldowns));
    const saveButton = createDOMElement('button', {
        id: 'saveWorkoutBtn',
        textContent: logData ? 'Update Log' : 'Save Workout Log',
        listeners: {
            click: () => saveOrUpdateLog(logData)
        }
    });
    fragment.appendChild(saveButton);
    workoutContent.appendChild(fragment);
    validateWorkoutLog();
}

function startSelectedWorkout() {
    const selectedWorkoutId = parseInt(workoutSelect.value);
    if (selectedWorkoutId) {
        const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId);
        if (selectedWorkout) loadWorkout(selectedWorkout);
    }
}

function getSetData(setId) {
    const setRow = document.getElementById(setId);
    if (!setRow || setRow.dataset.skipped === 'true') return 'Skipped';
    const reps = setRow.querySelector('input[placeholder="Reps"]').value;
    const weight = setRow.querySelector('input[placeholder="Wt"]').value;
    return (reps && weight && parseFloat(reps) > 0 && parseFloat(weight) > 0) ? `${reps}x${weight} lbs` : 'Not Logged';
}

function saveOrUpdateLog(existingLog = null) {
    let history = getHistory();
    if (existingLog) {
        const stillExists = history.some(h => h.id === existingLog.id);
        if (!stillExists) {
            showNotification("Cannot update: This log has been deleted.", true);
            goHome(true);
            return;
        }
    }
    const log = {
        id: existingLog ? existingLog.id : new Date().toISOString(),
        date: existingLog ? existingLog.date : new Date().toISOString().split('T')[0],
        routine: currentWorkout.name,
        compound: {
            name: currentWorkout.compound.name,
            s1: getSetData('cSet1'),
            s2: getSetData('cSet2'),
            s3: getSetData('cSet3')
        },
        isolations: currentWorkout.isolations.map((iso, idx) => ({
            name: iso.name,
            log: getSetData(`isoSet${idx}`)
        }))
    };
    const updateRmFromSet = (exerciseName, setData) => {
        if (setData && setData !== 'Not Logged' && setData !== 'Skipped') {
            const {
                reps,
                weight
            } = parseSet(setData);
            if (reps && weight) {
                const rm = calculateRM(parseFloat(weight), parseFloat(reps));
                if (rm > 0) {
                    saveStoredMax(exerciseName, rm);
                }
            }
        }
    };
    updateRmFromSet(log.compound.name, log.compound.s1);
    updateRmFromSet(log.compound.name, log.compound.s2);
    updateRmFromSet(log.compound.name, log.compound.s3);
    log.isolations.forEach(iso => updateRmFromSet(iso.name, iso.log));
    try {
        const existingIndex = history.findIndex(h => h.id === log.id);
        if (existingIndex !== -1) {
            history[existingIndex] = log;
            showNotification('Workout Updated Successfully!');
        } else {
            history.push(log);
            showNotification('Workout Saved Successfully!');
        }
        history.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
        localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(history));
        isDirty = false;
        goHome(true);
    } catch (e) {
        showNotification("Error: Could not save workout.", true);
        console.error("Save log error:", e);
    }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS) || '[]');
    } catch (e) {
        console.error("Failed to parse workout history:", e);
        return [];
    }
}

function viewHistory() {
    document.getElementById('mainMenu').classList.add(WIDGET_STATE.HIDDEN);
    document.getElementById('historyScreen').classList.remove(WIDGET_STATE.HIDDEN);
    const history = getHistory();
    document.getElementById('exportButton').disabled = history.length === 0;
    const historyContent = document.getElementById('historyContent');
    historyContent.innerHTML = '';
    if (history.length === 0) {
        historyContent.textContent = 'No workouts logged yet.';
        return;
    }
    const fragment = document.createDocumentFragment();
    history.forEach((log, index) => {
        const card = createDOMElement('div', {
            className: 'card'
        });
        const header = createDOMElement('div', {
            className: 'card-header'
        });
        header.appendChild(createDOMElement('strong', {
            textContent: `${log.date} - ${log.routine}`,
            style: 'color:#ffd700;'
        }));
        const actions = createDOMElement('div', {
            className: 'card-actions'
        });
        actions.appendChild(createDOMElement('button', {
            className: 'edit-btn',
            textContent: 'Edit',
            listeners: {
                click: () => editLog(index)
            }
        }));
        actions.appendChild(createDOMElement('button', {
            className: 'delete-btn',
            textContent: 'Delete',
            listeners: {
                click: () => deleteLog(index)
            }
        }));
        header.appendChild(actions);
        const body = createDOMElement('div', {
            style: 'margin-top:8px; font-size:0.9rem;'
        });
        body.innerHTML = `
            <strong>${log.compound.name}:</strong><br>
            S1: ${log.compound.s1} | S2: ${log.compound.s2} | S3: ${log.compound.s3}<br><br>
            ${log.isolations.map(i => `<strong>${i.name}:</strong> ${i.log}`).join('<br>')}`;
        card.appendChild(header);
        card.appendChild(body);
        fragment.appendChild(card);
    });
    historyContent.appendChild(fragment);
}

function editLog(logIndex) {
    if (timerInterval) resetTimer();
    const history = getHistory();
    const logToEdit = history[logIndex];
    if (logToEdit) {
        const workoutDefinition = workouts.find(w => w.name === logToEdit.routine);
        if (workoutDefinition) {
            document.getElementById('historyScreen').classList.add(WIDGET_STATE.HIDDEN);
            loadWorkout(workoutDefinition, logToEdit);
        } else {
            showNotification(`Error: Workout definition for "${logToEdit.routine}" not found.`, true);
        }
    }
}

function deleteLog(logIndex) {
    const history = getHistory();
    const log = history[logIndex];
    const confirmationMessage = `Are you sure you want to permanently delete the log for ${log.routine} on ${log.date}? This action cannot be undone.`;
    showConfirmDialog(confirmationMessage, () => {
        history.splice(logIndex, 1);
        localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(history));
        viewHistory();
        showNotification('Log deleted.');
    });
}

function exportLogs() {
    const history = getHistory();
    if (history.length === 0) return showNotification("No logs to export.", true);
    const escapeCsvField = (field) => `"${String(field).replace(/"/g, '""')}"`;
    const header = "Date,Exercise,Reps,Weight (lbs)\n";
    const rows = history.flatMap(log => {
        let entryRows = [];
        const {
            date,
            compound,
            isolations
        } = log;
        const createRow = (exerciseName, setData) => {
            const {
                reps,
                weight
            } = parseSet(setData);
            if (reps && weight) {
                return [escapeCsvField(date), escapeCsvField(exerciseName), reps, weight].join(',');
            }
            return null;
        };
        const sets = [{
            name: compound.name,
            data: compound.s1
        }, {
            name: compound.name,
            data: compound.s2
        }, {
            name: compound.name,
            data: compound.s3
        }, ...isolations.map(iso => ({
            name: iso.name,
            data: iso.log
        }))];
        sets.forEach(set => {
            const row = createRow(set.name, set.data);
            if (row) {
                entryRows.push(row);
            }
        });
        return entryRows;
    });
    const csvContent = header + rows.join('\n');
    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
    });
    const link = createDOMElement('a', {
        href: URL.createObjectURL(blob),
        download: 'fittracker_logs.csv'
    });
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleSetCompletion(checkbox, inputs, isAmrap) {
    const isChecked = checkbox.checked;
    if (isChecked) {
        const repsInput = inputs.find(input => input.placeholder === 'Reps');
        const weightInput = inputs.find(input => input.placeholder === 'Wt');
        if (!repsInput || !weightInput || !repsInput.value || parseFloat(repsInput.value) <= 0 || !weightInput.value || parseFloat(weightInput.value) <= 0) {
            showNotification('Please enter a positive value (>0) for both reps and weight.', true);
            checkbox.checked = false;
            return;
        }
        startTimer();
        showNotification('Rest timer started for 60 seconds.');
    } else {
        stopTimer(true);
    }
    inputs.forEach(input => {
        if (input) input.disabled = isChecked;
    });
    validateWorkoutLog();
}

function deleteSet(setRow) {
    if (setRow) {
        const confirmMessage = `Are you sure you want to remove this set? This will be marked as 'Skipped' in the log.`;
        showConfirmDialog(confirmMessage, () => {
            setRow.dataset.skipped = 'true';
            setRow.style.opacity = '0.5';
            setRow.querySelectorAll('input, button').forEach(i => i.disabled = true);
            isDirty = true;
            validateWorkoutLog();
            showNotification('Set removed.');
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    retryLoadBtn.addEventListener('click', initializeApp);
    document.getElementById('viewHistoryBtn').addEventListener('click', viewHistory);
    document.getElementById('backToMenuBtn').addEventListener('click', () => goHome(false));
    document.getElementById('historyBackToMenuBtn').addEventListener('click', () => goHome(true));
    document.getElementById('metronomeToggle').addEventListener('click', toggleMetronome);
    document.getElementById('addMinuteBtn').addEventListener('click', addMinute);
    document.getElementById('resetTimerBtn').addEventListener('click', () => resetTimer());
    document.getElementById('exportButton').addEventListener('click', exportLogs);
    document.getElementById('exerciseDetailClose').addEventListener('click', hideExerciseDetailModal);
    exerciseDetailModal.addEventListener('click', (e) => {
        if (e.target.id === 'exerciseDetailModal') {
            hideExerciseDetailModal();
        }
    });
    document.getElementById('confirmModalConfirm').addEventListener('click', () => {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        document.getElementById('confirmModal').classList.add(WIDGET_STATE.HIDDEN);
        confirmCallback = null;
    });
    document.getElementById('confirmModalCancel').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.add(WIDGET_STATE.HIDDEN);
        confirmCallback = null;
    });
    workoutSelect.addEventListener('change', startSelectedWorkout);
    document.body.addEventListener('input', (event) => {
        if (event.target.closest('#workoutScreen')) {
            isDirty = true;
            validateWorkoutLog();
        }
    }, true);
    ['click', 'touchend'].forEach(evt => {
        document.body.addEventListener(evt, initAudio, {
            once: true
        });
    });
});
