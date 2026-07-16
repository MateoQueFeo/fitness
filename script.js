let workouts = [];
let currentWorkout = null;
let timerInterval = null;
let countdown = 60;
const defaultCountdown = 60;
let audioCtx = null;
let metronomeInterval = null;
let isMetronomeOn = false;
let notificationTimeout = null;
let confirmCallback = null;

const appLoader = document.getElementById('appLoader');
const appContainer = document.getElementById('appContainer');
const workoutSelect = document.getElementById('workoutSelect');
const timerDisplay = document.getElementById('timerDisplay');
const timerBar = document.getElementById('timerBar');

async function initializeApp() {
    workoutSelect.disabled = true;
    try {
        const response = await fetch('./workouts.json');
        if (!response.ok) {
            let errorMsg = `Failed to load workout data. HTTP status: ${response.status}`;
            if (response.status === 404) errorMsg += ' (File not found)';
            throw new Error(errorMsg);
        }
        workouts = await response.json();
        
        workouts.forEach(w => {
            const option = new Option(w.name, w.id);
            workoutSelect.appendChild(option);
        });

        appLoader.classList.add('hidden');
        appContainer.classList.remove('hidden');
        workoutSelect.disabled = false;

    } catch (error) {
        console.error("Initialization Error:", error);
        appLoader.innerHTML = `<p style="color: #ffd700; text-align: center;">Failed to load workout data.<br>${error.message}</p>`;
    }
}

function showNotification(message, isError = false, duration = 5000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show';
    if (isError) notification.classList.add('error');
    
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
    modal.classList.remove('hidden');
    confirmCallback = callback;
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playBeep(frequency, duration) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
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
    metronomeBtn.classList.toggle('active', isMetronomeOn);
    if (isMetronomeOn) {
        metronomeInterval = setInterval(playMetronomeBeep, 1000);
    } else {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
}

function stopMetronome() {
    if (isMetronomeOn) toggleMetronome();
}

function updateTimerDisplay() {
    const minutes = Math.floor(countdown / 60).toString().padStart(2, '0');
    const seconds = (countdown % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${minutes}:${seconds}`;
}

function stopTimer(notify = false) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.querySelectorAll('input[data-amrap="true"]').forEach(cb => cb.disabled = false);
    if (notify) {
        showNotification('AMRAP timer cancelled.');
    }
}

function startTimer() {
    if (timerInterval) return;
    initAudio();
    document.querySelectorAll('input[data-amrap="true"]').forEach(cb => cb.disabled = true);
    timerInterval = setInterval(() => {
        countdown--;
        updateTimerDisplay();
        if (countdown <= 0) {
            playTimerEndSound();
            resetTimer();
        }
    }, 1000);
}

function resetTimer() {
    const wasRunning = timerInterval !== null;
    stopTimer();
    countdown = defaultCountdown;
    updateTimerDisplay();
    if(wasRunning) showNotification('Timer finished.');
}

const addMinute = () => {
    countdown += 60;
    updateTimerDisplay();
};

function goHome() {
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('workoutScreen').classList.add('hidden');
    document.getElementById('historyScreen').classList.add('hidden');
    workoutSelect.value = '';
    if(timerInterval) {
        resetTimer();
    }
    timerBar.classList.add('hidden');
    stopMetronome();
    currentWorkout = null;
}

function getStoredMaxes() {
    try {
        return JSON.parse(localStorage.getItem('workoutMaxes') || '{}');
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
        localStorage.setItem('workoutMaxes', JSON.stringify(maxes));
    }
}

const roundToNearest5 = num => Math.round(num / 5) * 5;

function calculateRM(weight, reps) {
    if (reps <= 0 || weight < 0) return 0;
    let rm = weight * (1 + (reps / 30));
    return Math.round(rm);
}

function updateRM(exerciseName, reps, weight, badgeId) {
    const parsedReps = parseFloat(reps);
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedReps) || isNaN(parsedWeight) || parsedReps <= 0 || parsedWeight < 0) return;

    const rm = calculateRM(parsedWeight, parsedReps);
    const badge = document.getElementById(badgeId);
    if (rm > 0) {
        badge.innerText = `${rm} lbs`;
        saveStoredMax(exerciseName, rm);
    }
    validateWorkoutLog();
}

function validateWorkoutLog() {
    const saveBtn = document.getElementById('saveWorkoutBtn');
    if (!saveBtn) return;
    let allSetsValid = true;
    let hasAtLeastOneSet = false;
    const setRows = document.querySelectorAll('#workoutScreen .set-row');
    setRows.forEach(row => {
        hasAtLeastOneSet = true;
        const repsInput = row.querySelector('input[type="number"][placeholder="Reps"]');
        const weightInput = row.querySelector('input[type="number"][placeholder="Wt"]');
        if (repsInput.value === '' || parseFloat(repsInput.value) <= 0 || weightInput.value === '' || parseFloat(weightInput.value) < 0) {
            allSetsValid = false;
        }
    });
    saveBtn.disabled = !allSetsValid || !hasAtLeastOneSet;
}

const parseSet = setString => {
    if (!setString || ['Not Logged', 'Skipped'].includes(setString)) return { reps: '', weight: '' };
    const parts = setString.replace(/\s*lbs\s*/, '').split('x');
    return { reps: parts[0]?.trim() || '', weight: parts[1]?.trim() || '' };
};

function createDOMElement(tag, options = {}) {
    const element = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
        if (key === 'dataset') {
            Object.assign(element.dataset, value);
        } else if (key === 'children' && Array.isArray(value)) {
            value.forEach(child => element.appendChild(child));
        } else {
            element[key] = value;
        }
    });
    return element;
}

function createSetRow(id, label, details, values, isAmrap, exerciseName, badgeId) {
    const { reps, weight } = values;
    const createInput = (placeholder, value, action, data) => createDOMElement('input', { type: 'number', placeholder, value, dataset: { action, ...data } });

    return createDOMElement('div', { id, className: 'set-row', children: [
        createDOMElement('div', { className: 'checkbox-row', children: [
            createDOMElement('input', { type: 'checkbox', dataset: { action: 'complete-set', inputs: `${id}Reps,${id}Weight`, amrap: isAmrap } }),
            createDOMElement('div', { children: [
                createDOMElement('strong', { textContent: label }),
                createDOMElement('span', { textContent: ` (${details})` })
            ]})
        ]}),
        createDOMElement('div', { className: 'set-inputs', children: [
            createInput('Reps', reps, 'update-rm', { id: `${id}Reps`, exerciseName, badgeId, weightId: `${id}Weight` }),
            createInput('Wt', weight, 'update-rm', { id: `${id}Weight`, exerciseName, badgeId, repsId: `${id}Reps` }),
            createDOMElement('button', { className: 'delete-set-btn', textContent: 'Delete', dataset: { action: 'delete-set', setId: id } })
        ]})
    ]});
}

function createExerciseSection(title, exercises) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createDOMElement('h3', { textContent: title }));
    exercises.forEach(ex => {
        fragment.appendChild(createDOMElement('div', { className: 'exercise-item', children: [
            createDOMElement('div', { className: 'checkbox-row', children: [
                createDOMElement('input', { type: 'checkbox' }),
                createDOMElement('details', { className: 'exercise-details', children: [
                    createDOMElement('summary', { textContent: ex.name }),
                    createDOMElement('div', { className: 'details-content', textContent: ex.desc })
                ]})
            ]})
        ]}));
    });
    return fragment;
}

function loadWorkout(w, logData = null) {
    currentWorkout = w;
    if(timerInterval) resetTimer();
    timerBar.classList.remove('hidden');
    const maxes = getStoredMaxes();
    const workoutContent = document.getElementById('workoutContent');
    workoutContent.innerHTML = '';
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('workoutScreen').classList.remove('hidden');

    const fragment = document.createDocumentFragment();
    fragment.appendChild(createDOMElement('h2', { textContent: `${logData ? 'Edit' : ''} ${w.name}` }));
    fragment.appendChild(createExerciseSection('Warm-ups (No Load)', w.warmups));
    
    fragment.appendChild(createDOMElement('h3', { textContent: 'Compound Lift' }));
    const compoundRM = maxes[w.compound.name] || 1;
    fragment.appendChild(createDOMElement('div', { className: 'exercise-item', children: [
        createDOMElement('details', { className: 'exercise-details', children: [
            createDOMElement('summary', { className: 'compound-summary', children: [
                document.createTextNode(w.compound.name),
                createDOMElement('span', { id: 'compound-rm-badge', className: 'rm-badge', textContent: `${compoundRM} lbs` })
            ]}),
            createDOMElement('div', { className: 'details-content', textContent: w.compound.desc })
        ]})
    ]}));

    const sets = [
        { id: 'cSet1', label: 'Set 1', details: '6 reps @ 33%', isAmrap: false, values: logData ? parseSet(logData.compound.s1) : { reps: 6, weight: roundToNearest5(compoundRM * 0.33) } },
        { id: 'cSet2', label: 'Set 2', details: '6 reps @ 66%', isAmrap: false, values: logData ? parseSet(logData.compound.s2) : { reps: 6, weight: roundToNearest5(compoundRM * 0.66) } },
        { id: 'cSet3', label: 'Set 3', details: 'AMRAP @ 80%', isAmrap: true, values: logData ? parseSet(logData.compound.s3) : { reps: '', weight: roundToNearest5(compoundRM * 0.80) } }
    ];
    sets.forEach(s => fragment.appendChild(createSetRow(s.id, s.label, s.details, s.values, s.isAmrap, w.compound.name, 'compound-rm-badge')));

    fragment.appendChild(createDOMElement('h3', { textContent: 'Isolation Lifts (1x AMRAP)' }));
    w.isolations.forEach((iso, idx) => {
        const isoRM = maxes[iso.name] || 1;
        fragment.appendChild(createDOMElement('div', { className: 'exercise-item', children: [
            createDOMElement('details', { className: 'exercise-details', children: [
                createDOMElement('summary', { className: 'isolation-summary', children: [
                    document.createTextNode(iso.name),
                    createDOMElement('span', { id: `iso-rm-badge-${idx}`, className: 'rm-badge', textContent: `${isoRM} lbs` })
                ]}),
                createDOMElement('div', { className: 'details-content', textContent: iso.desc })
            ]})
        ]}));
        const isoSet = logData && logData.isolations[idx] ? parseSet(logData.isolations[idx].log) : { reps: '', weight: '' };
        fragment.appendChild(createSetRow(`isoSet${idx}`, 'Set 1', 'AMRAP', isoSet, true, iso.name, `iso-rm-badge-${idx}`));
    });
    
    fragment.appendChild(createExerciseSection('Cool-downs', w.cooldowns));
    const saveButton = createDOMElement('button', { id: 'saveWorkoutBtn', textContent: logData ? 'Update Log' : 'Save Workout Log'});
    if (logData) {
        saveButton.dataset.logId = logData.id;
    }
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
    // If the set row doesn't exist, it was deleted by the user.
    if (!setRow) return 'Not Logged';
    
    const reps = setRow.querySelector('input[placeholder="Reps"]').value;
    const weight = setRow.querySelector('input[placeholder="Wt"]').value;
    return (reps !== '' && weight !== '') ? `${reps}x${weight} lbs` : 'Not Logged';
}

function saveOrUpdateLog(logId = null) {
  const log = {
    id: logId || new Date().toISOString(),
    date: new Date(logId || new Date()).toISOString().split('T')[0],
    routine: currentWorkout.name,
    compound: { name: currentWorkout.compound.name, s1: getSetData('cSet1'), s2: getSetData('cSet2'), s3: getSetData('cSet3') },
    isolations: currentWorkout.isolations.map((iso, idx) => ({ name: iso.name, log: getSetData(`isoSet${idx}`) }))
  };

  try {
    let history = getHistory();
    const existingIndex = history.findIndex(h => h.id === log.id);

    if (existingIndex !== -1) {
        history[existingIndex] = log;
        showNotification('Workout Updated Successfully!');
    } else {
        history.push(log);
        showNotification('Workout Saved Successfully!');
    }
    history.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
    localStorage.setItem('workoutLogs', JSON.stringify(history));
    goHome();
  } catch (e) {
    showNotification("Error: Could not save workout.", true);
    console.error("Save log error:", e);
  }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('workoutLogs') || '[]');
    } catch(e) {
        console.error("Failed to parse workout history:", e);
        return [];
    }
}

function viewHistory() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('historyScreen').classList.remove('hidden');
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
        const card = createDOMElement('div', { className: 'card' });
        
        const header = createDOMElement('div', { className: 'card-header' });
        header.appendChild(createDOMElement('strong', { textContent: `${log.date} - ${log.routine}`, style: 'color:#ffd700;' }));
        const actions = createDOMElement('div', { className: 'card-actions' });
        actions.appendChild(createDOMElement('button', { className: 'edit-btn', textContent: 'Edit', dataset: { action: 'edit-log', logIndex: index } }));
        actions.appendChild(createDOMElement('button', { className: 'delete-btn', textContent: 'Delete', dataset: { action: 'delete-log', logIndex: index } }));
        header.appendChild(actions);

        const body = createDOMElement('div', { style: 'margin-top:8px; font-size:0.9rem;' });
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
    const history = getHistory();
    const logToEdit = history[logIndex];
    if (logToEdit) {
        const workoutDefinition = workouts.find(w => w.name === logToEdit.routine);
        if (workoutDefinition) {
            document.getElementById('historyScreen').classList.add('hidden');
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
        localStorage.setItem('workoutLogs', JSON.stringify(history));
        viewHistory();
    });
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];

    const parseLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; 
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    };

    const header = parseLine(lines.shift().toLowerCase());
    const indices = {
        date: header.indexOf("date"),
        routine: header.indexOf("routine"),
        exercise: header.indexOf("exercise"),
        set: header.indexOf("set"),
        reps: header.indexOf("reps"),
        weight: header.indexOf("weight (lbs)"),
        status: header.indexOf("status")
    };
    if (indices.date === -1 || indices.routine === -1 || indices.exercise === -1) {
        throw new Error('CSV must contain "Date", "Routine", and "Exercise" columns.');
    }

    return lines.map((line, index) => {
        const values = parseLine(line);
        if (values.length !== header.length) {
            console.warn(`Skipping malformed CSV line ${index + 2}: ${line}`);
            return null;
        }

        return {
            date: values[indices.date],
            routine: values[indices.routine],
            exercise: values[indices.exercise],
            set: parseInt(values[indices.set], 10) || 0,
            reps: values[indices.reps] || '',
            weight: values[indices.weight] || '',
            status: values[indices.status] || 'Completed'
        };
    }).filter(log => log !== null);
}

function importLogs(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) {
        fileInput.value = '';
        return;
    }
    showNotification('Importing... please wait.', false, 0);
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedData = parseCsv(e.target.result);
            const { newLogsCount, updatedLogsCount, skippedCount } = mergeImportedLogs(importedData);
            let message = `${newLogsCount} new, ${updatedLogsCount} updated logs processed.`;
            if (skippedCount > 0) {
                message += ` ${skippedCount} rows skipped (unknown routine or bad format).`;
            }
            showNotification(message, skippedCount > 0, 8000);
            viewHistory();
        } catch (error) {
            showNotification(`Import failed: ${error.message}`, true, 8000);
        } finally {
            fileInput.value = '';
        }
    };
    reader.onerror = function() {
        showNotification('Failed to read the file.', true);
        fileInput.value = '';
    }
    reader.readAsText(file);
}

function mergeImportedLogs(importedData) {
    const history = getHistory();
    const historyMap = new Map(history.map(log => [`${log.date}_${log.routine}`, log]));
    let newLogsCount = 0;
    let updatedLogsCount = 0;
    let skippedCount = 0;
    const workoutDefs = new Map(workouts.map(w => [w.name, w]));

    const groupedByLog = importedData.reduce((acc, row) => {
        if (!workoutDefs.has(row.routine)) {
            skippedCount++;
            return acc;
        }
        const key = `${row.date}_${row.routine}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
    }, {});

    for (const key in groupedByLog) {
        const [date, routineName] = key.split('_');
        const workoutDef = workoutDefs.get(routineName);
        
        let isUpdate = historyMap.has(key);
        let logEntry = historyMap.get(key) || {
            id: new Date(date).toISOString(),
            date: date,
            routine: routineName,
            compound: { name: workoutDef.compound.name, s1: 'Not Logged', s2: 'Not Logged', s3: 'Not Logged' },
            isolations: workoutDef.isolations.map(iso => ({ name: iso.name, log: 'Not Logged' }))
        };

        if(isUpdate) updatedLogsCount++; else newLogsCount++;

        groupedByLog[key].forEach(row => {
            const logValue = row.status === 'Skipped' ? 'Skipped' : (row.reps && row.weight ? `${row.reps}x${row.weight} lbs` : 'Not Logged');
            
            if (row.exercise === workoutDef.compound.name && row.set >= 1 && row.set <= 3) {
                logEntry.compound[`s${row.set}`] = logValue;
            } else {
                const isoIndex = logEntry.isolations.findIndex(i => i.name === row.exercise);
                if (isoIndex !== -1) {
                    logEntry.isolations[isoIndex].log = logValue;
                }
            }
        });
        historyMap.set(key, logEntry);
    }
    
    const updatedHistory = Array.from(historyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
    localStorage.setItem('workoutLogs', JSON.stringify(updatedHistory));
    
    return { newLogsCount, updatedLogsCount, skippedCount };
}

function exportLogs() {
    const history = getHistory();
    if (history.length === 0) return showNotification("No logs to export.", true);
    
    const escapeCsvField = (field) => `"${String(field).replace(/"/g, '""')}"`;
    const header = "Date,Routine,Exercise,Set,Reps,Weight (lbs),Status\n";
    
    const rows = history.flatMap(log => {
        let entryRows = [];
        const { date, routine, compound, isolations } = log;

        const createRow = (exerciseName, setNum, setData) => {
            let reps = '', weight = '';
            let status = 'Not Logged';
            if (setData === 'Skipped') {
                status = 'Skipped';
            } else if (setData && setData !== 'Not Logged') {
                ({ reps, weight } = parseSet(setData));
                status = 'Completed';
            }
            return [
                escapeCsvField(date),
                escapeCsvField(routine),
                escapeCsvField(exerciseName),
                setNum,
                reps,
                weight,
                escapeCsvField(status)
            ].join(',');
        };

        entryRows.push(createRow(compound.name, 1, compound.s1));
        entryRows.push(createRow(compound.name, 2, compound.s2));
        entryRows.push(createRow(compound.name, 3, compound.s3));

        isolations.forEach(iso => {
            entryRows.push(createRow(iso.name, 1, iso.log));
        });

        return entryRows;
    });

    const csvContent = header + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = createDOMElement('a', { href: URL.createObjectURL(blob), download: 'fittracker_logs.csv' });
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleSetCompletion(checkbox, inputIds, isAmrap) {
    const isChecked = checkbox.checked;
    const inputs = inputIds.map(id => document.getElementById(id));
    
    if (isChecked) {
        if (inputs.some(input => input.value === '' || (input.placeholder === 'Reps' && parseFloat(input.value) <= 0))) {
            showNotification('Please enter weight and a valid number of reps (>0).', true);
            checkbox.checked = false;
        } else if (isAmrap) {
            startTimer();
            showNotification('AMRAP timer started for 60 seconds.');
            checkbox.disabled = true;
        }
    } else {
        if (isAmrap) {
            stopTimer(true);
            resetTimer();
        }
    }
    
    inputs.forEach(input => { if (input) input.disabled = isChecked; });
}

function deleteSet(setId) {
    const setRow = document.getElementById(setId);
    if (setRow) {
        const confirmMessage = `Are you sure you want to remove this set? This cannot be undone for this session.`;
        showConfirmDialog(confirmMessage, () => {
            setRow.remove();
            validateWorkoutLog();
            showNotification('Set removed.');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action], button, a');
        if (!target) return;
        
        const actions = {
            'viewHistoryBtn': viewHistory,
            'backToMenuBtn': goHome,
            'historyBackToMenuBtn': goHome,
            'metronomeToggle': toggleMetronome,
            'addMinuteBtn': addMinute,
            'resetTimerBtn': resetTimer,
            'importButton': () => document.getElementById('csvFileInput').click(),
            'exportButton': exportLogs,
            'saveWorkoutBtn': () => saveOrUpdateLog(target.dataset.logId),
            'delete-set': () => deleteSet(target.dataset.setId),
            'edit-log': () => editLog(target.dataset.logIndex),
            'delete-log': () => deleteLog(target.dataset.logIndex),
            'confirmModalConfirm': () => {
                if (typeof confirmCallback === 'function') {
                    confirmCallback();
                }
                document.getElementById('confirmModal').classList.add('hidden');
                confirmCallback = null;
            },
            'confirmModalCancel': () => {
                document.getElementById('confirmModal').classList.add('hidden');
                confirmCallback = null;
            }
        };
        
        const action = actions[target.id] || actions[target.dataset.action];
        if (action) {
            action();
        }
    });

    document.body.addEventListener('change', (event) => {
        const { target } = event;
        if (target.id === 'workoutSelect') startSelectedWorkout();
        else if (target.id === 'csvFileInput') importLogs(event);
        else if (target.dataset.action === 'complete-set') {
            const { inputs, amrap } = target.dataset;
            handleSetCompletion(target, inputs.split(','), amrap === 'true');
        }
    });

    document.body.addEventListener('input', (event) => {
        const { target } = event;
        if (target.dataset.action === 'update-rm') {
            const { exerciseName, badgeId, weightId, repsId } = target.dataset;
            const reps = repsId ? document.getElementById(repsId).value : target.value;
            const weight = weightId ? document.getElementById(weightId).value : target.value;
            updateRM(exerciseName, reps, weight, badgeId);
        } else if (target.closest('#workoutScreen')) {
            validateWorkoutLog();
        }
    }, true);
});
