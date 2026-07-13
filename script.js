let workouts = [];
let currentWorkout = null;
const workoutSelect = document.getElementById('workoutSelect');
let timerInterval = null;
let countdown = 60;
const defaultCountdown = 60;
const timerDisplay = document.getElementById('timerDisplay');
const timerBar = document.getElementById('timerBar');
let audioCtx = null;
let metronomeInterval = null;
let isMetronomeOn = false;

// Function to fetch workouts and initialize the app
async function initializeApp() {
    try {
        const response = await fetch('workouts.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        workouts = await response.json();
        
        // Populate the workout selector dropdown
        workouts.forEach(w => {
            let option = document.createElement('option');
            option.value = w.id;
            option.innerText = w.name;
            workoutSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Could not fetch or parse workouts.json:", error);
        alert("Failed to load workout data. Please try again later.");
    }
}

// Call initializeApp when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);


function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(frequency, duration) {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function playMetronomeBeep() {
    playBeep(880, 0.05);
}

function playTimerEndSound() {
    playBeep(1000, 0.5);
}

function toggleMetronome() {
    initAudio();
    isMetronomeOn = !isMetronomeOn;
    const metronomeBtn = document.getElementById('metronomeToggle');
    if (isMetronomeOn) {
        metronomeBtn.classList.add('active');
        metronomeInterval = setInterval(playMetronomeBeep, 1000);
    } else {
        metronomeBtn.classList.remove('active');
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
}

function stopMetronome() {
    if (isMetronomeOn) {
        toggleMetronome();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(countdown / 60).toString().padStart(2, '0');
    const seconds = (countdown % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${minutes}:${seconds}`;
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        countdown--;
        updateTimerDisplay();
        if (countdown <= 0) {
            stopTimer();
            playTimerEndSound();
            resetTimer();
        }
    }, 1000);
}

function resetTimer() {
    stopTimer();
    countdown = defaultCountdown;
    updateTimerDisplay();
}

function addMinute() {
    countdown += 60;
    updateTimerDisplay();
}

function handleSetCompletion(checkbox, inputIds) {
    const repsInput = document.getElementById(inputIds[0]);
    const weightInput = document.getElementById(inputIds[1]);
    if (checkbox.checked) {
        if (!repsInput.value || !weightInput.value) {
            alert('Please enter reps and weight before completing the set.');
            checkbox.checked = false;
            return;
        }
    }
    toggleSetInputs(checkbox.checked, inputIds);
    if (checkbox.checked) {
        startTimer();
    }
}

function validateWorkoutLog() {
    const saveBtn = document.getElementById('saveWorkoutBtn');
    if (!saveBtn) return;
    let allSetsValid = true;
    const setRows = document.querySelectorAll('#workoutScreen .set-row');
    setRows.forEach(row => {
        const isSkipped = row.classList.contains('skipped');
        const repsInput = row.querySelector('input[type="number"][placeholder="Reps"]');
        const weightInput = row.querySelector('input[type="number"][placeholder="Wt"]');
        if (!isSkipped && (!repsInput.value || !weightInput.value)) {
            allSetsValid = false;
        }
    });
    saveBtn.disabled = !allSetsValid;
}

function skipSet(buttonEl, setId) {
    const setRow = document.getElementById(setId);
    const isSkipped = setRow.classList.toggle('skipped');
    const checkbox = setRow.querySelector('input[type="checkbox"]');
    const repsInput = setRow.querySelector('input[placeholder="Reps"]');
    const weightInput = setRow.querySelector('input[placeholder="Wt"]');
    checkbox.disabled = isSkipped;
    repsInput.disabled = isSkipped;
    weightInput.disabled = isSkipped;
    if (isSkipped) {
        checkbox.checked = false;
        repsInput.value = '';
        weightInput.value = '';
        buttonEl.innerText = 'Unskip';
    } else {
        buttonEl.innerText = 'Skip';
    }
    validateWorkoutLog();
}

function startSelectedWorkout() {
    const selectedWorkoutId = parseInt(workoutSelect.value);
    if (selectedWorkoutId) {
        const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId);
        if (selectedWorkout) {
            loadWorkout(selectedWorkout);
        }
    }
}

function goHome() {
  document.getElementById('mainMenu').classList.remove('hidden');
  document.getElementById('workoutScreen').classList.add('hidden');
  document.getElementById('historyScreen').classList.add('hidden');
  document.getElementById('workoutSelect').value = '';
  timerBar.classList.add('hidden');
  stopTimer();
  stopMetronome();
  currentWorkout = null;
}

function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
}

function toggleSetInputs(isDisabled, inputIds) {
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.disabled = isDisabled;
        }
    });
}

function getStoredMaxes() {
    try {
        return JSON.parse(localStorage.getItem('workoutMaxes') || '{}');
    } catch (e) {
        return {};
    }
}

function saveStoredMax(exerciseName, rm) {
    const maxes = getStoredMaxes();
    maxes[exerciseName] = rm;
    localStorage.setItem('workoutMaxes', JSON.stringify(maxes));
}

function roundToNearest5(num) {
    return Math.round(num / 5) * 5;
}

function calculateRM(weight, reps) {
    if (!weight || !reps || reps < 1) return 0;
    return Math.round(weight * (1 + (reps / 30)));
}

function updateRM(exerciseName, reps, weight, badgeId) {
    const rm = calculateRM(parseFloat(weight), parseFloat(reps));
    if (rm > 0) {
        document.getElementById(badgeId).innerText = `${rm} lbs`;
        saveStoredMax(exerciseName, rm);
    }
    validateWorkoutLog();
}

function parseSet(setString) {
    if (!setString || setString === 'Not Logged' || setString === 'Skipped') return { reps: '', weight: '' };
    const parts = setString.replace(/\s*lbs\s*/, '').split('x');
    return {
        reps: parts[0] || '',
        weight: parts[1] || ''
    };
}

function loadWorkout(w, logData = null, logIndex = null) {
    currentWorkout = w;
    resetTimer();
    timerBar.classList.remove('hidden');
    const maxes = getStoredMaxes();
    const compoundRM = maxes[w.compound.name] || 0;
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('workoutScreen').classList.remove('hidden');
    let html = `<h2>${logData ? 'Edit' : ''} ${w.name}</h2>`;
    html += `<h3>Warm-ups (No Load)</h3>`;
    w.warmups.forEach(wu => {
        html += `<div class="exercise-item"><div class="checkbox-row"><input type="checkbox"><details class="exercise-details"><summary>${wu.name}</summary><div class="details-content">${wu.desc}</div></details></div></div>`;
    });
    const s1 = logData ? parseSet(logData.compound.s1) : { reps: 6, weight: compoundRM ? roundToNearest5(compoundRM * 0.33) : '' };
    const s2 = logData ? parseSet(logData.compound.s2) : { reps: 6, weight: compoundRM ? roundToNearest5(compoundRM * 0.66) : '' };
    const s3 = logData ? parseSet(logData.compound.s3) : { reps: '', weight: compoundRM ? roundToNearest5(compoundRM * 0.80) : '' };
    html += `<h3>Compound Lift</h3>
             <div class="exercise-item">
                <details class="exercise-details"><summary class="compound-summary">${w.compound.name}<span class="rm-badge" id="compound-rm-badge">${compoundRM ? `${compoundRM} lbs` : 'Log a set'}</span></summary><div class="details-content">${w.compound.desc}</div></details>
             </div>
             <div class="set-row" id="cSet1">
                <div class="checkbox-row"><input type="checkbox" onchange="handleSetCompletion(this, ['cReps1', 'cWeight1'])"><div><strong>Set 1</strong> (6 reps @ 33%)</div></div>
                <div class="set-inputs"><input type="number" id="cReps1" placeholder="Reps" value="${s1.reps}" oninput="validateWorkoutLog()"><input type="number" id="cWeight1" placeholder="Wt" value="${s1.weight}" oninput="validateWorkoutLog()"><button class="skip-btn" onclick="skipSet(this, 'cSet1')">Skip</button></div>
             </div>
             <div class="set-row" id="cSet2">
                <div class="checkbox-row"><input type="checkbox" onchange="handleSetCompletion(this, ['cReps2', 'cWeight2'])"><div><strong>Set 2</strong> (6 reps @ 66%)</div></div>
                <div class="set-inputs"><input type="number" id="cReps2" placeholder="Reps" value="${s2.reps}" oninput="validateWorkoutLog()"><input type="number" id="cWeight2" placeholder="Wt" value="${s2.weight}" oninput="validateWorkoutLog()"><button class="skip-btn" onclick="skipSet(this, 'cSet2')">Skip</button></div>
             </div>
             <div class="set-row" id="cSet3">
                <div class="checkbox-row"><input type="checkbox" onchange="handleSetCompletion(this, ['cReps3', 'cWeight3'])"><div><strong>Set 3</strong> (AMRAP @ 80%)</div></div>
                <div class="set-inputs"><input type="number" id="cReps3" placeholder="Reps" value="${s3.reps}" oninput="updateRM('${w.compound.name}', this.value, document.getElementById('cWeight3').value, 'compound-rm-badge')"><input type="number" id="cWeight3" placeholder="Wt" value="${s3.weight}" oninput="updateRM('${w.compound.name}', document.getElementById('cReps3').value, this.value, 'compound-rm-badge')"><button class="skip-btn" onclick="skipSet(this, 'cSet3')">Skip</button></div>
             </div>`;
    html += `<h3>Isolation Lifts (1x AMRAP)</h3>`;
    w.isolations.forEach((iso, idx) => {
        const isoRM = maxes[iso.name] || 0;
        const isoSet = logData && logData.isolations[idx] ? parseSet(logData.isolations[idx].log) : { reps: '', weight: '' };
        html += `
        <div class="exercise-item"><details class="exercise-details"><summary class="isolation-summary">${iso.name}<span class="rm-badge" id="iso-rm-badge-${idx}">${isoRM ? `${isoRM} lbs` : 'Log a set'}</span></summary><div class="details-content">${iso.desc}</div></details></div>
        <div class="set-row" id="isoSet${idx}">
            <div class="checkbox-row"><input type="checkbox" onchange="handleSetCompletion(this, ['isoReps_${idx}', 'isoWeight_${idx}'])"><div><strong>Set 1</strong> (AMRAP)</div></div>
            <div class="set-inputs"><input type="number" id="isoReps_${idx}" placeholder="Reps" value="${isoSet.reps}" oninput="updateRM('${iso.name}', this.value, document.getElementById('isoWeight_${idx}').value, 'iso-rm-badge-${idx}')"><input type="number" id="isoWeight_${idx}" placeholder="Wt" value="${isoSet.weight}" oninput="updateRM('${iso.name}', document.getElementById('isoReps_${idx}').value, this.value, 'iso-rm-badge-${idx}')"><button class="skip-btn" onclick="skipSet(this, 'isoSet${idx}')">Skip</button></div>
        </div>`;
    });
    html += `<h3>Cool-downs</h3>`;
    w.cooldowns.forEach(cd => {
        html += `<div class="exercise-item"><div class="checkbox-row"><input type="checkbox"><details class="exercise-details"><summary>${cd.name}</summary><div class="details-content">${cd.desc}</div></details></div></div>`;
    });
    const buttonAction = logData ? `saveOrUpdateLog(${logIndex})` : `saveOrUpdateLog()`;
    const buttonText = logData ? 'Update Log' : 'Save Workout Log';
    html += `<button id="saveWorkoutBtn" onclick="${buttonAction}">${buttonText}</button>`;
    document.getElementById('workoutContent').innerHTML = html;
    if (logData) {
        Object.entries({s1: 'cSet1', s2: 'cSet2', s3: 'cSet3'}).forEach(([key, id]) => {
            if (logData.compound[key] === 'Skipped') {
                const btn = document.querySelector(`#${id} .skip-btn`);
                if(btn) skipSet(btn, id);
            }
        });
        logData.isolations.forEach((iso, idx) => {
            if (iso.log === 'Skipped') {
                const btn = document.querySelector(`#isoSet${idx} .skip-btn`);
                if(btn) skipSet(btn, `isoSet${idx}`);
            }
        });
    }
    validateWorkoutLog();
}

function getSetData(setId) {
    const setRow = document.getElementById(setId);
    if (setRow.classList.contains('skipped')) return 'Skipped';
    const reps = setRow.querySelector('input[placeholder="Reps"]').value;
    const weight = setRow.querySelector('input[placeholder="Wt"]').value;
    return (reps && weight) ? `${reps}x${weight} lbs` : 'Not Logged';
}

function saveOrUpdateLog(logIndex = null) {
  const log = {
    date: logIndex !== null ? getHistory()[logIndex].date : new Date().toISOString().split('T')[0],
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
  try {
    let history = getHistory();
    if (logIndex !== null) {
        history[logIndex] = log;
        alert('Workout Updated Successfully!');
    } else {
        history.unshift(log);
        alert('Workout Saved Successfully!');
    }
    localStorage.setItem('workoutLogs', JSON.stringify(history));
    goHome();
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
    alert("Error: Could not save workout.");
  }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('workoutLogs') || '[]');
    } catch(e) {
        console.error("Failed to parse history from localStorage:", e);
        return [];
    }
}

function viewHistory() {
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('historyScreen').classList.remove('hidden');
  const history = getHistory();
  document.getElementById('exportButton').disabled = history.length === 0;
  let html = '';
  if (history.length === 0) {
    html = '<p>No workouts logged yet.</p>';
  } else {
    history.forEach((log, index) => {
      html += `<div class="card">
                 <div class="card-header">
                   <strong style="color:#ffd700;">${log.date} - ${log.routine}</strong>
                   <div class="card-actions">
                     <button class="edit-btn" onclick="editLog(${index})">Edit</button>
                     <button class="delete-btn" onclick="deleteLog(${index})">Delete</button>
                   </div>
                 </div>
                 <div style="margin-top:8px; font-size:0.9rem;">
                   <strong>${log.compound.name}:</strong><br>
                   S1: ${log.compound.s1} | S2: ${log.compound.s2} | S3: ${log.compound.s3}<br><br>
                   ${log.isolations.map(i => `<strong>${i.name}:</strong> ${i.log}`).join('<br>')}
                 </div>
               </div>`;
    });
  }
  document.getElementById('historyContent').innerHTML = html;
}

function editLog(logIndex) {
    const history = getHistory();
    const logToEdit = history[logIndex];
    if (logToEdit) {
        const workoutDefinition = workouts.find(w => w.name === logToEdit.routine);
        if (workoutDefinition) {
            loadWorkout(workoutDefinition, logToEdit, logIndex);
        } else {
            alert(`Error: Workout definition for "${logToEdit.routine}" not found.`);
        }
    }
}

function deleteLog(logIndex) {
    if (confirm('Are you sure you want to permanently delete this log?')) {
        let history = getHistory();
        history.splice(logIndex, 1);
        localStorage.setItem('workoutLogs', JSON.stringify(history));
        viewHistory();
    }
}

function triggerImport() {
    document.getElementById('csvFileInput').click();
}

function importLogs(event) {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.csv')) {
        alert("Please select a valid .csv file.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                alert("CSV file is empty or has no data rows.");
                return;
            }
            lines.shift();
            let malformedRows = 0;
            const rawLogs = lines.map((line, index) => {
                const values = line.split(',');
                if (values.length !== 6) {
                    console.warn(`Skipping malformed row ${index + 1}: ${line}`);
                    malformedRows++;
                    return null;
                }
                return { date: values[0], routine: values[1], exercise: values[2], set: parseInt(values[3]), reps: values[4], weight: values[5] };
            }).filter(log => log !== null);

            const existingHistory = getHistory();
            const historyMap = new Map(existingHistory.map(log => [`${log.date}_${log.routine}`, log]));
            let newLogsCount = 0;
            const groupedByDateAndRoutine = rawLogs.reduce((acc, log) => {
                const key = `${log.date}_${log.routine}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(log);
                return acc;
            }, {});

            for (const key in groupedByDateAndRoutine) {
                const group = groupedByDateAndRoutine[key];
                const first = group[0];
                const workoutDef = workouts.find(w => w.name === first.routine);
                if (!workoutDef) continue;
                let logEntry = historyMap.get(key);
                if (!logEntry) {
                    newLogsCount++;
                    logEntry = {
                        date: first.date,
                        routine: first.routine,
                        compound: { name: workoutDef.compound.name, s1: 'Not Logged', s2: 'Not Logged', s3: 'Not Logged' },
                        isolations: workoutDef.isolations.map(iso => ({ name: iso.name, log: 'Not Logged' }))
                    };
                }
                group.forEach(log => {
                    if (log.exercise === workoutDef.compound.name) {
                        logEntry.compound[`s${log.set}`] = `${log.reps}x${log.weight} lbs`;
                    } else {
                        const isoIndex = logEntry.isolations.findIndex(i => i.name === log.exercise);
                        if (isoIndex !== -1) {
                            logEntry.isolations[isoIndex].log = `${log.reps}x${log.weight} lbs`;
                        }
                    }
                });
                historyMap.set(key, logEntry);
            }
            const updatedHistory = Array.from(historyMap.values());
            updatedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
            localStorage.setItem('workoutLogs', JSON.stringify(updatedHistory));
            const updatedCount = Object.keys(groupedByDateAndRoutine).length - newLogsCount;
            let alertMessage = `${newLogsCount} new workout(s) imported, ${updatedCount} existing workout(s) updated.`;
            if (malformedRows > 0) {
                alertMessage += `\n${malformedRows} malformed row(s) were skipped.`;
            }
            alert(alertMessage);
            viewHistory();
        } catch (error) {
            console.error("Failed to import CSV:", error);
            alert("Import failed. Please ensure the CSV file is formatted correctly.");
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function exportLogs() {
    const history = getHistory();
    if (history.length === 0) {
        alert("No logs to export.");
        return;
    }
    const header = "Date,Routine,Exercise,Set,Reps,Weight (lbs)\n";
    const rows = history.map(log => {
        let entryRows = [];
        const { date, routine, compound, isolations } = log;
        const cSets = { s1: 1, s2: 2, s3: 3 };
        for (const [key, num] of Object.entries(cSets)) {
            if (compound[key] === 'Skipped') continue;
            const { reps, weight } = parseSet(compound[key]);
            if (reps && weight) {
                entryRows.push([date, routine, compound.name, num, reps, weight].join(','));
            }
        }
        isolations.forEach(iso => {
            if (iso.log === 'Skipped') return;
            const { reps, weight } = parseSet(iso.log);
            if (reps && weight) {
                entryRows.push([date, routine, iso.name, 1, reps, weight].join(','));
            }
        });
        return entryRows.join('\n');
    }).filter(row => row).join('\n');
    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "fittracker_logs.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
