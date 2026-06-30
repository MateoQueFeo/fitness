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
            request.onerror = (event) => reject(event.target.errorCode);
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve();
            };
        });
    }

    // --- SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
              .then(reg => console.log('Service Worker registered.'))
              .catch(err => console.warn('Service Worker registration failed:', err));
        });
    }

    // STATE MANAGEMENT & DATA
    let workoutLogs = [];
    let workoutRoutines = [];
    let timerInstance = null;
    let defaultSeconds = 60;
    let currentSecondsRemaining = defaultSeconds;
    let metronomeInterval = null;
    let metronomeAudioCtx = null;
    let progressChart = null;
    let wakeLock = null;

    // -- NEW: Data source for exercise information --
    const exerciseInfo = {
        'Side Lunge': {
            title: 'Side Lunge (Lateral Lunge)',
            body: `
                <p>The side lunge is a unilateral exercise that targets the inner and outer thighs, glutes, and quads.</p>
                <strong>Key Points:</strong>
                <ul>
                    <li>Keep your chest up and your back straight.</li>
                    <li>Step out to one side, keeping the trailing leg straight.</li>
                    <li>Lower your hips down and back, as if sitting in a chair.</li>
                    <li>Push off the bent leg to return to the starting position.</li>
                </ul>
            `
        },
        '30-degree Incline Press': {
            title: '30-Degree Incline Press',
            body: `
                <p>This press variation places more emphasis on the upper (clavicular) head of the pectoralis major.</p>
                <strong>Key Points:</strong>
                <ul>
                    <li>Set the bench to a low incline (around 30 degrees).</li>
                    <li>Keep your shoulder blades retracted and pinned to the bench.</li>
                    <li>Lower the weight to your upper chest, then press back up explosively.</li>
                    <li>Avoid excessive arching of the lower back.</li>
                </ul>
            `
        },
        'Bent-Over Row': {
            title: 'Bent-Over Row',
            body: `
                <p>A fundamental compound exercise for building a strong and thick back, targeting the lats, rhomboids, and rear delts.</p>
                <strong>Key Points:</strong>
                <ul>
                    <li>Hinge at your hips, keeping your back straight and nearly parallel to the floor.</li>
                    <li>Pull the weight towards your lower chest/upper abdomen.</li>
                    <li>Squeeze your shoulder blades together at the top of the movement.</li>
                    <li>Lower the weight under control, maintaining the back position.</li>
                </ul>
            `
        }
    };
    
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
        // -- NEW: Modal elements --
        exerciseModal: document.getElementById('exerciseModal'),
        modalOverlay: document.getElementById('modalOverlay'),
        modalContent: document.getElementById('modalContent'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
    };
    
    // -- NEW: Modal Control Functions --
    function openExerciseModal(exerciseName) {
        const info = exerciseInfo[exerciseName];
        
        DOMElements.modalTitle.textContent = info ? info.title : exerciseName;
        DOMElements.modalBody.innerHTML = info ? info.body : '<p>No information is available for this exercise yet.</p>';

        DOMElements.exerciseModal.classList.remove('hidden');
        // Trigger transitions after the element is displayed
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
        // Hide the modal after the transition finishes
        setTimeout(() => {
            DOMElements.exerciseModal.classList.add('hidden');
        }, 200); // Must match CSS transition duration
    }

    // --- RENDER ROUTINE CHECKLIST (MODIFIED) ---
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
                let targetDisplay = `${ex.pct}%`;
                let defaultWeight = "", defaultReps = ex.reps.toLowerCase() === 'amrap' ? '' : ex.reps;
                if (estimated1RM) {
                    const computedWeight = Math.round((estimated1RM * (ex.pct / 100)) / 5) * 5;
                    targetDisplay = `${computedWeight} lbs`;
                    defaultWeight = computedWeight;
                }
                setsHtml += `
                <div id="step-${index}" class="flex items-center gap-3 py-3 border-b border-zinc-700/50 last:border-0 check-anim transition-all">
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">${ex.type}</span>
                            <span class="text-[11px] font-bold text-yellow-500/90">Target: ${targetDisplay} × ${ex.reps}</span>
                        </div>
                        <div class="flex gap-2 items-center">
                            <input type="number" id="wt-${index}" value="${defaultWeight}" placeholder="lbs" class="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-sm text-center focus:outline-none focus:border-yellow-500 transition">
                            <span class="text-zinc-600 text-sm font-bold">×</span>
                            <input type="number" id="rp-${index}" value="${defaultReps}" placeholder="reps" class="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-sm text-center focus:outline-none focus:border-yellow-500 transition">
                        </div>
                    </div>
                    <div class="flex gap-1.5 items-stretch h-10 flex-shrink-0 self-end">
                        <button data-action="skip" data-index="${index}" class="w-10 text-zinc-500 hover:text-red-400 bg-zinc-950 rounded border border-zinc-800 transition flex items-center justify-center" title="Skip Set" aria-label="Skip set">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                        </button>
                        <button id="btn-complete-${index}" data-action="complete" data-index="${index}" data-exercise-name="${ex.name.replace(/"/g, '&quot;')}" class="w-12 bg-zinc-950 border border-zinc-600 rounded flex items-center justify-center text-transparent hover:border-yellow-500 hover:text-yellow-500/30 transition check-anim" title="Complete Set" aria-label="Complete set">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                    </div>
                </div>`;
            });
            // -- MODIFIED: The exercise name is now a clickable button --
            container.insertAdjacentHTML('beforeend', `
            <div class="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden shadow-sm">
                <div class="bg-zinc-700/30 px-4 py-2 border-b border-zinc-700">
                    <button class="font-bold text-gray-200 exercise-info-btn" data-action="show-info" data-exercise-name="${group.name.replace(/"/g, '&quot;')}">${group.name}</button>
                </div>
                <div class="px-3">${setsHtml}</div>
            </div>`);
        });
        if (routine.cooldowns && routine.cooldowns.length > 0) {
            const content = routine.cooldowns.map(item => `<div class="p-2 border-b border-zinc-700/50 last:border-0 text-gray-300 text-sm">${item}</div>`).join('');
            container.insertAdjacentHTML('beforeend', createCollapsibleWidget('❄️ Cool-Down Guidelines', content));
        }
    }

    // --- EVENT LISTENERS & SETUP (MODIFIED) ---
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

        // -- NEW: Event listeners for the modal --
        DOMElements.modalCloseBtn.addEventListener('click', closeExerciseModal);
        DOMElements.modalOverlay.addEventListener('click', closeExerciseModal);

        // Delegated events
        DOMElements.routineChecklist.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const { action, index, exerciseName } = button.dataset;

            // -- NEW: Handle click on exercise info button --
            if (action === 'show-info') openExerciseModal(exerciseName);

            if (action === 'complete') completeStep(index, exerciseName);
            if (action === 'skip') skipStep(index);
        });

        DOMElements.exerciseRowsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.remove-row-btn');
            if (button) button.parentElement.remove();
        });

        DOMElements.routineList.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="delete-routine"]');
            if (button) deleteRoutine(parseInt(button.dataset.id, 10));
        });

        DOMElements.historyList.addEventListener('click', e => {
            const button = e.target.closest('button[data-action="delete-log"]');
            if (button) deleteLog(parseInt(button.dataset.id, 10));
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
    
    // --- All other functions are unchanged and included for completeness ---
    function getISODate(){return new Date().toISOString().slice(0,10)}async function loadData(){const e=db.transaction(LOG_STORE_NAME,"readonly").objectStore(LOG_STORE_NAME);workoutLogs=(await new Promise((t,n)=>{const o=e.getAll();o.onsuccess=()=>t(o.result),o.onerror=()=>n(o.error)})).sort((e,t)=>t.id-e.id),loadRoutines()}function loadRoutines(){const e=[{id:1,name:"1. Side Lunge & Adduction",warmups:["Hip Circles (10 each way)","Leg Swings (10 each leg)"],exercises:[{name:"Side Lunge",type:"warm-up",pct:33,reps:"6"},{name:"Side Lunge",type:"ramp",pct:66,reps:"6"},{name:"Side Lunge",type:"working",pct:80,reps:"amrap"},{name:"Hip Adduction",type:"isolation",pct:75,reps:"amrap"},{name:"Calf Raise",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Butterfly Stretch (30s)","Standing Calf Stretch (30s per side)"]},{id:2,name:"2. 30-deg Incline Press",warmups:["Arm Circles (12 each way)","Band Pull-Aparts (15 reps)"],exercises:[{name:"30-degree Incline Press",type:"warm-up",pct:33,reps:"6"},{name:"30-degree Incline Press",type:"ramp",pct:66,reps:"6"},{name:"30-degree Incline Press",type:"working",pct:80,reps:"amrap"},{name:"Incline Fly",type:"isolation",pct:75,reps:"amrap"},{name:"Front Raise",type:"isolation",pct:75,reps:"amrap"},{name:"Tricep Extension",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Doorway Chest Stretch (30s)","Overhead Tricep Stretch (30s per side)"]},{id:3,name:"3. Walking Lunge & Back Ext",warmups:["Cat-Cow (10 cycles)","Glute Bridges (15 reps)"],exercises:[{name:"Walking Lunge",type:"warm-up",pct:33,reps:"6"},{name:"Walking Lunge",type:"ramp",pct:66,reps:"6"},{name:"Walking Lunge",type:"working",pct:80,reps:"amrap"},{name:"Back Extension",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Kneeling Hip Flexor Stretch (30s per side)","Child's Pose (60s)"]},{id:4,name:"4. Bent-Over Row",warmups:["T-Spine Rotations (8 each side)","Scapular Retractions (15 reps)"],exercises:[{name:"Bent-Over Row",type:"warm-up",pct:33,reps:"6"},{name:"Bent-Over Row",type:"ramp",pct:66,reps:"6"},{name:"Bent-Over Row",type:"working",pct:80,reps:"amrap"},{name:"Straight-Arm Pulldown",type:"isolation",pct:75,reps:"amrap"},{name:"Incline Curl",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Dead Hang (30s)","Bicep Wall Stretch (30s per side)"]},{id:5,name:"5. Curtsy Lunge & Abduction",warmups:["Fire Hydrants (15 each side)","Lateral Band Walks (10 each side)"],exercises:[{name:"Curtsy Lunge",type:"warm-up",pct:33,reps:"6"},{name:"Curtsy Lunge",type:"ramp",pct:66,reps:"6"},{name:"Curtsy Lunge",type:"working",pct:80,reps:"amrap"},{name:"Hip Abduction",type:"isolation",pct:75,reps:"amrap"},{name:"Calf Raise",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Pigeon Pose (30s per side)","Figure-Four Stretch (30s per side)"]},{id:6,name:"6. Arnold Press",warmups:["Shoulder Halos (8 each way)","Face Pulls (20 reps)"],exercises:[{name:"Arnold Press",type:"warm-up",pct:33,reps:"6"},{name:"Arnold Press",type:"ramp",pct:66,reps:"6"},{name:"Arnold Press",type:"working",pct:80,reps:"amrap"},{name:"Lateral Raise",type:"isolation",pct:75,reps:"amrap"},{name:"Reverse Fly",type:"isolation",pct:75,reps:"amrap"},{name:"Tricep Extension",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Cross-Body Shoulder Stretch (30s per side)","Overhead Tricep Stretch (30s per side)"]},{id:7,name:"7. Romanian Deadlift",warmups:["Cat-Cow (10 cycles)","Good Mornings (Bodyweight, 12 reps)"],exercises:[{name:"Romanian Deadlift",type:"warm-up",pct:33,reps:"6"},{name:"Romanian Deadlift",type:"ramp",pct:66,reps:"6"},{name:"Romanian Deadlift",type:"working",pct:80,reps:"amrap"},{name:"Back Extension",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Lying Hamstring Stretch (30s per side)","Child's Pose (60s)"]},{id:8,name:"8. Pull-Up",warmups:["Scapular Pull-ups (10 reps)","Dead Hang (20s)"],exercises:[{name:"Pull-Up",type:"warm-up",pct:33,reps:"6"},{name:"Pull-Up",type:"ramp",pct:66,reps:"6"},{name:"Pull-Up",type:"working",pct:80,reps:"amrap"},{name:"Straight-Arm Pulldown",type:"isolation",pct:75,reps:"amrap"},{name:"Incline Curl",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Doorway Lat Stretch (30s per side)","Bicep Wall Stretch (30s per side)"]},{id:9,name:"9. Lat Pulldown",warmups:["Scapular Retractions (15 reps)","Light Band Pulldowns (15 reps)"],exercises:[{name:"Lat Pulldown",type:"warm-up",pct:33,reps:"6"},{name:"Lat Pulldown",type:"ramp",pct:66,reps:"6"},{name:"Lat Pulldown",type:"working",pct:80,reps:"amrap"},{name:"Straight-Arm Pulldown",type:"isolation",pct:75,reps:"amrap"},{name:"Incline Curl",type:"isolation",pct:75,reps:"amrap"}],cooldowns:["Doorway Lat Stretch (30s per side)","Bicep Wall Stretch (30s per side)"]}];workoutRoutines=JSON.parse(localStorage.getItem("workoutRoutines"))||e}function saveRoutines(){localStorage.setItem("workoutRoutines",JSON.stringify(workoutRoutines))}async function addLog(e){workoutLogs.unshift(e);const t=db.transaction(LOG_STORE_NAME,"readwrite").objectStore(LOG_STORE_NAME);await new Promise((e,n)=>{const o=t.add(log);o.onsuccess=e,o.onerror=n}),addLogToView(e),populateExerciseDropdown(),updateChart()}async function deleteLog(e){if(!confirm("Delete this logged set?"))return;const t=db.transaction(LOG_STORE_NAME,"readwrite").objectStore(LOG_STORE_NAME);await new Promise((e,n)=>{const o=t.delete(id);o.onsuccess=e,o.onerror=n});const n=workoutLogs.findIndex(t=>t.id===e);n>-1&&workoutLogs.splice(n,1);const o=DOMElements.logList.querySelector(`[data-log-id="${e}"]`);o&&o.remove();const a=DOMElements.historyList.querySelector(`[data-log-id="${e}"]`);if(a){const e=a.parentElement;a.remove(),e&&0===e.children.length&&e.parentElement.remove()}0===DOMElements.logList.children.length&&renderTodaysLogs(),0===DOMElements.historyList.children.length&&renderHistory(),populateExerciseDropdown(),updateChart()}function createLogItemDOM(e){const t=document.createElement("div");t.className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700/60",t.setAttribute("data-log-id",e.id);const n=document.createElement("div");n.className="font-semibold text-white",n.textContent=e.exercise;const o=document.createElement("div");o.className="flex items-center gap-4";const a=document.createElement("span");a.className="text-yellow-500 font-bold",a.textContent=`${e.weight} lbs × ${e.reps}`;const d=document.createElement("button");return d.className="text-red-400 hover:text-red-500 font-bold px-2 py-1 text-sm transition",d.title="Delete set",d.innerHTML="✕",d.onclick=()=>deleteLog(e.id),o.append(a,d),t.append(n,o),t}function addLogToView(e){const t=DOMElements.logList.querySelector("p");t&&t.remove();const n=createLogItemDOM(e);DOMElements.logList.prepend(n)}function renderTodaysLogs(){const e=DOMElements.logList;e.innerHTML="";const t=getISODate(),n=workoutLogs.filter(e=>e.date===t);0===n.length?e.innerHTML='<p class="text-zinc-500 text-sm text-center py-2">No sets logged yet today.</p>':n.forEach(t=>e.appendChild(createLogItemDOM(t)))}function renderHistory(){const e=DOMElements.historyList;e.innerHTML="";const t=getISODate(),n=workoutLogs.filter(e=>e.date!==t);if(0===n.length)return void(e.innerHTML='<p class="text-zinc-500 text-sm text-center py-4">No past history found.</p>');const o=n.reduce((e,t)=>(e[t.date]||(e[t.date]=[]),e[t.date].push(t),e),{}),a=Object.keys(o).sort((e,t)=>new Date(t)-new Date(e));for(const t of a){const n=o[t],a=document.createElement("div");a.className="mb-4 border-l-2 border-yellow-500 pl-3";const d=document.createElement("h3");d.className="text-gray-400 font-bold text-sm mb-2",d.textContent=new Date(t+"T00:00:00").toLocaleDateString(void 0,{weekday:"short",year:"numeric",month:"short",day:"numeric"});const i=document.createElement("div");i.className="space-y-1",n.forEach(e=>{const t=document.createElement("div");t.className="flex justify-between items-center bg-zinc-800 p-2.5 rounded-lg border border-zinc-700/50 text-sm mt-1.5",t.setAttribute("data-log-id",e.id),t.innerHTML=`\n                    <span class="text-gray-300 font-medium">${e.exercise}</span>\n                    <div class="flex items-center gap-3">\n                        <span class="text-yellow-500 font-semibold">${e.weight} lbs × ${e.reps}</span>\n                        <button data-action="delete-log" data-id="${e.id}" class="text-red-400 hover:text-red-500 font-bold px-1.5 text-xs transition">✕</button>\n                    </div>`,i.appendChild(t)}),a.append(d,i),e.appendChild(a)}}function populateRoutineDropdown(){const e=DOMElements.activeRoutineSelect;e.innerHTML='<option value="">-- Custom Workout --</option>',workoutRoutines.forEach(t=>{const n=document.createElement("option");n.value=t.id,n.textContent=t.name,e.appendChild(n)})}function createCollapsibleWidget(e,t){return`\n        <div class="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden shadow-sm">\n            <details open>\n                <summary class="bg-zinc-700/30 px-4 py-2 cursor-pointer list-none flex justify-between items-center">\n                    <h3 class="font-bold text-gray-200 inline">${e}</h3>\n                    <span class="text-xs text-zinc-400">Tap to toggle</span>\n                </summary>\n                <div class="p-3">${t}</div>\n            </details>\n        </div>`}function addExerciseRow(){const e=document.getElementById("exerciseRowTemplate").content.cloneNode(!0);DOMElements.exerciseRowsContainer.appendChild(e)}function saveRoutine(){const e=DOMElements.routineName.value.trim();if(!e)return alert("Please provide a template name.");const t=DOMElements.exerciseRowsContainer.children;if(0===t.length)return alert("Please add at least one exercise step.");const n=[];for(const e of t){const t=e.querySelector(".ex-name").value.trim(),o=e.querySelector(".ex-type").value,a=e.querySelector(".ex-pct").value.trim(),d=e.querySelector(".ex-reps").value.trim();if(!t||!a||!d)return alert("Please fill out Name, %1RM, and Reps for all exercises.");n.push({name:t,type:o,pct:parseInt(a),reps:d})}const o=DOMElements.warmupInput.value.split("\n").filter(Boolean),a=DOMElements.cooldownInput.value.split("\n").filter(Boolean),d={id:Date.now(),name:e,warmups:o,exercises:n,cooldowns:a};workoutRoutines.push(d),saveRoutines(),DOMElements.routineName.value="",DOMElements.warmupInput.value="",DOMElements.cooldownInput.value="",DOMElements.exerciseRowsContainer.innerHTML="",addExerciseRow(),renderRoutines(),populateRoutineDropdown(),alert("Routine saved!")}function deleteRoutine(e){confirm("Delete this routine?")&&(workoutRoutines=workoutRoutines.filter(t=>t.id!==e),saveRoutines(),renderRoutines(),populateRoutineDropdown())}function renderRoutines(){const e=DOMElements.routineList;if(e.innerHTML="",0===workoutRoutines.length)return void(e.innerHTML='<p class="text-zinc-500 text-sm">No saved routines.</p>');workoutRoutines.forEach(t=>{const n=document.createElement("div");n.className="bg-zinc-800 p-3 rounded-lg border border-zinc-700";const o=t.exercises.map(e=>`<span class="inline-block bg-zinc-700 text-gray-300 text-xs px-2 py-1 rounded mt-2 mr-1 border border-zinc-600">${e.name} (${e.type})</span>`).join("");n.innerHTML=`\n            <div class="flex justify-between items-start">\n                <div class="font-bold text-yellow-500">${t.name}</div>\n                <button data-action="delete-routine" data-id="${t.id}" class="text-red-400 hover:text-red-500 font-bold px-2 text-sm transition">✕</button>\n            </div>\n            <div class="mt-1">${o}</div>`,e.appendChild(n)})}function populateExerciseDropdown(){const e=DOMElements.exerciseSelect,t=e.value,n=[...new Set(workoutLogs.map(e=>e.exercise.toLowerCase().trim()))].sort();e.innerHTML='<option value="">Select Exercise...</option>',n.forEach(t=>{const n=document.createElement("option");n.value=t,n.textContent=t.charAt(0).toUpperCase()+t.slice(1),e.appendChild(n)}),n.includes(t)&&(e.value=t)}function updateChart(){const e=DOMElements.exerciseSelect.value;if(progressChart&&progressChart.destroy(),!e)return;const t=workoutLogs.filter(t=>t.exercise.toLowerCase().trim()===e),n={},o={};t.forEach(e=>{const t=parseFloat(e.weight),a=parseInt(e.reps);if(!isNaN(t)&&!isNaN(a)&&t>0&&a>0){const d=Math.round(t*(1+a/30));(!n[e.date]||t>n[e.date])&&(n[e.date]=t),(!o[e.date]||d>o[e.date])&&(o[e.date]=d)}});const a=Object.keys(n).sort((e,t)=>new Date(e)-new Date(t)),d=a.map(e=>n[e]),i=a.map(e=>o[e]);Chart.defaults.color="#9ca3af",progressChart=new Chart(DOMElements.progressChartCtx,{type:"line",data:{labels:a,datasets:[{label:"Max Weight (lbs)",data:d,borderColor:"#eab308",backgroundColor:"rgba(234, 179, 8, 0.15)",borderWidth:3,pointBackgroundColor:"#eab308",pointBorderColor:"#000",fill:!0,tension:.3},{label:"Estimated 1RM (lbs)",data:i,borderColor:"#e5e7eb",backgroundColor:"transparent",borderWidth:2,borderDash:[5,5],pointBackgroundColor:"#e5e7eb",pointBorderColor:"#000",fill:!1,tension:.3}]},options:{responsive:!0,scales:{y:{beginAtZero:!1,grid:{color:"rgba(63, 63, 70, 0.5)"}},x:{grid:{display:!1}}},plugins:{legend:{display:!0,labels:{color:"#d1d5db",usePointStyle:!0}}}})}function completeStep(e,t){const n=document.getElementById(`wt-${e}`),o=document.getElementById(`rp-${e}`),a=n.value.trim(),d=o.value.trim();if(!a||!d)return alert("Please input actual weight and reps.");const i={id:Date.now(),date:getISODate(),exercise:t,weight:a,reps:d};addLog(i),DOMElements.autoTimerCheck.checked&&(resetTimer(),startTimer(),metronomeInterval&&toggleMetronome());const l=document.getElementById(`step-${e}`),r=document.getElementById(`btn-complete-${e}`);l.classList.add("opacity-30","pointer-events-none"),r.classList.replace("text-transparent","text-black"),r.classList.replace("border-zinc-600","border-yellow-500"),r.classList.replace("bg-zinc-950","bg-yellow-500")}function skipStep(e){document.getElementById(`step-${e}`).classList.add("opacity-20","pointer-events-none","grayscale")}function fullRender(){const e=document.querySelector(".nav-tab.text-yellow-500").dataset.view||"track";populateRoutineDropdown(),renderRoutines(),renderTodaysLogs(),switchView(e)}

})();
