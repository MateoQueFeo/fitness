const workouts = [
    {
        id: 1, name: "Side Lunge",
        warmups: [
            { name: "Cossack Squats (5/side)", desc: "Stand with feet wide. Shift weight to one side, squatting down while keeping the other leg straight. Alternate sides." },
            { name: "Dynamic Leg Swings (10/leg)", desc: "Stand holding onto a support. Swing one leg forward and backward, then side to side. Repeat on other leg." }
        ],
        compound: { name: "Side Lunge", desc: "Step out laterally, bend knee, push hips back. Keep trailing leg straight." },
        isolations: [
            { name: "Leg Extension Machine", desc: "Extend legs fully, squeeze quads." },
            { name: "Cable Adduction", desc: "Pull cabled leg across front of standing leg." }
        ],
        cooldowns: [
            { name: "Butterfly Stretch (60s)", desc: "Sit on the floor, bring the soles of your feet together, and let your knees fall to the sides. Gently press knees toward the floor." },
            { name: "Kneeling Quad Stretch (60s/leg)", desc: "Kneel on one knee, with the other foot forward. Lean forward and feel the stretch in the hip flexor and quad of the back leg." }
        ]
    },
    {
        id: 2, name: "Incline Chest Press",
        warmups: [
            { name: "Arm Circles (15 fwd/rev)", desc: "Extend arms to the sides. Make small circles forward, then gradually larger. Repeat in reverse." },
            { name: "Bodyweight Arm Crossovers (15 reps)", desc: "Stand with arms extended forward. Swing them open wide, then cross them in front of your chest. Alternate which arm crosses on top." }
        ],
        compound: { name: "30-Degree Incline DB Chest Press", desc: "30-deg incline. Press straight up, lower to chest level." },
        isolations: [
            { name: "Low-to-High Cable Crossover", desc: "Underhand grip, bring hands upward and together." },
            { name: "Overhead Cable Triceps Extension", desc: "Rope attachment, extend arms straight up behind head." }
        ],
        cooldowns: [
            { name: "Doorway Chest Stretch (60s)", desc: "Place forearms on a doorframe, elbows slightly below shoulders. Step forward until you feel a stretch in your chest." },
            { name: "Overhead Triceps Stretch (60s/arm)", desc: "Raise one arm, bend the elbow to drop your hand behind your head. Use the other hand to gently pull the elbow." }
        ]
    },
    {
        id: 3, name: "Walking Lunge",
        warmups: [
            { name: "Bodyweight Forward Lunges (5/leg)", desc: "Step forward with one leg, lowering your hips until both knees are bent at a 90-degree angle. Push back to the start." },
            { name: "High Knees (20s)", desc: "Run in place, bringing your knees up towards your chest as high as possible." }
        ],
        compound: { name: "Walking Lunge", desc: "Hold dumbbells. Step forward, lower hips until rear knee nearly touches ground. Push off rear foot." },
        isolations: [
            { name: "Lying Leg Curl Machine", desc: "Lie face down, pad on lower calves, curl legs up." },
            { name: "Standing Calf Raise", desc: "Stand on edge of block, let heels drop, press up onto toes." }
        ],
        cooldowns: [
            { name: "Standing Wall Calf Stretch (60s/leg)", desc: "Face a wall, step one foot back, keeping the leg straight and heel on the floor. Lean forward." },
            { name: "Seated Toe Touch (60s)", desc: "Sit with legs straight out. Hinge at your hips and reach for your toes, keeping your back straight." }
        ]
    },
    {
        id: 4, name: "Bent-Over Row",
        warmups: [
            { name: "Cat-Cow (10 reps)", desc: "On all fours, inhale as you drop your belly and look up (Cow). Exhale as you round your spine and tuck your chin (Cat)." },
            { name: "Arm Swings (15 reps)", desc: "Stand with feet shoulder-width apart. Swing arms forward and back, then side to side, allowing gentle torso rotation." }
        ],
        compound: { name: "Bent-Over Dumbbell Row", desc: "Hinge at hips, back straight. Pull dumbbells up to ribcage, squeeze shoulder blades." },
        isolations: [
            { name: "Single-Arm Concentration Curl", desc: "Sit on bench, arm against inner thigh, curl weight up." },
            { name: "Cable Rear Delt Fly", desc: "Set cables to shoulder height, cross arms, pull outward and backward." }
        ],
        cooldowns: [
            { name: "Cross-Body Shoulder Stretch (60s/arm)", desc: "Pull one arm across your chest with the other, keeping the shoulder down. Feel the stretch in the back of the shoulder." },
            { name: "Child’s Pose (60s)", desc: "Kneel on the floor, sit back on your heels, and fold forward, resting your forehead on the floor with arms extended." }
        ]
    },
    {
        id: 5, name: "Curtsy Lunge",
        warmups: [
            { name: "Glute Bridges (10 reps)", desc: "Lie on your back, knees bent, feet flat. Lift your hips off the floor until your body forms a straight line from shoulders to knees." },
            { name: "Fire Hydrants (10/leg)", desc: "On all fours, keep your knee bent and lift one leg out to the side, keeping your back flat." }
        ],
        compound: { name: "Curtsy Lunge", desc: "Step right foot diagonally behind left foot, bend both knees." },
        isolations: [
            { name: "Cable Glute Kickback", desc: "Attach ankle strap to low cable, kick leg straight back." },
            { name: "Seated Hip Abduction Machine", desc: "Push legs outward against resistance." }
        ],
        cooldowns: [
            { name: "Figure-4 Stretch (60s/leg)", desc: "Lie on your back, cross one ankle over the opposite knee. Pull the bottom leg toward your chest." },
            { name: "Pigeon Pose (60s/leg)", desc: "From a plank, bring one knee forward to the outside of the same-side hand, and extend the back leg. Fold forward." }
        ]
    },
    {
        id: 6, name: "Standing Arnold Press",
        warmups: [
            { name: "Shoulder Shrugs (15 reps)", desc: "Stand tall and lift your shoulders up toward your ears, then lower them back down." },
            { name: "Wall Angels (10 reps)", desc: "Stand with your back against a wall. Slide your arms up and down the wall, keeping elbows and wrists in contact." }
        ],
        compound: { name: "Standing Arnold Press", desc: "Palms facing you. Press overhead and rotate wrists so palms face forward." },
        isolations: [
            { name: "Dumbbell Lateral Raise", desc: "Raise weights straight out to sides with slight elbow bend." },
            { name: "Cable Triceps Pushdown", desc: "Keep elbows pinned, push bar down until arms extended." }
        ],
        cooldowns: [
            { name: "Neck Lateral Flexion Stretch (30s/side)", desc: "Gently tilt your head to one side, bringing your ear toward your shoulder. Do not force the stretch." },
            { name: "Behind-the-Back Shoulder Stretch (60s)", desc: "Clasp hands behind your back and gently lift your arms away from your body." }
        ]
    },
    {
        id: 7, name: "Romanian Deadlift",
        warmups: [
            { name: "Bodyweight Good Mornings (10 reps)", desc: "Stand with feet shoulder-width apart, hands behind head. Hinge at the hips, keeping back straight, until your torso is parallel to the floor." },
            { name: "Inchworms (5 reps)", desc: "From standing, fold forward and walk your hands out to a plank position. Walk your feet in to meet your hands." }
        ],
        compound: { name: "Romanian Deadlift", desc: "Legs mostly straight, back flat, push hips backward to lower weight down legs." },
        isolations: [
            { name: "Seated Leg Curl Machine", desc: "Pad above ankles, pull heels backward and down." },
            { name: "45-Degree Back Extension", desc: "Lock feet, lower upper body, use lower back to pull torso up." }
        ],
        cooldowns: [
            { name: "Downward Facing Dog (60s)", desc: "From all fours, lift your hips up and back, forming an inverted V-shape with your body." },
            { name: "Supine Knee-to-Chest (60s/leg)", desc: "Lie on your back and pull one knee into your chest, holding the stretch." }
        ]
    },
    {
        id: 8, name: "Lat Pulldown",
        warmups: [
            { name: "Scapular Pull-ups (10 reps)", desc: "Hang from a pull-up bar. Without bending your arms, pull your shoulder blades down and back, lifting your body slightly." },
            { name: "Torso Twists (15 reps/side)", desc: "Stand with feet wide, holding a light weight or just your hands. Rotate your torso from side to side." }
        ],
        compound: { name: "Lat Pulldown", desc: "Wide grip. Pull bar down to upper chest driving elbows down and back." },
        isolations: [
            { name: "Straight Arm Cable Pulldown", desc: "Straight bar high pulley, push bar down in arc to thighs." },
            { name: "Dumbbell Hammer Curl", desc: "Neutral grip, curl weights toward shoulders." }
        ],
        cooldowns: [
            { name: "Overhead Lat Stretch (60s/arm)", desc: "Reach one arm overhead, grasp the wrist with your other hand, and gently pull to the side." },
            { name: "Wrist Flexor/Extensor Stretch (30s each way/arm)", desc: "Extend one arm, palm up. Use the other hand to pull the fingers back. Flip your hand over and repeat." }
        ]
    }
];
let currentWorkout = null;
const workoutSelect = document.getElementById('workoutSelect');
workouts.forEach(w => {
  let option = document.createElement('option');
  option.value = w.id;
  option.innerText = w.name;
  workoutSelect.appendChild(option);
});
let timerInterval = null;
let countdown = 60;
const defaultCountdown = 60;
const timerDisplay = document.getElementById('timerDisplay');
const timerBar = document.getElementById('timerBar');
let audioCtx = null;
let metronomeInterval = null;
let isMetronomeOn = false;

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
