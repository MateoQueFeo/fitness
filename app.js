(function() {
    
    let db;
    const DB_NAME = 'GymLogDB';
    const DB_VERSION = 2;
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
            request.onerror = (event) => reject(event.target.errorCode);
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve();
            };
        });
    }

    
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
              .then(reg => console.log('Service Worker registered.'))
              .catch(err => console.warn('Service Worker registration failed:', err));
        });
    }

    
    let workoutLogs = [];
    let workoutRoutines = [];
    let timerInstance = null;
    let defaultSeconds = 60;
    let currentSecondsRemaining = defaultSeconds;
    let metronomeInterval = null;
    let metronomeAudioCtx = null;
    let progressChart = null;
    let wakeLock = null;
    let timerEndTime = null;

    const exerciseInfo = {
        'Side Lunge': {
            title: 'Side Lunge (Lateral Lunge)',
            body: {
                description: 'A unilateral exercise targeting the inner/outer thighs, glutes, and quads.',
                points: ['Keep your chest up and back straight.', 'Step out to one side, keeping the trailing leg straight.', 'Lower your hips down and back, as if sitting in a chair.']
            }
        },
        '30-degree Incline Press': {
            title: '30-Degree Incline Press',
            body: {
                description: 'This press variation emphasizes the upper (clavicular) head of the pectoralis major.',
                points: ['Set the bench to a low incline (around 30 degrees).', 'Keep your shoulder blades retracted on the bench.', 'Lower the weight to your upper chest, then press back up.']
            }
        },
        'Bent-Over Row': {
            title: 'Bent-Over Row',
            body: {
                description: 'A compound exercise for building a strong back, targeting the lats, rhomboids, and rear delts.',
                points: ['Hinge at your hips, keeping your back straight.', 'Pull the weight towards your lower chest/upper abdomen.', 'Squeeze your shoulder blades together at the top.']
            }
        },
        'Walking Lunge': {
            title: 'Walking Lunge',
            body: {
                description: 'A dynamic lunge variation that improves balance, coordination, and single-leg strength.',
                points: ['Step forward, lowering your hips until both knees are bent at a 90-degree angle.', 'Push off the back foot to bring it forward and step into the next lunge.', 'Keep your torso upright and core engaged.']
            }
        },
        'Back Extension': {
            title: 'Back Extension',
            body: {
                description: 'An exercise that targets the lower back (erector spinae) as well as the glutes and hamstrings.',
                points: ['Hinge at the hips, keeping your back straight.', 'Raise your torso until your body forms a straight line.', 'Avoid hyperextending your back at the top.']
            }
        },
        'Pull-Up': {
            title: 'Pull-Up',
            body: {
                description: 'A challenging bodyweight exercise that builds upper body pulling strength, primarily targeting the lats and biceps.',
                points: ['Start from a dead hang with arms fully extended.', 'Pull your chest towards the bar.', 'Lower yourself in a controlled manner.']
            }
        },
        'Lat Pulldown': {
            title: 'Lat Pulldown',
            body: {
                description: 'A machine-based alternative to pull-ups, targeting the latissimus dorsi muscles of the back.',
                points: ['Keep your chest up and shoulders down.', 'Pull the bar down to your upper chest.', 'Squeeze your shoulder blades together.']
            }
        },
        'Curtsy Lunge': {
            title: 'Curtsy Lunge',
            body: {
                description: 'A lunge variation that targets the gluteus medius and inner thighs more than a traditional lunge.',
                points: ['Step one leg behind you and to the opposite side, as if doing a curtsy.', 'Keep your front knee aligned with your front ankle.', 'Maintain an upright torso.']
            }
        },
        'Arnold Press': {
            title: 'Arnold Press',
            body: {
                description: 'A dumbbell shoulder press variation that incorporates rotation to target all three heads of the deltoid.',
                points: ['Start with palms facing you, then rotate to palms-forward as you press overhead.', 'Perform the movement in a smooth, controlled arc.']
            }
        },
        'Romanian Deadlift': {
            title: 'Romanian Deadlift (RDL)',
            body: {
                description: 'A hamstring-focused hinge movement that also works the glutes and lower back.',
                points: ['Keep a slight bend in your knees but do not squat.', 'Hinge at your hips, keeping the weight close to your legs.', 'Maintain a flat back throughout the movement.']
            }
        }
    };

    const DOMElements = {
        restoreInput: document.getElementById('restoreInput'), loadButton: document.getElementById('loadButton'), saveButton: document.getElementById('saveButton'),
        navTabs: document.querySelectorAll('.nav-tab'), views: document.querySelectorAll('.view-container'),
        timerDisplay: document.getElementById('timerDisplay'), addTimeBtn: document.getElementById('addTimeBtn'), resetTimerBtn: document.getElementById('resetTimerBtn'), metronomeBtn: document.getElementById('metronomeBtn'),
        autoTimerCheck: document.getElementById('autoTimer'), activeRoutineSelect: document.getElementById('activeRoutineSelect'), routineChecklist: document.getElementById('routineChecklist'),
        logList: document.getElementById('logList'), historyList: document.getElementById('historyList'),
        exerciseSelect: document.getElementById('exerciseSelect'), progressChartCtx: document.getElementById('progressChart').getContext('2d'),
        routineName: document.getElementById('routineName'), warmupInput: document.getElementById('warmupInput'), cooldownInput: document.getElementById('cooldownInput'),
        exerciseRowsContainer: document.getElementById('exerciseRowsContainer'), addExerciseRowBtn: document.getElementById('addExerciseRowBtn'), saveRoutineBtn: document.getElementById('saveRoutineBtn'),
        routineList: document.getElementById('routineList'),
        exerciseModal: document.getElementById('exerciseModal'), modalOverlay: document.getElementById('modalOverlay'), modalContent: document.getElementById('modalContent'),
        modalTitle: document.getElementById('modalTitle'), modalBody: document.getElementById('modalBody'), modalCloseBtn: document.getElementById('modalCloseBtn'),
    };

    
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-entry pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300`;
        
        if (type === 'error') {
            toast.className += ' bg-red-950/90 border-red-800 text-red-200';
        } else if (type === 'success') {
            toast.className += ' bg-emerald-950/90 border-emerald-800 text-emerald-200';
        } else {
            toast.className += ' bg-zinc-900/95 border-zinc-700 text-yellow-500';
        }

        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.replace('toast-entry', 'toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    function openExerciseModal(exerciseName) {
        const info = exerciseInfo[exerciseName];
        const modalBody = DOMElements.modalBody;
        modalBody.innerHTML = '';
        DOMElements.modalTitle.textContent = info ? info.title : exerciseName;
        if (info && info.body) {
            if (info.body.description) {
                const p = document.createElement('p');
                p.textContent = info.body.description;
                modalBody.appendChild(p);
            }
            if (info.body.points && info.body.points.length > 0) {
                const strong = document.createElement('strong');
                strong.textContent = 'Key Points:';
                modalBody.appendChild(strong);
                const ul = document.createElement('ul');
                info.body.points.forEach(pointText => {
                    const li = document.createElement('li');
                    li.textContent = pointText;
                    ul.appendChild(li);
                });
                modalBody.appendChild(ul);
            }
        } else {
            const p = document.createElement('p');
            p.textContent = 'No information is available for this exercise yet.';
            modalBody.appendChild(p);
        }
        DOMElements.exerciseModal.classList.remove('hidden');
        setTimeout(() => {
            DOMElements.modalOverlay.classList.replace('opacity-0', 'opacity-100');
            DOMElements.modalContent.classList.replace('opacity-0', 'opacity-100');
            DOMElements.modalContent.classList.replace('scale-95', 'scale-100');
        }, 10);
    }

    function closeExerciseModal() {
        DOMElements.modalOverlay.classList.replace('opacity-100', 'opacity-0');
        DOMElements.modalContent.classList.replace('opacity-100', 'opacity-0');
        DOMElements.modalContent.classList.replace('scale-100', 'scale-95');
        setTimeout(() => DOMElements.exerciseModal.classList.add('hidden'), 200);
    }
    
    const getISODate = () => new Date().toISOString().slice(0, 10);

    async function loadData() {
        const store = db.transaction(LOG_STORE_NAME, 'readonly').objectStore(LOG_STORE_NAME);
        workoutLogs = (await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        })).sort((a, b) => b.id - a.id);
        loadRoutines();
    }

    function loadRoutines() {
        const defaultRoutines = [
            { id: 1, name: "Side Lunge & Adduction", warmups: ["Hip Circles (10 each way)", "Leg Swings (10 each leg)"], exercises: [ { name: "Side Lunge", type: "warm-up", pct: 33, reps: "6" }, { name: "Side Lunge", type: "ramp", pct: 66, reps: "6" }, { name: "Side Lunge", type: "working", pct: 80, reps: "amrap" }, { name: "Hip Adduction", type: "isolation", pct: 75, reps: "amrap" }, { name: "Calf Raise", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Butterfly Stretch (30s)", "Standing Calf Stretch (30s per side)"] },
            { id: 2, name: "30-deg Incline Press", warmups: ["Arm Circles (12 each way)", "Band Pull-Aparts (15 reps)"], exercises: [ { name: "30-degree Incline Press", type: "warm-up", pct: 33, reps: "6" }, { name: "30-degree Incline Press", type: "ramp", pct: 66, reps: "6" }, { name: "30-degree Incline Press", type: "working", pct: 80, reps: "amrap" }, { name: "Incline Fly", type: "isolation", pct: 75, reps: "amrap" }, { name: "Front Raise", type: "isolation", pct: 75, reps: "amrap" }, { name: "Tricep Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Doorway Chest Stretch (30s)", "Overhead Tricep Stretch (30s per side)"] },
            { id: 3, name: "Walking Lunge & Back Ext", warmups: ["Cat-Cow (10 cycles)", "Glute Bridges (15 reps)"], exercises: [ { name: "Walking Lunge", type: "warm-up", pct: 33, reps: "6" }, { name: "Walking Lunge", type: "ramp", pct: 66, reps: "6" }, { name: "Walking Lunge", type: "working", pct: 80, reps: "amrap" }, { name: "Back Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Kneeling Hip Flexor Stretch (30s per side)", "Child's Pose (60s)"] },
            { id: 4, name: "Bent-Over Row", warmups: ["T-Spine Rotations (8 each side)", "Scapular Retractions (15 reps)"], exercises: [ { name: "Bent-Over Row", type: "warm-up", pct: 33, reps: "6" }, { name: "Bent-Over Row", type: "ramp", pct: 66, reps: "6" }, { name: "Bent-Over Row", type: "working", pct: 80, reps: "amrap" }, { name: "Straight-Arm Pulldown", type: "isolation", pct: 75, reps: "amrap" }, { name: "Incline Curl", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Dead Hang (30s)", "Bicep Wall Stretch (30s per side)"] },
            { id: 5, name: "Curtsy Lunge & Abduction", warmups: ["Fire Hydrants (15 each side)", "Lateral Band Walks (10 each side)"], exercises: [ { name: "Curtsy Lunge", type: "warm-up", pct: 33, reps: "6" }, { name: "Curtsy Lunge", type: "ramp", pct: 66, reps: "6" }, { name: "Curtsy Lunge", type: "working", pct: 80, reps: "amrap" }, { name: "Hip Abduction", type: "isolation", pct: 75, reps: "amrap" }, { name: "Calf Raise", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Pigeon Pose (30s per side)", "Figure-Four Stretch (30s per side)"] },
            { id: 6, name: "Arnold Press", warmups: ["Shoulder Halos (8 each way)", "Face Pulls (20 reps)"], exercises: [ { name: "Arnold Press", type: "warm-up", pct: 33, reps: "6" }, { name: "Arnold Press", type: "ramp", pct: 66, reps: "6" }, { name: "Arnold Press", type: "working", pct: 80, reps: "amrap" }, { name: "Lateral Raise", type: "isolation", pct: 75, reps: "amrap" }, { name: "Reverse Fly", type: "isolation", pct: 75, reps: "amrap" }, { name: "Tricep Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Cross-Body Shoulder Stretch (30s per side)", "Overhead Tricep Stretch (30s per side)"] },
            { id: 7, name: "Romanian Deadlift", warmups: ["Cat-Cow (10 cycles)", "Good Mornings (Bodyweight, 12 reps)"], exercises: [ { name: "Romanian Deadlift", type: "warm-up", pct: 33, reps: "6" }, { name: "Romanian Deadlift", type: "ramp", pct: 66, reps: "6" }, { name: "Romanian Deadlift", type: "working", pct: 80, reps: "amrap" }, { name: "Back Extension", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Lying Hamstring Stretch (30s per side)", "Child's Pose (60s)"] },
            { id: 8, name: "Pull-Up", warmups: ["Scapular Pull-ups (10 reps)", "Dead Hang (20s)"], exercises: [ { name: "Pull-Up", type: "warm-up", pct: 33, reps: "6" }, { name: "Pull-Up", type: "ramp", pct: 66, reps: "6" }, { name: "Pull-Up", type: "working", pct: 80, reps: "amrap" }, { name: "Straight-Arm Pulldown", type: "isolation", pct: 75, reps: "amrap" }, { name: "Incline Curl", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Doorway Lat Stretch (30s per side)", "Bicep Wall Stretch (30s per side)"] },
            { id: 9, name: "Lat Pulldown", warmups: ["Scapular Retractions (15 reps)", "Light Band Pulldowns (15 reps)"], exercises: [ { name: "Lat Pulldown", type: "warm-up", pct: 33, reps: "6" }, { name: "Lat Pulldown", type: "ramp", pct: 66, reps: "6" }, { name: "Lat Pulldown", type: "working", pct: 80, reps: "amrap" }, { name: "Straight-Arm Pulldown", type: "isolation", pct: 75, reps: "amrap" }, { name: "Incline Curl", type: "isolation", pct: 75, reps: "amrap" } ], cooldowns: ["Doorway Lat Stretch (30s per side)", "Bicep Wall Stretch (30s per side)"] }
        ];
        const storedRoutines = JSON.parse(localStorage.getItem('workoutRoutines'));
        workoutRoutines = (storedRoutines && storedRoutines.length > 0) ? storedRoutines : defaultRoutines;
    }

    function saveRoutines() {
        localStorage.setItem('workoutRoutines', JSON.stringify(workoutRoutines));
    }
    
    function backupData() {
        const payload = { logs: workoutLogs, routines: workoutRoutines };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `gym-log-backup-${getISODate()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
    
    
    async function restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            let importedData;
            try {
                importedData = JSON.parse(e.target.result);
                if (!importedData || typeof importedData !== 'object' || !Array.isArray(importedData.logs) || !Array.isArray(importedData.routines)) {
                    throw new Error("Invalid backup structure. It must contain 'logs' and 'routines' arrays.");
                }
                for (const log of importedData.logs) {
                    if (typeof log.id === 'undefined' || typeof log.date === 'undefined' || typeof log.exercise === 'undefined' || typeof log.weight === 'undefined' || typeof log.reps === 'undefined') {
                        throw new Error(`Corrupted log data found. Entry with ID ${log.id || '(unknown)'} is missing required fields.`);
                    }
                }
                 for (const routine of importedData.routines) {
                    if (typeof routine.id === 'undefined' || typeof routine.name === 'undefined' || !Array.isArray(routine.exercises)) {
                        throw new Error(`Corrupted routine data found. Entry with ID ${routine.id || '(unknown)'} is missing required fields.`);
                    }
                }
            } catch (err) {
                console.error('Backup validation failed:', err);
                showToast(err.message || 'The selected file is not a valid backup.', 'error');
                event.target.value = '';
                return;
            }
            if (!confirm("This will replace all existing data with the backup. Are you sure?")) {
                event.target.value = '';
                return;
            }
            try {
                const tx = db.transaction(LOG_STORE_NAME, 'readwrite');
                const store = tx.objectStore(LOG_STORE_NAME);
                await new Promise((resolve, reject) => {
                    const req = store.clear();
                    req.onsuccess = resolve;
                    req.onerror = () => reject(new Error("Failed to clear existing logs."));
                });
                for (const log of importedData.logs) {
                    await new Promise((resolve, reject) => {
                        const req = store.put(log);
                        req.onerror = () => reject(new Error(`Failed to add log ID: ${log.id}`));
                        req.onsuccess = resolve;
                    });
                }
                workoutRoutines = importedData.routines;
                saveRoutines();
                await loadData();
                fullRender();
                showToast("Backup restored successfully!", "success");
            } catch (err) {
                console.error('Database restore transaction failed:', err);
                showToast('Database error. Restore failed and no data was changed.', 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            showToast('Failed to read the selected file.', 'error');
            event.target.value = '';
        };
        reader.readAsText(file);
    }
    
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                if (!wakeLock || wakeLock.released) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        }
    }
    
    function releaseWakeLock() {
        if (wakeLock && !wakeLock.released) {
            wakeLock.release().then(() => { wakeLock = null; });
        }
    }
    
    function switchView(targetView) {
        DOMElements.views.forEach(view => view.classList.toggle('hidden', view.id !== `view-${targetView}`));
        DOMElements.navTabs.forEach(tab => {
            const isTarget = tab.dataset.view === targetView;
            tab.classList.toggle('border-yellow-500', isTarget);
            tab.classList.toggle('text-yellow-500', isTarget);
            tab.classList.toggle('border-transparent', !isTarget);
            tab.classList.toggle('text-gray-500', !isTarget);
        });
        if (targetView === 'track') renderTodaysLogs();
        if (targetView === 'history') renderHistory();
        if (targetView === 'progress') { populateExerciseDropdown(); updateChart(); }
        if (targetView === 'routines') {
            renderRoutines();
            if (DOMElements.exerciseRowsContainer.children.length === 0) {
                addExerciseRow();
            }
        }
    }
    
    function updateTimerDisplay() {
        DOMElements.timerDisplay.innerText = `${String(Math.floor(currentSecondsRemaining / 60)).padStart(2, '0')}:${String(currentSecondsRemaining % 60).padStart(2, '0')}`;
    }
    
    function startTimer() {
        clearInterval(timerInstance);
        requestWakeLock();
        timerEndTime = Date.now() + (currentSecondsRemaining * 1000);
        timerInstance = setInterval(() => {
            const remaining = Math.round((timerEndTime - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(timerInstance);
                timerInstance = null;
                releaseWakeLock();
                alertUser();
                currentSecondsRemaining = defaultSeconds;
            } else {
                currentSecondsRemaining = remaining;
            }
            updateTimerDisplay();
        }, 250);
    }
    
    function addTime(seconds) {
        if (timerInstance) {
            timerEndTime += (seconds * 1000);
            currentSecondsRemaining += seconds;
        } else {
            currentSecondsRemaining += seconds;
            startTimer();
        }
        updateTimerDisplay();
    }
    
    function resetTimer() {
        clearInterval(timerInstance);
        timerInstance = null;
        timerEndTime = null;
        releaseWakeLock();
        currentSecondsRemaining = defaultSeconds;
        updateTimerDisplay();
    }
    
    function alertUser() {
        try {
            const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator(), gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            setTimeout(() => oscillator.stop(), 800);
        } catch (e) { console.warn("Audio play blocked", e); }
    }
    
    function accurateInterval(fn, time) {
        let nextAt, timeout;
        const wrapper = () => { nextAt += time; timeout = setTimeout(wrapper, nextAt - Date.now()); fn(); };
        const start = () => { nextAt = Date.now() + time; timeout = setTimeout(wrapper, time); };
        const stop = () => clearTimeout(timeout);
        return { start, stop };
    }
    
    function toggleMetronome() {
        const btn = DOMElements.metronomeBtn;
        if (metronomeInterval) {
            metronomeInterval.stop();
            metronomeInterval = null;
            btn.classList.remove('text-yellow-500', 'border-yellow-500');
            btn.classList.add('text-gray-400', 'border-zinc-700');
        } else {
            playMetronomeClick();
            metronomeInterval = accurateInterval(playMetronomeClick, 1000);
            metronomeInterval.start();
            btn.classList.remove('text-gray-400', 'border-zinc-700');
            btn.classList.add('text-yellow-500', 'border-yellow-500');
        }
    }
    
    function playMetronomeClick() {
        try {
            if (!metronomeAudioCtx) metronomeAudioCtx = new(window.AudioContext || window.webkitAudioContext)();
            if (metronomeAudioCtx.state === 'suspended') metronomeAudioCtx.resume();
            const oscillator = metronomeAudioCtx.createOscillator(), gainNode = metronomeAudioCtx.createGain();
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1000, metronomeAudioCtx.currentTime);
            gainNode.gain.setValueAtTime(1.0, metronomeAudioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, metronomeAudioCtx.currentTime + 0.05);
            oscillator.connect(gainNode);
            gainNode.connect(metronomeAudioCtx.destination);
            oscillator.start();
            oscillator.stop(metronomeAudioCtx.currentTime + 0.05);
        } catch (e) { console.warn("Metronome click failed", e); }
    }
    
    function getEstimated1RM(exerciseName) {
        const filteredLogs = workoutLogs.filter(log => log.exercise.toLowerCase().trim() === exerciseName.toLowerCase().trim());
        if (filteredLogs.length === 0) return null;
        const maxE1RM = Math.max(...filteredLogs.map(log => {
            const weight = parseFloat(log.weight);
            const reps = parseInt(log.reps);
            if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return 0;
            return weight * (1 + (reps / 30));
        }));
        return maxE1RM > 0 ? maxE1RM : null;
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
        const logIndex = workoutLogs.findIndex(log => log.id === id);
        if (logIndex > -1) workoutLogs.splice(logIndex, 1);
        
        document.querySelectorAll(`[data-log-id="${id}"]`).forEach(el => {
            const parentGroup = el.parentElement;
            el.remove();
            if (parentGroup && parentGroup.children.length === 0 && parentGroup.parentElement.className.includes('border-l-2')) {
                const dateGroup = parentGroup.parentElement;
                if(dateGroup.querySelectorAll('[data-log-id]').length === 0) {
                     dateGroup.remove();
                }
            }
        });

        if (DOMElements.logList.children.length === 0) renderTodaysLogs();
        if (DOMElements.historyList.children.length === 0) renderHistory();
        populateExerciseDropdown();
        updateChart();
    }
    
    function createLogItemDOM(log, isHistory = false) {
        const item = document.createElement('div');
        item.setAttribute('data-log-id', log.id);
        const deleteBtnHTML = `<button data-action="delete-log" data-id="${log.id}" class="text-red-400 hover:text-red-500 font-bold px-1.5 text-xs transition">✕</button>`;

        if (isHistory) {
            item.className = "flex justify-between items-center bg-zinc-800 p-2.5 rounded-lg border border-zinc-700/50 text-sm mt-1.5";
            item.innerHTML = `<span class="text-gray-300 font-medium">${log.exercise}</span><div class="flex items-center gap-3"><span class="text-yellow-500 font-semibold">${log.weight} lbs × ${log.reps}</span>${deleteBtnHTML}</div>`;
        } else {
            item.className = "flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700/60";
            item.innerHTML = `<div class="font-semibold text-white">${log.exercise}</div><div class="flex items-center gap-4"><span class="text-yellow-500 font-bold">${log.weight} lbs × ${log.reps}</span>${deleteBtnHTML.replace('text-xs', 'text-sm')}</div>`;
        }
        return item;
    }
    
    function addLogToView(log) {
        const placeholder = DOMElements.logList.querySelector('p');
        if (placeholder) placeholder.remove();
        DOMElements.logList.prepend(createLogItemDOM(log));
    }
    
    function renderTodaysLogs() {
        const list = DOMElements.logList;
        list.innerHTML = '';
        const todaysLogs = workoutLogs.filter(log => log.date === getISODate());
        if (todaysLogs.length === 0) {
            list.innerHTML = '<p class="text-zinc-500 text-sm text-center py-2">No sets logged yet today.</p>';
        } else {
            todaysLogs.forEach(log => list.appendChild(createLogItemDOM(log, false)));
        }
    }
    
    function renderHistory() {
        const list = DOMElements.historyList;
        list.innerHTML = '';
        const pastLogs = workoutLogs.filter(log => log.date !== getISODate());
        if (pastLogs.length === 0) {
            list.innerHTML = '<p class="text-zinc-500 text-sm text-center py-4">No past history found.</p>';
            return;
        }
        const groupedLogs = pastLogs.reduce((groups, log) => {
            if (!groups[log.date]) groups[log.date] = [];
            groups[log.date].push(log);
            return groups;
        }, {});
        Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = "mb-4 border-l-2 border-yellow-500 pl-3";
            dateGroup.innerHTML = `<h3 class="text-gray-400 font-bold text-sm mb-2">${new Date(date + 'T00:00:00').toLocaleDateString(undefined, {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</h3>`;
            const setsContainer = document.createElement('div');
            setsContainer.className = "space-y-1";
            groupedLogs[date].forEach(log => setsContainer.appendChild(createLogItemDOM(log, true)));
            dateGroup.appendChild(setsContainer);
            list.appendChild(dateGroup);
        });
    }
    
    function populateRoutineDropdown() {
        const select = DOMElements.activeRoutineSelect;
        select.innerHTML = '<option value="">-- Custom Workout --</option>';
        workoutRoutines.forEach(routine => {
            const opt = document.createElement('option');
            opt.value = routine.id;
            opt.textContent = routine.name;
            select.appendChild(opt);
        });
    }
    
    function renderRoutineChecklist() {
        const selectId = DOMElements.activeRoutineSelect.value;
        const container = DOMElements.routineChecklist;
        if (!selectId) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }
        const routine = workoutRoutines.find(r => String(r.id) === selectId);
        if (!routine) return;
        container.classList.remove('hidden');
        container.innerHTML = '';
        if (routine.warmups && routine.warmups.length > 0) {
            const content = routine.warmups.map(item => `<div class="p-2 border-b border-zinc-700/50 last:border-0 text-gray-300 text-sm">${item}</div>`).join('');
            container.insertAdjacentHTML('beforeend', createCollapsibleWidget('🔥 Warm-Up Guidelines', content));
        }
        const groupedExercises = routine.exercises.reduce((acc, ex, originalIndex) => {
            ex.originalIndex = originalIndex;
            const group = acc.find(g => g.name === ex.name);
            if (group) group.sets.push(ex);
            else acc.push({ name: ex.name, sets: [ex] });
            return acc;
        }, []);
        groupedExercises.forEach(group => {
            const estimated1RM = getEstimated1RM(group.name);
            let setsHtml = '';
            group.sets.forEach(ex => {
                const index = ex.originalIndex;
                let defaultWeight = "", defaultReps = ex.reps.toLowerCase() === 'amrap' ? '' : ex.reps;
                if (estimated1RM) {
                    const computedWeight = Math.round((estimated1RM * (ex.pct / 100)) / 5) * 5;
                    defaultWeight = computedWeight;
                }
                setsHtml += `<div id="step-${index}" class="flex items-center gap-3 py-3 border-b border-zinc-700/50 last:border-0 check-anim transition-all"><div class="flex-1 min-w-0"><div class="flex gap-2 items-center"><input type="number" id="wt-${index}" value="${defaultWeight}" placeholder="lbs" class="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-sm text-center focus:outline-none focus:border-yellow-500 transition"><span class="text-zinc-600 text-sm font-bold">×</span><input type="number" id="rp-${index}" value="${defaultReps}" placeholder="reps" class="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-sm text-center focus:outline-none focus:border-yellow-500 transition"></div></div><div class="flex gap-1.5 items-stretch h-10 flex-shrink-0 self-end"><button data-action="skip" data-index="${index}" class="w-10 text-zinc-500 hover:text-red-400 bg-zinc-950 rounded border border-zinc-800 transition flex items-center justify-center" title="Skip Set" aria-label="Skip Set"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg></button><button id="btn-complete-${index}" data-action="complete" data-index="${index}" data-exercise-name="${ex.name.replace(/"/g, '&quot;')}" class="w-12 bg-zinc-950 border border-zinc-600 rounded flex items-center justify-center text-transparent hover:border-yellow-500 hover:text-yellow-500/30 transition check-anim" title="Complete Set" aria-label="Complete Set"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></button></div></div>`;
            });
            container.insertAdjacentHTML('beforeend', `<div class="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden shadow-sm"><div class="bg-zinc-700/30 px-4 py-2 border-b border-zinc-700 flex justify-between items-center"><button class="font-bold text-gray-200 exercise-info-btn" data-action="show-info" data-exercise-name="${group.name.replace(/"/g, '&quot;')}">${group.name}</button>${estimated1RM ? `<span class="text-xs font-bold text-yellow-500 bg-zinc-900 px-2 py-1 rounded-md">e1RM: ${Math.round(estimated1RM)} lbs</span>` : ''}</div><div class="px-3">${setsHtml}</div></div>`);
        });
        if (routine.cooldowns && routine.cooldowns.length > 0) {
            const content = routine.cooldowns.map(item => `<div class="p-2 border-b border-zinc-700/50 last:border-0 text-gray-300 text-sm">${item}</div>`).join('');
            container.insertAdjacentHTML('beforeend', createCollapsibleWidget('❄️ Cool-Down Guidelines', content));
        }
    }
    
    function createCollapsibleWidget(title, content) {
        return `<div class="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden shadow-sm"><details open><summary class="bg-zinc-700/30 px-4 py-2 cursor-pointer list-none flex justify-between items-center"><h3 class="font-bold text-gray-200 inline">${title}</h3><span class="text-xs text-zinc-400">Tap to toggle</span></summary><div class="p-3">${content}</div></details></div>`;
    }
    
    function addExerciseRow() {
        const template = document.getElementById('exerciseRowTemplate');
        DOMElements.exerciseRowsContainer.appendChild(template.content.cloneNode(true));
    }
    
    function saveRoutine() {
        const name = DOMElements.routineName.value.trim();
        if (!name) {
            return showToast("Please provide a template name.", "error");
        }
        const exerciseRows = DOMElements.exerciseRowsContainer.children;
        if (exerciseRows.length === 0) {
            return showToast("Please add at least one exercise step.", "error");
        }
        const exercises = [];
        for (const row of exerciseRows) {
            const exName = row.querySelector('.ex-name').value.trim();
            const exType = row.querySelector('.ex-type').value;
            const exPct = row.querySelector('.ex-pct').value.trim();
            const exReps = row.querySelector('.ex-reps').value.trim();
            if (!exName || !exPct || !exReps) {
                return showToast("Please fill out Name, %1RM, and Reps for all exercises.", "error");
            }
            exercises.push({ name: exName, type: exType, pct: parseInt(exPct), reps: exReps });
        }
        const warmups = DOMElements.warmupInput.value.split('\n').filter(Boolean);
        const cooldowns = DOMElements.cooldownInput.value.split('\n').filter(Boolean);
        workoutRoutines.push({ id: Date.now(), name, warmups, exercises, cooldowns });
        saveRoutines();
        DOMElements.routineName.value = '';
        DOMElements.warmupInput.value = '';
        DOMElements.cooldownInput.value = '';
        DOMElements.exerciseRowsContainer.innerHTML = '';
        addExerciseRow();
        renderRoutines();
        populateRoutineDropdown();
        showToast("Routine saved!", "success");
    }
    
    function deleteRoutine(id) {
        if (!confirm("Delete this routine?")) return;
        workoutRoutines = workoutRoutines.filter(r => r.id !== id);
        saveRoutines();
        const deleteBtn = DOMElements.routineList.querySelector(`button[data-id="${id}"]`);
        if (deleteBtn) deleteBtn.closest('.bg-zinc-800').remove();
        if (workoutRoutines.length === 0) {
            DOMElements.routineList.innerHTML = '<p class="text-zinc-500 text-sm">No saved routines.</p>';
        }
        populateRoutineDropdown();
    }
    
    function renderRoutines() {
        const list = DOMElements.routineList;
        list.innerHTML = '';
        if (workoutRoutines.length === 0) {
            list.innerHTML = '<p class="text-zinc-500 text-sm">No saved routines.</p>';
            return;
        }
        workoutRoutines.forEach(routine => {
            const item = document.createElement('div');
            item.className = "bg-zinc-800 p-3 rounded-lg border border-zinc-700";
            item.innerHTML = `<div class="flex justify-between items-start"><div class="font-bold text-yellow-500">${routine.name}</div><button data-action="delete-routine" data-id="${routine.id}" class="text-red-400 hover:text-red-500 font-bold px-2 text-sm transition">✕</button></div><div class="mt-1">${routine.exercises.map(ex => `<span class="inline-block bg-zinc-700 text-gray-300 text-xs px-2 py-1 rounded mt-2 mr-1 border border-zinc-600">${ex.name} (${ex.type})</span>`).join('')}</div>`;
            list.appendChild(item);
        });
    }

    function populateExerciseDropdown() {
        const select = DOMElements.exerciseSelect;
        const currentSelection = select.value;
        const uniqueExercises = [...new Set(workoutLogs.map(log => log.exercise.toLowerCase().trim()))].sort();
        select.innerHTML = '<option value="">Select Exercise...</option>';
        uniqueExercises.forEach(ex => {
            const opt = document.createElement('option');
            opt.value = ex;
            opt.textContent = ex.charAt(0).toUpperCase() + ex.slice(1);
            select.appendChild(opt);
        });
        if (uniqueExercises.includes(currentSelection)) select.value = currentSelection;
    }
    
    function updateChart() {
        if (progressChart) progressChart.destroy();
        const selectedExercise = DOMElements.exerciseSelect.value;
        
        if (!selectedExercise) return;
        const filteredLogs = workoutLogs.filter(log => log.exercise.toLowerCase().trim() === selectedExercise);
        const maxWeightPerDate = {}, max1RmPerDate = {};
        filteredLogs.forEach(log => {
            const weight = parseFloat(log.weight);
            const reps = parseInt(log.reps);
            if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return;
            const estimated1RM = Math.round(weight * (1 + (reps / 30)));
            if (!maxWeightPerDate[log.date] || weight > maxWeightPerDate[log.date]) maxWeightPerDate[log.date] = weight;
            if (!max1RmPerDate[log.date] || estimated1RM > max1RmPerDate[log.date]) max1RmPerDate[log.date] = estimated1RM;
        });
        const sortedDates = Object.keys(maxWeightPerDate).sort((a, b) => new Date(a) - new Date(b));
        const weightData = sortedDates.map(date => maxWeightPerDate[date]);
        const oneRmData = sortedDates.map(date => max1RmPerDate[date]);
        Chart.defaults.color = '#9ca3af';
        progressChart = new Chart(DOMElements.progressChartCtx, {
            type: 'line',
            data: { labels: sortedDates, datasets: [{ label: 'Max Weight (lbs)', data: weightData, borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.15)', borderWidth: 3, pointBackgroundColor: '#eab308', pointBorderColor: '#000', fill: true, tension: 0.3 }, { label: 'Estimated 1RM (lbs)', data: oneRmData, borderColor: '#e5e7eb', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#e5e7eb', pointBorderColor: '#000', fill: false, tension: 0.3 }] },
            options: { responsive: true, scales: { y: { beginAtZero: false, grid: { color: 'rgba(63, 63, 70, 0.5)' } }, x: { grid: { display: false } } }, plugins: { legend: { display: true, labels: { color: '#d1d5db', usePointStyle: true } } } }
        });
    }
    
    function completeStep(index, exerciseName) {
        const weight = document.getElementById(`wt-${index}`).value.trim();
        const reps = document.getElementById(`rp-${index}`).value.trim();
        if (!weight || !reps) {
            return showToast('Please input actual weight and reps.', 'error');
        }
        addLog({ id: Date.now(), date: getISODate(), exercise: exerciseName, weight, reps });
        if (DOMElements.autoTimerCheck.checked) { resetTimer(); startTimer(); }
        const stepDiv = document.getElementById(`step-${index}`);
        const btn = document.getElementById(`btn-complete-${index}`);
        stepDiv.classList.add('opacity-30', 'pointer-events-none');
        btn.classList.replace('text-transparent', 'text-black');
        btn.classList.replace('border-zinc-600', 'border-yellow-500');
        btn.classList.replace('bg-zinc-950', 'bg-yellow-500');
    }
    
    function skipStep(index) { document.getElementById(`step-${index}`).classList.add('opacity-20', 'pointer-events-none', 'grayscale'); }
    function fullRender() { const activeView = document.querySelector('.nav-tab.text-yellow-500').dataset.view || 'track'; populateRoutineDropdown(); renderRoutines(); renderTodaysLogs(); switchView(activeView); }
    
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
        DOMElements.modalCloseBtn.addEventListener('click', closeExerciseModal);
        DOMElements.modalOverlay.addEventListener('click', closeExerciseModal);
        
        document.body.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const { action, id, index, exerciseName } = button.dataset;
            if (action === 'delete-log') deleteLog(parseInt(id, 10));
            if (action === 'delete-routine') deleteRoutine(parseInt(id, 10));
            if (action === 'show-info') openExerciseModal(exerciseName);
            if (action === 'complete') completeStep(index, exerciseName);
            if (action === 'skip') skipStep(index);
        });

        DOMElements.exerciseRowsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-row-btn')) {
                e.target.closest('.flex.items-start').remove();
            }
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                releaseWakeLock();
            }
        });
    }

    
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
        } catch (error) {
            console.error('Initialization failed:', error);
            showToast('There was a problem loading the database. Please try refreshing.', 'error');
        }
    }

    init();

})();
