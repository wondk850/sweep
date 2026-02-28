/* ========================================
   Sweep v2 - 영어 순서배열 앱
   Created by Wonsummer Studio
   Features: Stage Selection, Timer, Detailed Feedback
   ======================================== */

// ==========================================
// State Management
// ==========================================
const state = {
    sentences: [],
    currentSentenceIndex: 0,
    currentStage: 1,
    selectedStages: [1, 2, 3],  // Which stages to use
    hintsUsed: 0,
    correctCount: 0,
    totalAttempts: 0,
    wrongAttempts: 0,
    isSessionActive: false,
    // Timer state
    timerEnabled: false,
    timerSeconds: 60,
    timerRemaining: 0,
    timerInterval: null,
    // Attempt limit state
    attemptLimit: 0,  // 0 = unlimited, 3 = 3 attempts
    currentStageAttempts: 0,  // Track attempts for current stage
    // Progression mode
    progressMode: 'focus',  // 'focus' = per-sentence, 'cycle' = per-stage
    currentStageRoundIndex: 0,  // For cycle mode: which stage round we're on
    // Detailed tracking for feedback
    results: [],  // {sentence, stage, correct, attempts, hintsUsed, time, errors}
    stageStartTime: null
};

// Demo sentences
const demoSentences = [
    {
        english: "The quick brown fox jumps over the lazy dog.",
        chunks: ["The quick brown fox", "jumps", "over the lazy dog"]
    },
    {
        english: "She has been studying English for three years.",
        chunks: ["She", "has been studying", "English", "for three years"]
    },
    {
        english: "I want to become a doctor in the future.",
        chunks: ["I", "want to become", "a doctor", "in the future"]
    },
    {
        english: "The book that I bought yesterday is very interesting.",
        chunks: ["The book", "that I bought yesterday", "is", "very interesting"]
    },
    {
        english: "Learning a new language requires patience and practice.",
        chunks: ["Learning a new language", "requires", "patience and practice"]
    }
];

// ==========================================
// Screen Navigation
// ==========================================
function showModeSelect() {
    hideAllScreens();
    document.getElementById('mode-select').classList.add('active');
    resetState();
    stopTimer();
}

function showTeacherMode() {
    hideAllScreens();
    document.getElementById('teacher-mode').classList.add('active');
}

function showStudentMode() {
    hideAllScreens();
    document.getElementById('student-waiting').classList.add('active');
}

function showLearning() {
    hideAllScreens();
    document.getElementById('student-learning').classList.add('active');
}

function showResult() {
    hideAllScreens();
    stopTimer();
    document.getElementById('result-screen').classList.add('active');
    displayResults();
}

function showPairingGuide() {
    hideAllScreens();
    document.getElementById('pairing-guide').classList.add('active');
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

function exitLearning() {
    if (confirm('학습을 종료하시겠습니까?')) {
        stopTimer();
        showModeSelect();
    }
}

// ==========================================
// Teacher Mode Functions
// ==========================================
function addSentences() {
    const input = document.getElementById('sentence-input');
    const koreanInput = document.getElementById('korean-input');
    const text = input.value.trim();

    if (!text) {
        alert('문장을 입력해주세요!');
        return;
    }

    // Parse English sentences by newline
    const englishLines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Parse Korean lines (optional) - match by line index
    const koreanLines = koreanInput?.value
        ? koreanInput.value.split('\n').map(l => l.trim()).filter(l => l)
        : [];

    let addedCount = 0;
    englishLines.forEach((line, idx) => {
        // Further split by sentence-ending if multiple sentences per line
        const parts = line.match(/[^.!?]*[.!?]+/g);
        const sentences = parts ? parts.map(p => p.trim()).filter(p => p) : [line];

        sentences.forEach((sentence, partIdx) => {
            if (sentence && !state.sentences.find(s => s.english === sentence)) {
                // Korean: use corresponding line if only 1 part per line, else match index
                const korean = (sentences.length === 1 && koreanLines[idx])
                    ? koreanLines[idx]
                    : '';
                state.sentences.push({
                    english: sentence,
                    korean: korean,
                    chunks: autoChunk(sentence)
                });
                addedCount++;
            }
        });
    });

    input.value = '';
    if (koreanInput) koreanInput.value = '';
    updateSentenceList();
}

function autoChunk(sentence) {
    const chunks = [];
    sentence = sentence.replace(/\s+/g, ' ').trim();
    const words = sentence.split(' ');

    if (words.length <= 4) {
        chunks.push(sentence);
    } else if (words.length <= 8) {
        const mid = Math.ceil(words.length / 2);
        chunks.push(words.slice(0, mid).join(' '));
        chunks.push(words.slice(mid).join(' '));
    } else {
        const third = Math.ceil(words.length / 3);
        chunks.push(words.slice(0, third).join(' '));
        chunks.push(words.slice(third, third * 2).join(' '));
        chunks.push(words.slice(third * 2).join(' '));
    }

    return chunks;
}

function updateSentenceList() {
    const list = document.getElementById('sentence-list');
    const count = document.getElementById('sentence-count');

    count.textContent = `${state.sentences.length}개`;

    if (state.sentences.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>아직 추가된 문장이 없습니다</p>
            </div>
        `;
        return;
    }

    list.innerHTML = state.sentences.map((sentence, index) => `
        <div class="sentence-item" data-index="${index}">
            <span class="sentence-num">${index + 1}</span>
            <div class="sentence-texts">
                <span class="sentence-text">${sentence.english}</span>
                ${sentence.korean ? `<span class="sentence-korean">${sentence.korean}</span>` : ''}
            </div>
            <button class="sentence-delete" onclick="deleteSentence(${index})">✕</button>
        </div>
    `).join('');
}

function deleteSentence(index) {
    state.sentences.splice(index, 1);
    updateSentenceList();
}

function clearAllSentences() {
    if (state.sentences.length === 0) return;
    if (confirm('모든 문장을 삭제하시겠습니까?')) {
        state.sentences = [];
        updateSentenceList();
    }
}

// ==========================================
// Stage Selection
// ==========================================
function getSelectedStages() {
    const stages = [];
    if (document.getElementById('stage1-check')?.checked) stages.push(1);
    if (document.getElementById('stage2-check')?.checked) stages.push(2);
    if (document.getElementById('stage3-check')?.checked) stages.push(3);
    return stages.length > 0 ? stages : [1, 2, 3];
}

function getTimerSettings() {
    const timerCheck = document.getElementById('timer-check');
    const timerInput = document.getElementById('timer-seconds');
    return {
        enabled: timerCheck?.checked || false,
        seconds: parseInt(timerInput?.value) || 60
    };
}

function getRandomSetting() {
    const randomCheck = document.getElementById('random-check');
    return randomCheck?.checked || false;
}

function getAttemptLimitSetting() {
    const limitedCheck = document.getElementById('attempt-limited');
    if (!limitedCheck?.checked) return 0;  // 0 = unlimited
    const countVal = parseInt(document.getElementById('attempt-count-value')?.value) || 3;
    return countVal;
}

function getTTSSetting() {
    if (document.getElementById('tts-none')?.checked) return 'none';
    if (document.getElementById('tts-free')?.checked) return 'free';
    return 'after-correct';  // default
}

function toggleAttemptCount() {
    const limited = document.getElementById('attempt-limited')?.checked;
    const group = document.getElementById('attempt-count-group');
    if (group) group.style.display = limited ? 'block' : 'none';
}

function changeAttemptCount(delta) {
    const input = document.getElementById('attempt-count-value');
    const display = document.getElementById('attempt-count-display');
    if (!input || !display) return;
    let val = parseInt(input.value) + delta;
    val = Math.max(2, Math.min(6, val));
    input.value = val;
    display.textContent = val + '회';
}

function getProgressModeSetting() {
    const cycleCheck = document.getElementById('progress-cycle');
    return cycleCheck?.checked ? 'cycle' : 'focus';
}

function startSession() {
    if (state.sentences.length === 0) {
        alert('최소 1개의 문장을 추가해주세요!');
        return;
    }

    // Check if user has seen the pairing intro popup
    const hasSeenIntro = localStorage.getItem('sweepPairingIntroSeen');
    if (!hasSeenIntro) {
        // Save session settings for later use
        state.pendingSessionSettings = {
            selectedStages: getSelectedStages(),
            timerSettings: getTimerSettings(),
            randomOrder: getRandomSetting()
        };
        showPairingIntroModal();
        return;
    }

    // Proceed with normal session start
    actuallyStartSession();
}

function actuallyStartSession() {
    state.selectedStages = state.pendingSessionSettings?.selectedStages || getSelectedStages();
    const timerSettings = state.pendingSessionSettings?.timerSettings || getTimerSettings();
    state.timerEnabled = timerSettings.enabled;
    state.timerSeconds = timerSettings.seconds;

    // Apply random order if selected
    const randomOrder = state.pendingSessionSettings?.randomOrder ?? getRandomSetting();
    if (randomOrder) {
        state.sentences = shuffleArray([...state.sentences]);
    }

    state.isSessionActive = true;
    state.currentSentenceIndex = 0;
    state.currentStage = state.selectedStages[0];
    state.correctCount = 0;
    state.totalAttempts = 0;
    state.wrongAttempts = 0;
    state.hintsUsed = 0;
    state.results = [];
    state.currentStageAttempts = 0;

    // Get attempt limit setting
    state.attemptLimit = state.pendingSessionSettings?.attemptLimit ?? getAttemptLimitSetting();

    // Get progression mode setting
    state.progressMode = state.pendingSessionSettings?.progressMode ?? getProgressModeSetting();

    // Get TTS mode setting
    state.ttsMode = state.pendingSessionSettings?.ttsMode ?? getTTSSetting();

    // Clear pending settings
    state.pendingSessionSettings = null;

    showLearning();
    loadCurrentSentence();

    if (state.timerEnabled) {
        startTimer();
    }
}

// ==========================================
// Pairing Intro Modal Functions
// ==========================================
function showPairingIntroModal() {
    const modal = document.getElementById('pairing-intro-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hidePairingIntroModal() {
    const modal = document.getElementById('pairing-intro-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Check if "don't show again" is checked
    const dontShowAgain = document.getElementById('dont-show-again');
    if (dontShowAgain?.checked) {
        localStorage.setItem('sweepPairingIntroSeen', 'true');
    }
}

function goToGuideFromModal() {
    hidePairingIntroModal();
    showPairingGuide();
}

function startWithoutPopup() {
    // Mark as seen even if checkbox is not checked (for this session)
    const dontShowAgain = document.getElementById('dont-show-again');
    if (dontShowAgain?.checked) {
        localStorage.setItem('sweepPairingIntroSeen', 'true');
    }

    hidePairingIntroModal();
    actuallyStartSession();
}

// ==========================================
// URL Sharing Feature
// ==========================================
function generateShareLink() {
    if (state.sentences.length === 0) {
        alert('공유할 문장을 먼저 추가해주세요!');
        return;
    }

    const selectedStages = getSelectedStages();
    const timerSettings = getTimerSettings();
    const randomOrder = getRandomSetting();
    const attemptLimit = getAttemptLimitSetting();
    const progressMode = getProgressModeSetting();
    const ttsMode = getTTSSetting();

    const shareData = {
        sentences: state.sentences.map(s => ({ e: s.english, k: s.korean || '' })),
        stages: selectedStages,
        timer: timerSettings.enabled ? timerSettings.seconds : 0,
        random: randomOrder,
        attemptLimit: attemptLimit,
        progressMode: progressMode,
        ttsMode: ttsMode
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?s=${encoded}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
        const stageText = selectedStages.join(', ') + '단계';
        const timerText = timerSettings.enabled ? `, ${timerSettings.seconds}초 타이머` : '';
        const randomText = randomOrder ? ', 랜덤 순서' : '';
        const limitText = attemptLimit > 0 ? `, ${attemptLimit}회 제한` : '';
        const modeText = progressMode === 'cycle' ? ', 순환모드' : '';
        const ttsText = ttsMode === 'none' ? ', 소리없음' : ttsMode === 'free' ? ', 자유청취' : ', 정답후재생';
        alert(`✅ 링크가 복사되었습니다!\n\n설정: ${stageText}${timerText}${randomText}${limitText}${modeText}${ttsText}\n문장: ${state.sentences.length}개`);
    }).catch(() => {
        prompt('아래 링크를 복사하세요:', shareUrl);
    });
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('s');

    if (encodedData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(atob(encodedData)));

            // Handle both old format (array) and new format (object)
            if (Array.isArray(decoded)) {
                // Old format - just sentences
                state.sentences = decoded.map(english => ({
                    english: english,
                    chunks: autoChunk(english)
                }));
                state.selectedStages = [1, 2, 3];
                state.timerEnabled = false;
            } else {
                // New format with stages, timer, random, attemptLimit, progressMode, ttsMode
                const rawSentences = decoded.sentences || [];
                state.sentences = rawSentences.map(item => {
                    // Support both old string format and new {e,k} object format
                    const english = typeof item === 'string' ? item : item.e;
                    const korean = typeof item === 'string' ? '' : (item.k || '');
                    return { english, korean, chunks: autoChunk(english) };
                });
                state.selectedStages = decoded.stages || [1, 2, 3];
                state.timerEnabled = decoded.timer > 0;
                state.timerSeconds = decoded.timer || 60;
                state.attemptLimit = decoded.attemptLimit || 0;
                state.progressMode = decoded.progressMode || 'focus';
                state.ttsMode = decoded.ttsMode || 'after-correct';
                if (decoded.random) {
                    state.sentences = shuffleArray([...state.sentences]);
                }
            }

            if (state.sentences.length > 0) {
                state.isSessionActive = true;
                state.currentSentenceIndex = 0;
                state.currentStage = state.selectedStages[0];
                state.correctCount = 0;
                state.totalAttempts = 0;
                state.wrongAttempts = 0;
                state.hintsUsed = 0;
                state.results = [];
                state.currentStageAttempts = 0;

                showLearning();
                loadCurrentSentence();

                if (state.timerEnabled) {
                    startTimer();
                }
                return true;
            }
        } catch (e) {
            console.error('Failed to parse shared data:', e);
        }
    }
    return false;
}

// ==========================================
// Timer Functions
// ==========================================
function startTimer() {
    state.timerRemaining = state.timerSeconds;
    updateTimerDisplay();
    showTimerUI();

    state.timerInterval = setInterval(() => {
        state.timerRemaining--;
        updateTimerDisplay();

        if (state.timerRemaining <= 0) {
            stopTimer();
            alert('⏰ 시간 초과! 결과를 확인하세요.');
            showResult();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
        const mins = Math.floor(state.timerRemaining / 60);
        const secs = state.timerRemaining % 60;
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Color warning
        if (state.timerRemaining <= 10) {
            timerEl.classList.add('timer-danger');
        } else if (state.timerRemaining <= 30) {
            timerEl.classList.add('timer-warning');
            timerEl.classList.remove('timer-danger');
        } else {
            timerEl.classList.remove('timer-warning', 'timer-danger');
        }
    }
}

function showTimerUI() {
    const timerContainer = document.getElementById('timer-container');
    if (timerContainer) {
        timerContainer.style.display = state.timerEnabled ? 'flex' : 'none';
    }
}

// ==========================================
// Demo Mode
// ==========================================
function startDemo() {
    state.sentences = [...demoSentences];
    state.selectedStages = [1, 2, 3];
    state.timerEnabled = false;
    state.isSessionActive = true;
    state.currentSentenceIndex = 0;
    state.currentStage = 1;
    state.correctCount = 0;
    state.totalAttempts = 0;
    state.wrongAttempts = 0;
    state.hintsUsed = 0;
    state.results = [];

    showLearning();
    loadCurrentSentence();
}

// ==========================================
// Learning Mode Functions
// ==========================================
function loadCurrentSentence() {
    const sentence = state.sentences[state.currentSentenceIndex];
    state.stageStartTime = Date.now();
    state.currentStageAttempts = 0;
    lastWrongSentence = '';

    document.getElementById('current-sentence-num').textContent = state.currentSentenceIndex + 1;
    document.getElementById('total-sentences').textContent = state.sentences.length;

    const totalStages = state.sentences.length * state.selectedStages.length;
    const completedStages = state.currentSentenceIndex * state.selectedStages.length +
        state.selectedStages.indexOf(state.currentStage);
    const progress = (completedStages / totalStages) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        const ttsMode = state.ttsMode || 'after-correct';
        voiceBtn.style.display = (ttsMode === 'none' || ttsMode === 'after-correct') ? 'none' : '';
    }

    updateStageInfo();

    const koreanEl = document.getElementById('korean-meaning');
    if (koreanEl) {
        koreanEl.textContent = sentence.korean ? sentence.korean : '\uc21c\uc11c\ub97c \ub9de\ucdb0\ubcf4\uc138\uc694!';
        koreanEl.classList.toggle('korean-hint', !!sentence.korean);
    }
    hideFeedback();
    generateLearningContent(sentence);
}


function updateStageInfo() {
    const stageBadge = document.getElementById('stage-badge');
    const stageInfo = document.getElementById('stage-info');

    const resetBtn = `<button class="reset-all-btn" onclick="resetAllBlocks()" title="Esc 키로도 초기화"><span>🔄</span> 초기화</button>`;

    stageBadge.className = 'stage-badge';

    switch (state.currentStage) {
        case 1:
            stageBadge.textContent = '1단계';
            stageBadge.classList.add('stage-1');
            stageInfo.innerHTML = `
                <span class="stage-icon">🧩</span>
                <span class="stage-text">청크 배열: 의미 단위(구/절)로 순서를 맞춰보세요</span>
                ${resetBtn}
            `;
            break;
        case 2:
            stageBadge.textContent = '2단계';
            stageBadge.classList.add('stage-2');
            stageInfo.innerHTML = `
                <span class="stage-icon">🔤</span>
                <span class="stage-text">핵심 배열: 주어, 동사, 목적어 등 핵심 요소를 배열하세요</span>
                ${resetBtn}
            `;
            break;
        case 3:
            stageBadge.textContent = '3단계';
            stageBadge.classList.add('stage-3');
            stageInfo.innerHTML = `
                <span class="stage-icon">⚡</span>
                <span class="stage-text">완전 배열: 모든 단어를 올바른 순서로 배열하세요</span>
                ${resetBtn}
            `;
            break;
    }
}

function generateLearningContent(sentence) {
    const wordBank = document.getElementById('word-bank');
    const answerZone = document.getElementById('answer-zone');

    let items = [];

    switch (state.currentStage) {
        case 1:
            items = sentence.chunks || autoChunk(sentence.english);
            break;
        case 2:
            items = extractKeyElements(sentence.english);
            break;
        case 3:
            items = sentence.english.replace(/[.,!?]/g, '').split(' ').filter(w => w);
            break;
    }

    const shuffled = shuffleArray([...items]);

    answerZone.innerHTML = items.map((_, index) => `
        <div class="drop-slot" data-index="${index}" 
             ondragover="handleDragOver(event)" 
             ondrop="handleDrop(event)"
             ondragleave="handleDragLeave(event)">
        </div>
    `).join('');

    wordBank.innerHTML = shuffled.map((item, index) => `
        <div class="word-chip" 
             data-word="${item}" 
             data-original-index="${items.indexOf(item)}"
             draggable="true"
             ondragstart="handleDragStart(event)"
             ondragend="handleDragEnd(event)"
             onclick="handleChipClick(event)">
            ${item}
        </div>
    `).join('');

    answerZone.dataset.correctOrder = JSON.stringify(items);
    setupTouchEvents();
}

function extractKeyElements(sentence) {
    const words = sentence.replace(/[.,!?]/g, '').split(' ').filter(w => w);
    const elements = [];

    if (words.length <= 5) {
        return words;
    }

    let verbIndex = -1;
    const verbPatterns = ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did',
        'will', 'would', 'can', 'could', 'may', 'might', 'must', 'should'];

    for (let i = 0; i < words.length; i++) {
        if (verbPatterns.includes(words[i].toLowerCase()) ||
            words[i].endsWith('s') || words[i].endsWith('ed') || words[i].endsWith('ing')) {
            verbIndex = i;
            break;
        }
    }

    if (verbIndex === -1) verbIndex = Math.floor(words.length / 3);

    const subject = words.slice(0, verbIndex + 1).join(' ');
    const rest = words.slice(verbIndex + 1);

    if (rest.length > 0) {
        const mid = Math.ceil(rest.length / 2);
        elements.push(subject);
        elements.push(rest.slice(0, mid).join(' '));
        if (rest.slice(mid).length > 0) {
            elements.push(rest.slice(mid).join(' '));
        }
    } else {
        elements.push(subject);
    }

    return elements.filter(e => e);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (JSON.stringify(shuffled) === JSON.stringify(array) && array.length > 1) {
        return shuffleArray(array);
    }
    return shuffled;
}

// ==========================================
// Drag and Drop
// ==========================================
let draggedElement = null;
let selectedChip = null;

function handleDragStart(event) {
    draggedElement = event.target;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.target.dataset.word);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedElement = null;
    document.querySelectorAll('.drop-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.target.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.target.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    const slot = event.target.closest('.drop-slot');

    if (slot && draggedElement) {
        slot.classList.remove('drag-over');

        if (slot.querySelector('.word-chip')) {
            const existingChip = slot.querySelector('.word-chip');
            document.getElementById('word-bank').appendChild(existingChip);
            existingChip.classList.remove('placed');
        }

        slot.appendChild(draggedElement);
        draggedElement.classList.add('placed');
        slot.classList.add('filled');
    }
}

function handleChipClick(event) {
    const chip = event.target.closest('.word-chip');
    if (!chip) return;

    if (chip.parentElement.classList.contains('drop-slot')) {
        chip.parentElement.classList.remove('filled');
        document.getElementById('word-bank').appendChild(chip);
        chip.classList.remove('placed');
        return;
    }

    if (selectedChip === chip) {
        chip.style.outline = '';
        selectedChip = null;
    } else {
        if (selectedChip) {
            selectedChip.style.outline = '';
        }
        chip.style.outline = '3px solid white';
        selectedChip = chip;

        const emptySlot = document.querySelector('.drop-slot:not(.filled)');
        if (emptySlot) {
            emptySlot.appendChild(chip);
            chip.classList.add('placed');
            emptySlot.classList.add('filled');
            chip.style.outline = '';
            selectedChip = null;
        }
    }
}

function setupTouchEvents() {
    const answerZone = document.getElementById('answer-zone');

    answerZone.querySelectorAll('.drop-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            if (selectedChip && !slot.classList.contains('filled')) {
                slot.appendChild(selectedChip);
                selectedChip.classList.add('placed');
                slot.classList.add('filled');
                selectedChip.style.outline = '';
                selectedChip = null;
            }
        });
    });
}

// ==========================================
// Answer Checking & Hints
// ==========================================
let currentAttempts = 0;
let currentErrors = [];
let lastWrongSentence = '';

function checkAnswer() {
    const answerZone = document.getElementById('answer-zone');
    const slots = answerZone.querySelectorAll('.drop-slot');
    const correctOrder = JSON.parse(answerZone.dataset.correctOrder);

    const currentOrder = [];
    let allFilled = true;

    slots.forEach(slot => {
        const chip = slot.querySelector('.word-chip');
        if (chip) {
            currentOrder.push(chip.dataset.word);
        } else {
            allFilled = false;
        }
    });

    if (!allFilled) {
        showFeedback('hint', '💡 모든 칸을 채워주세요!');
        return;
    }

    state.totalAttempts++;
    currentAttempts++;

    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);

    if (isCorrect) {
        state.correctCount++;
        const timeSpent = Math.round((Date.now() - state.stageStartTime) / 1000);

        // Record result
        state.results.push({
            sentence: state.sentences[state.currentSentenceIndex].english,
            stage: state.currentStage,
            correct: true,
            attempts: currentAttempts,
            hintsUsed: state.hintsUsed,
            time: timeSpent,
            errors: [...currentErrors],
            studentAnswer: lastWrongSentence
        });

        currentAttempts = 0;
        currentErrors = [];
        lastWrongSentence = '';

        showFeedback('success', '🎉 정답입니다! 훌륭해요!');

        // TTS 자동 재생 (정답 후 모드)
        if ((state.ttsMode || 'after-correct') === 'after-correct') {
            setTimeout(() => speakSentence(), 100);
        }

        setTimeout(() => {
            advanceProgress();
        }, 1200);
    } else {
        state.wrongAttempts++;
        state.currentStageAttempts++;

        // 오답 전체 문장 저장 (정답 맞춰주기 전 상태를 보존)
        lastWrongSentence = currentOrder.join(' ');

        // Track specific errors
        currentOrder.forEach((word, index) => {
            if (word !== correctOrder[index]) {
                currentErrors.push({
                    position: index,
                    placed: word,
                    expected: correctOrder[index]
                });
            }
        });

        // Check if attempt limit reached
        if (state.attemptLimit > 0 && state.currentStageAttempts >= state.attemptLimit) {
            // Show correct answer and skip button
            const correctAnswer = correctOrder.join(' ');
            showFeedback('limit', `❌ ${state.attemptLimit}번 틀렸어요!<br><br>
                <div class="correct-answer-reveal">
                    <strong>정답:</strong> ${correctAnswer}
                </div>
                <button class="skip-btn" onclick="skipToNext()">
                    <span>⏭️</span> 다음으로 넘어가기
                </button>
            `);

            // Record as failed
            const timeSpent = Math.round((Date.now() - state.stageStartTime) / 1000);
            state.results.push({
                sentence: state.sentences[state.currentSentenceIndex].english,
                stage: state.currentStage,
                correct: false,
                attempts: currentAttempts,
                hintsUsed: state.hintsUsed,
                time: timeSpent,
                errors: [...currentErrors],
                skipped: true,
                studentAnswer: currentOrder.join(' ')
            });

            currentAttempts = 0;
            currentErrors = [];
            lastWrongSentence = '';
        } else {
            // Get smart pairing hint based on the error
            const sentence = state.sentences[state.currentSentenceIndex].english;
            const pairingHint = getPairingHint(currentOrder, correctOrder, sentence);

            // Show remaining attempts if limit mode
            let attemptsMsg = '';
            if (state.attemptLimit > 0) {
                const remaining = state.attemptLimit - state.currentStageAttempts;
                attemptsMsg = `<br><span class="attempts-remaining">남은 기회: ${remaining}번</span>`;
            }

            const resetBtn = `<br><button class="reset-btn" onclick="resetAllBlocks()"><span>🔄</span> 다시 시도</button>`;
            showFeedback('error', pairingHint + attemptsMsg + resetBtn);
            highlightErrors(currentOrder, correctOrder);
        }
    }
}

// Skip to next when attempt limit reached
function skipToNext() {
    state.currentStageAttempts = 0;
    currentAttempts = 0;
    currentErrors = [];
    lastWrongSentence = '';
    advanceProgress();
}

// ==========================================
// MD Report & Export
// ==========================================
function generateMDReport() {
    const now = new Date();
    const dateStr = now.getFullYear() + '.' +
        String(now.getMonth() + 1).padStart(2, '0') + '.' +
        String(now.getDate()).padStart(2, '0');
    const totalStages = state.sentences.length * state.selectedStages.length;
    const accuracy = totalStages > 0 ? Math.round((state.correctCount / totalStages) * 100) : 0;

    const wrongResults = state.results.filter(r => !r.correct || r.skipped);
    const wrongSentences = [...new Set(wrongResults.map(r => r.sentence))];

    let md = '# Sweep 학습 결과 리포트\n\n';
    md += '- **날짜**: ' + dateStr + '\n';
    md += '- **총 문장**: ' + state.sentences.length + '개\n';
    md += '- **단계**: ' + state.selectedStages.join(', ') + '단계\n';
    md += '- **정답률**: ' + accuracy + '% (' + state.correctCount + '/' + totalStages + ')\n';
    md += '- **오답 횟수**: ' + state.wrongAttempts + '회 | **힌트**: ' + state.hintsUsed + '회\n\n';

    md += '## 단계별 분석\n\n';
    md += '| 단계 | 이름 | 정답률 |\n|------|------|--------|\n';
    for (const stage of state.selectedStages) {
        const sr = state.results.filter(r => r.stage === stage);
        const sc = sr.filter(r => r.correct).length;
        const sa = sr.length > 0 ? Math.round(sc / sr.length * 100) : 0;
        const sn = stage === 1 ? '청크 배열' : stage === 2 ? '핵심 배열' : '완전 배열';
        md += '| ' + stage + '단계 | ' + sn + ' | ' + sa + '% |\n';
    }
    md += '\n';

    md += '## 문장별 상세 기록\n\n';
    const sentenceMap = {};
    state.results.forEach(r => {
        if (!sentenceMap[r.sentence]) sentenceMap[r.sentence] = [];
        sentenceMap[r.sentence].push(r);
    });

    state.sentences.forEach((s, idx) => {
        const records = sentenceMap[s.english] || [];
        const allCorrect = records.length > 0 && records.every(r => r.correct && !r.skipped);
        const hasWrong = records.some(r => !r.correct || r.skipped);
        const icon = allCorrect ? '✅' : hasWrong ? '❌' : '❓';

        md += '### ' + icon + ' 문장 ' + (idx + 1) + '\n';
        md += '- **영어**: ' + s.english + '\n';
        if (s.korean) md += '- **한글**: ' + s.korean + '\n';

        records.forEach(r => {
            const sl = r.stage + '단계';
            if (r.correct && !r.skipped) {
                md += '- ' + sl + ': 정답 (' + r.attempts + '회 시도, ' + r.time + '초)\n';
            } else if (r.skipped) {
                md += '- ' + sl + ': 스킵 (최대 시도 초과)\n';
                if (r.studentAnswer) md += '  - 오답 문장: ' + r.studentAnswer + '\n';
            }
        });
        md += '\n';
    });

    if (wrongSentences.length > 0) {
        md += '## 오답 문장 모음 (Syntax Sniper 연습용)\n\n';
        wrongSentences.forEach((s, i) => {
            const sObj = state.sentences.find(x => x.english === s);
            md += (i + 1) + '. ' + s;
            if (sObj && sObj.korean) md += ' (' + sObj.korean + ')';
            md += '\n';
        });
        md += '\n';
    }

    md += '## Gemini 분석 요청\n\n';
    md += '> 다음 질문에 답해주세요:\n>\n';
    md += '> 1. 위 오답 패턴의 **공통 문법 구조**는? (후치수식, 부사구문, 종속절 등)\n>\n';
    md += '> 2. 후치수식(관계절, 분사, to부정사)과 오답 상관관계가 있는가?\n>\n';
    md += '> 3. 1/2/3단계 중 가장 취약한 단계와 이유는?\n>\n';
    md += '> 4. **Syntax Sniper**에서 집중 연습할 후치수식 유형 추천\n>\n';
    md += '> 5. 다음 학습을 위한 구체적 조언\n\n';
    md += '---\n*Sweep v2.0 | Wonsummer Studio*\n';

    return md;
}

function downloadMD() {
    if (!state.results || state.results.length === 0) {
        alert('학습을 먼저 완료해주세요!');
        return;
    }
    const md = generateMDReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const ds = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'sweep_result_' + ds + '.md';
    a.click();
    URL.revokeObjectURL(url);
}

function copyWrongSentences() {
    const wrongResults = state.results.filter(r => !r.correct || r.skipped);
    const wrongSentences = [...new Set(wrongResults.map(r => r.sentence))];

    if (wrongSentences.length === 0) {
        alert('틀린 오답이 없어요! 다 맞혔어요 🎉');
        return;
    }

    const text = wrongSentences.join('\n');
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('클립보드에 복사되었습니다! (' + wrongSentences.length + '개 문장)\n\nSyntax Sniper 커스텀 텍스트에 붙여넣기 하세요.');
        }).catch(() => {
            prompt('아래 문장을 복사하세요:', text);
        });
    } else {
        prompt('아래 문장을 복사하세요:', text);
    }
}

// Reset all placed blocks back to word bank
function resetAllBlocks() {
    const wordBank = document.getElementById('word-bank');
    const slots = document.querySelectorAll('.drop-slot');

    slots.forEach(slot => {
        const chip = slot.querySelector('.word-chip');
        if (chip) {
            chip.classList.remove('placed');
            slot.classList.remove('filled');
            wordBank.appendChild(chip);
        }
    });

    hideFeedback();
}

// Text-to-Speech: Speak the current English sentence
function speakSentence() {
    if (!state.sentences.length) return;

    const sentence = state.sentences[state.currentSentenceIndex].english;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;  // Slightly slower for learners
    utterance.pitch = 1;

    // Try to find English voice
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
        || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
        utterance.voice = englishVoice;
    }

    // Visual feedback on button
    const btn = document.getElementById('voice-btn');
    btn.classList.add('speaking');
    utterance.onend = () => btn.classList.remove('speaking');
    utterance.onerror = () => btn.classList.remove('speaking');

    speechSynthesis.speak(utterance);
}

// ==========================================
// Speech Recognition (STT)
// ==========================================
let speechRecognition = null;
let isRecognizing = false;

function toggleSpeechRecognition() {
    if (isRecognizing) {
        stopSpeechRecognition();
        return;
    }

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showFeedback('error', '❌ 이 브라우저는 음성 인식을 지원하지 않아요!<br>Chrome 브라우저를 사용해주세요.');
        return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'en-US';
    speechRecognition.continuous = false;
    speechRecognition.interimResults = true;
    speechRecognition.maxAlternatives = 1;

    const micBtn = document.getElementById('mic-btn');
    const speechResult = document.getElementById('speech-result');
    const speechText = document.getElementById('speech-text');

    // Start
    isRecognizing = true;
    micBtn.classList.add('recording');
    micBtn.innerHTML = '<span>⏹️</span> 듣는 중...';
    speechResult.classList.remove('hidden');
    speechText.textContent = '말해보세요...';
    speechText.className = 'speech-text listening';

    speechRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        speechText.textContent = transcript;
        speechText.className = 'speech-text';

        // If final result, compare
        if (event.results[event.results.length - 1].isFinal) {
            compareSpeechToAnswer(transcript);
        }
    };

    speechRecognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        if (event.error === 'no-speech') {
            speechText.textContent = '소리가 안 들렸어요. 다시 시도해주세요!';
        } else if (event.error === 'not-allowed') {
            speechText.textContent = '마이크 권한을 허용해주세요!';
        } else {
            speechText.textContent = `오류: ${event.error}`;
        }
        stopSpeechRecognition();
    };

    speechRecognition.onend = () => {
        stopSpeechRecognition();
    };

    speechRecognition.start();
}

function stopSpeechRecognition() {
    isRecognizing = false;
    const micBtn = document.getElementById('mic-btn');
    micBtn.classList.remove('recording');
    micBtn.innerHTML = '<span>🎤</span> 말하기';

    if (speechRecognition) {
        try { speechRecognition.stop(); } catch (e) { }
    }
}

function compareSpeechToAnswer(spoken) {
    const sentence = state.sentences[state.currentSentenceIndex].english;

    // Normalize both strings for comparison
    const normalize = (s) => s.toLowerCase().replace(/[.,!?;:'"()-]/g, '').replace(/\s+/g, ' ').trim();

    const spokenNorm = normalize(spoken);
    const correctNorm = normalize(sentence);

    const speechText = document.getElementById('speech-text');

    if (spokenNorm === correctNorm) {
        // Perfect match!
        state.correctCount++;
        state.totalAttempts++;
        speechText.innerHTML = `✅ <b>"${spoken}"</b>`;
        speechText.className = 'speech-text speech-correct';
        showFeedback('correct', '🎉 완벽해요! 음성으로 정확하게 말했어요!');

        // Record result
        const timeSpent = Math.round((Date.now() - state.stageStartTime) / 1000);
        state.results.push({
            sentence: sentence,
            stage: state.currentStage,
            correct: true,
            attempts: 1,
            hintsUsed: state.hintsUsed,
            time: timeSpent,
            errors: [],
            speechMode: true,
            studentAnswer: lastWrongSentence || ''
        });
        lastWrongSentence = '';

        setTimeout(() => {
            document.getElementById('speech-result').classList.add('hidden');
            advanceProgress();
        }, 1500);
    } else {
        // Show word-by-word comparison
        state.wrongAttempts++;
        state.totalAttempts++;
        state.currentStageAttempts++;

        // 음성 오답 저장
        lastWrongSentence = spoken;

        const spokenWords = spokenNorm.split(' ');
        const correctWords = correctNorm.split(' ');

        let diffHtml = '';
        const maxLen = Math.max(spokenWords.length, correctWords.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < spokenWords.length && i < correctWords.length) {
                if (spokenWords[i] === correctWords[i]) {
                    diffHtml += `<span class="word-correct">${spokenWords[i]}</span> `;
                } else {
                    diffHtml += `<span class="word-wrong">${spokenWords[i]}</span> `;
                }
            } else if (i < spokenWords.length) {
                diffHtml += `<span class="word-extra">${spokenWords[i]}</span> `;
            }
        }

        speechText.innerHTML = diffHtml;
        speechText.className = 'speech-text';

        // Show hint
        const hint = `❌ 조금 달라요!<br><br>` +
            `<b>내가 말한 것:</b> ${spoken}<br>` +
            `<b>정답:</b> ${sentence}<br><br>` +
            `<span style="color: var(--secondary)">초록</span> = 맞음, ` +
            `<span style="color: var(--danger)">빨강</span> = 틀림<br><br>` +
            `<button class="reset-btn" onclick="retrySpeech()"><span>🎤</span> 다시 말하기</button>`;
        showFeedback('error', hint);
    }
}

function retrySpeech() {
    hideFeedback();
    document.getElementById('speech-result').classList.add('hidden');
    toggleSpeechRecognition();
}

function highlightErrors(current, correct) {
    const slots = document.querySelectorAll('.drop-slot');

    slots.forEach((slot, index) => {
        const chip = slot.querySelector('.word-chip');
        if (chip && current[index] !== correct[index]) {
            chip.style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                chip.style.animation = '';
            }, 500);
        }
    });
}

// ==========================================
// Pairing Concept + Grammar Structure Hint System
// ==========================================

// Grammar Structure Detection Engine
function analyzeGrammarStructure(sentence) {
    const s = sentence.toLowerCase();
    const words = s.replace(/[.,!?]/g, '').split(/\s+/);
    const structures = [];

    // 1. to부정사 (To-infinitive)
    const toInfMatch = s.match(/\bto\s+(be|have|do|make|get|take|give|find|keep|let|say|go|come|see|know|want|need|use|try|ask|work|call|help|feel|seem|become|begin|start|learn|play|run|live|believe|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|move|lead|understand|turn|leave|show|hear|create|spend|grow|open|walk|win|hold|teach|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull|develop|produce|eat|read|carry|follow|allow|think|look|put|tell)\b/);
    if (toInfMatch) {
        // Check usage type
        if (/^to\s+\w+/.test(s)) {
            structures.push({
                type: 'to-infinitive-subject',
                name: 'to부정사 (주어 역할)',
                hints: [
                    '💡 이 문장에는 <b>to부정사</b>가 <span class="hint-subj">주어</span> 역할을 해요!',
                    '💡 <b>To + 동사원형</b>이 문장 맨 앞에서 주어처럼 사용돼요!<br>→ "~하는 것은" 이라는 뜻으로 해석하세요.',
                    '💡 구조: <span class="hint-subj">[To + 동사원형 ...]</span> + <span class="hint-verb">동사</span> + 나머지<br>→ To부정사 덩어리가 먼저, 그 다음 동사!'
                ]
            });
        } else if (/\b(want|need|decide|plan|hope|wish|expect|learn|agree|refuse|promise|offer|fail|manage|afford|choose|pretend|seem|appear|tend)\b.*\bto\b/.test(s)) {
            structures.push({
                type: 'to-infinitive-object',
                name: 'to부정사 (목적어 역할)',
                hints: [
                    '💡 이 문장의 동사 뒤에 <b>to부정사</b>가 목적어로 와요!',
                    '💡 <b>동사 + to + 동사원형</b> 패턴이에요!<br>→ "~하기를 원하다/결정하다/희망하다"',
                    '💡 구조: 주어 + <span class="hint-verb">동사</span> + <span class="hint-obj">to + 동사원형</span><br>→ want to ~, decide to ~, hope to ~'
                ]
            });
        } else if (/\b(in order|so as)\s+to\b/.test(s) || /,?\s*to\s+\w+/.test(s)) {
            structures.push({
                type: 'to-infinitive-adverb',
                name: 'to부정사 (목적/부사 역할)',
                hints: [
                    '💡 이 문장에서 <b>to부정사</b>가 "~하기 위해" 라는 <span class="hint-prep">목적</span>을 나타내요!',
                    '💡 <b>to + 동사원형</b> = "~하기 위해서"<br>→ 부사처럼 동사를 수식해요!',
                    '💡 구조: 주절 + <span class="hint-prep">to + 동사원형</span> (~하기 위해)<br>→ to부정사가 문장 뒤에서 이유/목적을 알려줘요!'
                ]
            });
        } else {
            structures.push({
                type: 'to-infinitive',
                name: 'to부정사',
                hints: [
                    '💡 이 문장에는 <b>to부정사</b> 구문이 있어요!',
                    '💡 <b>to + 동사원형</b>이 하나의 덩어리에요!<br>→ to 뒤에 동사원형이 바로 따라와요.',
                    '💡 to부정사 덩어리를 찾아서 한 묶음으로 생각하세요!<br>→ <span class="hint-verb">[to + 동사원형 + ...]</span>'
                ]
            });
        }
    }

    // 2. 동명사 (Gerund / V-ing)
    const ingWords = words.filter(w => w.endsWith('ing') && w.length > 4 && !['thing', 'something', 'nothing', 'anything', 'everything', 'during', 'morning', 'evening', 'string', 'spring', 'bring', 'king', 'ring', 'sing'].includes(w));
    if (ingWords.length > 0) {
        // Check if V-ing is at the start (subject gerund)
        if (words[0].endsWith('ing') && words[0].length > 4) {
            structures.push({
                type: 'gerund-subject',
                name: '동명사 주어 (V-ing)',
                hints: [
                    '💡 이 문장은 <b>동명사(V-ing)</b>가 <span class="hint-subj">주어</span>예요!',
                    '💡 <b>V-ing</b>로 시작하면 "~하는 것은" 이라는 뜻!<br>→ 동명사 덩어리가 주어 자리에 와요.',
                    '💡 구조: <span class="hint-subj">[V-ing + ...]</span> + <span class="hint-verb">동사</span> + 나머지<br>→ V-ing 덩어리를 먼저 배치!'
                ]
            });
        } else if (/\b(enjoy|mind|finish|avoid|consider|suggest|practice|quit|deny|imagine|keep|risk|admit|delay|miss|postpone|resist|give up|put off)\b/.test(s)) {
            structures.push({
                type: 'gerund-object',
                name: '동명사 목적어',
                hints: [
                    '💡 이 동사 뒤에는 <b>동명사(V-ing)</b>가 목적어로 와요!',
                    '💡 enjoy / mind / finish / avoid 같은 동사 뒤에는<br>→ <b>to부정사 ❌</b>, <b>V-ing ✅</b>만 올 수 있어요!',
                    '💡 구조: 주어 + <span class="hint-verb">동사</span> + <span class="hint-obj">[V-ing + ...]</span><br>→ enjoy doing, finish reading 패턴!'
                ]
            });
        } else {
            structures.push({
                type: 'present-participle',
                name: '현재분사 / 동명사',
                hints: [
                    '💡 이 문장에 <b>V-ing</b> 형태가 있어요! 위치를 잘 보세요.',
                    '💡 <b>V-ing</b>가 명사 앞/뒤에서 수식하거나, 동사 뒤에서 진행을 나타내요.',
                    '💡 V-ing의 역할: ① 진행형(be + V-ing) ② 수식(명사 앞뒤) ③ 주어/목적어(동명사)'
                ]
            });
        }
    }

    // 3. 수동태 (Passive Voice)
    if (/\b(is|are|was|were|been|being|be)\s+(not\s+)?(also\s+)?(easily\s+|often\s+|usually\s+|always\s+|never\s+)?(regarded|considered|made|called|known|used|found|given|taken|seen|done|said|told|shown|left|written|kept|led|set|built|sent|expected|required|allowed|believed|caused|created|designed|developed|discovered|discussed|divided|driven|established|estimated|forced|formed|identified|included|introduced|involved|limited|linked|located|moved|needed|observed|obtained|offered|organized|placed|produced|provided|published|raised|received|recognized|related|released|remained|reported|represented|resulted|studied|suggested|supported|thought|turned|understood|viewed|based|born|broken|brought|bought|caught|chosen|cut|drawn|drunk|eaten|fallen|felt|fought|forgotten|frozen|grown|heard|held|hidden|hit|hurt|lost|met|paid|put|read|run|sold|shot|shut|sat|slept|spoken|spent|stood|struck|taught|thrown|torn|understood|woken|worn|won|wound|written)\b/.test(s)) {
        structures.push({
            type: 'passive',
            name: '수동태 (be + p.p.)',
            hints: [
                '💡 이 문장은 <b>수동태</b> 구문이에요!',
                '💡 <b>be동사 + 과거분사(p.p.)</b> = "~되다/당하다"<br>→ 주어가 행동을 당하는 쪽이에요!',
                '💡 구조: <span class="hint-subj">주어</span> + <span class="hint-verb">be + p.p.</span> + (by ~)<br>→ is/are/was/were + 과거분사 순서!'
            ]
        });
    }

    // 4. 관계대명사절 (Relative Clause)
    if (/\b(who|whom|whose|which|that)\b/.test(s) && !/\bthat\b/.test(s.split(/,/)[0].trim().split(' ').slice(-1)[0])) {
        const relWord = s.match(/\b(who|whom|whose|which|that)\b/)?.[1];
        structures.push({
            type: 'relative-clause',
            name: '관계대명사절',
            hints: [
                `💡 이 문장에 <b>관계대명사 "${relWord}"</b>가 있어요! 앞의 명사를 수식해요.`,
                `💡 <b>명사 + ${relWord} + 절</b> = 관계대명사절!<br>→ "${relWord}" 이하가 앞 명사를 꾸며줘요.<br>→ 관계사절은 [ ] 하나의 덩어리!`,
                `💡 구조: <span class="hint-subj">[명사]</span> + <span class="hint-prep">[${relWord} + 주어 + 동사...]</span> + <span class="hint-verb">본문 동사</span><br>→ 관계사절이 명사 바로 뒤에!`
            ]
        });
    }

    // 5. 분사 후치수식 (Postpositive Participle)
    if (/\b\w+ed\s+(by|in|at|on|from|with|for)\b/.test(s) || /\b\w+ing\s+(in|at|on|for|with|to)\b/.test(s)) {
        structures.push({
            type: 'postpositive-participle',
            name: '분사 후치수식',
            hints: [
                '💡 이 문장에 <b>분사가 명사 뒤에서 수식</b>하는 구조가 있어요!',
                '💡 <b>명사 + V-ing/p.p. + ...</b> = 후치수식!<br>→ "~하는/~된 (명사)" 로 해석하세요.<br>→ 분사 이하가 앞 명사를 꾸며줘요!',
                '💡 구조: <span class="hint-subj">[명사]</span> + <span class="hint-prep">[V-ing/p.p. + ...]</span><br>→ 분사구가 명사 바로 뒤에 붙어요!'
            ]
        });
    }

    // 6. 가주어 It (It ~ to/that)
    if (/^it\s+(is|was|seems|appears|becomes)\b/.test(s) && (/\bto\s+\w+/.test(s) || /\bthat\s+/.test(s))) {
        structures.push({
            type: 'it-cleft',
            name: '가주어 It 구문',
            hints: [
                '💡 이 문장은 <b>가주어 It</b> 구문이에요!',
                '💡 <b>It</b>은 가짜 주어! 진짜 주어는 뒤의 <b>to~/that~</b>!<br>→ It = 형식적 주어, 진짜 내용은 뒤에!',
                '💡 구조: <span class="hint-subj">It</span> + <span class="hint-verb">is/was</span> + 형용사 + <span class="hint-obj">to~/that~</span><br>→ It is important to study hard.'
            ]
        });
    }

    // 7. 사역동사 + 5형식 (Causative / SVOC)
    if (/\b(make|let|have|help)\b/.test(s)) {
        const causVerb = s.match(/\b(make|let|have|help)\b/)?.[1];
        structures.push({
            type: 'causative',
            name: `사역동사 (${causVerb})`,
            hints: [
                `💡 이 문장에 <b>사역동사 "${causVerb}"</b>가 있어요!`,
                `💡 <b>${causVerb} + 목적어 + 동사원형/p.p.</b> 패턴!<br>→ "${causVerb} A do B" = A가 B하게 하다<br>→ 목적어 다음에 동사원형이나 과거분사가 와요!`,
                `💡 구조: 주어 + <span class="hint-verb">${causVerb}</span> + <span class="hint-obj">목적어</span> + <span class="hint-prep">동사원형/p.p.</span><br>→ 사역동사 뒤: 목적어 → 보어(원형/p.p.) 순서!`
            ]
        });
    }

    // Also check perception verbs (5형식)
    if (/\b(see|watch|hear|feel|notice|observe)\b/.test(s)) {
        const percVerb = s.match(/\b(see|watch|hear|feel|notice|observe)\b/)?.[1];
        structures.push({
            type: 'perception-verb',
            name: `지각동사 (${percVerb})`,
            hints: [
                `💡 이 문장에 <b>지각동사 "${percVerb}"</b>가 있어요!`,
                `💡 <b>${percVerb} + 목적어 + 동사원형/V-ing</b> 패턴!<br>→ A가 B하는 것을 보다/듣다/느끼다`,
                `💡 구조: 주어 + <span class="hint-verb">${percVerb}</span> + <span class="hint-obj">목적어</span> + <span class="hint-prep">동사원형/V-ing</span>`
            ]
        });
    }

    // 8. 부사절 접속사 (Adverb Clause)
    const conjMatch = s.match(/\b(when|while|before|after|since|until|because|although|though|even though|if|unless|as soon as|so that|in order that|wherever|whenever|as)\b/);
    if (conjMatch) {
        const conj = conjMatch[1];
        const isFirst = s.indexOf(conj) < s.length / 3;  // conjunction at start
        structures.push({
            type: 'adverb-clause',
            name: `접속사 "${conj}" 부사절`,
            hints: [
                `💡 이 문장에 접속사 <b>"${conj}"</b>가 있어요! 부사절을 이끌어요.`,
                `💡 <b>${conj} + 주어 + 동사</b> = 부사절 덩어리!<br>→ ${isFirst ? '부사절이 앞에 오면 <b>콤마(,)</b> 뒤가 주절!' : '주절 뒤에 부사절이 와요.'}`,
                `💡 구조: ${isFirst ? '<span class="hint-prep">[' + conj + ' + S + V...]</span>, + <span class="hint-subj">주절</span>' : '<span class="hint-subj">주절</span> + <span class="hint-prep">[' + conj + ' + S + V...]</span>'}<br>→ 접속사절을 하나의 덩어리로!`
            ]
        });
    }

    // 9. 현재완료 (Present Perfect)
    if (/\b(have|has|had)\s+(not\s+)?(already\s+|just\s+|ever\s+|never\s+|recently\s+)?(been|done|made|gone|come|taken|seen|known|given|found|said|told|got|left|put|read|run|set|shown|thought|tried|used|worked|written|become|begun|broken|brought|built|bought|caught|chosen|drawn|drunk|eaten|fallen|felt|flown|forgotten|frozen|grown|heard|held|hidden|hit|hurt|kept|led|lost|met|paid|sat|sold|sent|shot|slept|spoken|spent|stood|struck|taught|thrown|understood|woken|worn|won|wound)\b/.test(s)) {
        structures.push({
            type: 'perfect-tense',
            name: '완료시제 (have + p.p.)',
            hints: [
                '💡 이 문장은 <b>완료시제</b>에요!',
                '💡 <b>have/has/had + 과거분사(p.p.)</b> = 완료시제!<br>→ 경험/완료/계속/결과를 나타내요.',
                '💡 구조: 주어 + <span class="hint-verb">have/has</span> + <span class="hint-prep">p.p.</span> + 나머지<br>→ have와 과거분사는 짝! 사이에 부사가 올 수 있어요.'
            ]
        });
    }

    // 10. 비교급/최상급
    if (/\b(more|less)\s+\w+\s+than\b/.test(s) || /\b\w+(er|ier)\s+than\b/.test(s)) {
        structures.push({
            type: 'comparative',
            name: '비교급 (more~/~er + than)',
            hints: [
                '💡 이 문장에 <b>비교급</b> 구문이 있어요!',
                '💡 <b>more + 형용사 + than</b> 또는 <b>~er + than</b>!<br>→ "~보다 더 ...한" 이라는 뜻이에요.',
                '💡 구조: A + <span class="hint-verb">be동사</span> + <span class="hint-prep">more ~/~er</span> + <span class="hint-obj">than</span> + B<br>→ 비교급과 than은 짝!'
            ]
        });
    } else if (/\bthe\s+(most|least)\b/.test(s) || /\bthe\s+\w+(est|iest)\b/.test(s)) {
        structures.push({
            type: 'superlative',
            name: '최상급 (the most~/~est)',
            hints: [
                '💡 이 문장에 <b>최상급</b> 구문이 있어요!',
                '💡 <b>the + most + 형용사</b> 또는 <b>the + ~est</b>!<br>→ "가장 ...한" 이라는 뜻이에요.',
                '💡 구조: <span class="hint-prep">the most ~/the ~est</span> + 명사<br>→ the와 most/~est는 짝!'
            ]
        });
    } else if (/\bas\s+\w+\s+as\b/.test(s)) {
        structures.push({
            type: 'as-as',
            name: '원급 비교 (as ~ as)',
            hints: [
                '💡 이 문장에 <b>as ~ as</b> 원급 비교가 있어요!',
                '💡 <b>as + 형용사/부사 + as</b> = "~만큼 ...한"!<br>→ 두 개의 as 사이에 형용사/부사!',
                '💡 구조: A + <span class="hint-verb">be</span> + <span class="hint-prep">as</span> + 형용사 + <span class="hint-prep">as</span> + B<br>→ as와 as는 짝!'
            ]
        });
    }

    // 11. 접속사 that절 (명사절)
    if (/\b(think|believe|know|hope|realize|suppose|imagine|notice|discover|admit|claim|agree|insist|suggest|demand|recommend)\s+(that\s+)?/.test(s)) {
        structures.push({
            type: 'that-clause',
            name: 'that 명사절',
            hints: [
                '💡 이 문장에서 동사 뒤에 <b>that절</b>이 목적어로 와요!',
                '💡 <b>동사 + (that) + 주어 + 동사</b> = that 명사절!<br>→ "~라고 생각하다/믿다/알다"',
                '💡 구조: 주어 + <span class="hint-verb">동사</span> + <span class="hint-prep">(that)</span> + <span class="hint-obj">[S + V ...]</span><br>→ that절 전체가 목적어 덩어리!'
            ]
        });
    }

    // 12. 분사구문 (Participial Construction)
    if (/^(not\s+)?\w+ing\b/.test(s) && /,/.test(s)) {
        structures.push({
            type: 'participial-construction',
            name: '분사구문 (V-ing ~, S+V)',
            hints: [
                '💡 이 문장은 <b>분사구문</b>으로 시작해요!',
                '💡 <b>V-ing ~, 주어 + 동사</b> = 분사구문!<br>→ "~하면서/~해서/~할 때" 라는 뜻이에요.',
                '💡 구조: <span class="hint-prep">[V-ing + ...]</span>, + <span class="hint-subj">주어</span> + <span class="hint-verb">동사</span><br>→ 분사구 뒤에 콤마, 그 다음 주절!'
            ]
        });
    }

    return structures;
}

// Main Hint Function - Integrates pairing concepts + grammar hints
function getPairingHint(currentOrder, correctOrder, sentence) {
    const sentenceLower = sentence.toLowerCase();
    const attemptNum = state.currentStageAttempts;  // Use attempt count for progressive hints

    // Detect pairing patterns (existing system)
    const patterns = detectPairingPatterns(sentence);

    // Detect grammar structures (new system)
    const grammarStructures = analyzeGrammarStructure(sentence);

    // Find what went wrong
    let firstErrorIndex = -1;
    let errorCount = 0;
    for (let i = 0; i < currentOrder.length; i++) {
        if (currentOrder[i] !== correctOrder[i]) {
            if (firstErrorIndex === -1) firstErrorIndex = i;
            errorCount++;
        }
    }

    // Determine hint level (0=basic, 1=detailed, 2=structural)
    const hintLevel = Math.min(attemptNum - 1, 2);  // 0, 1, 2

    // Priority 1: Pairing concept hints (our core!)
    const pairingHint = getPairingConceptHint(patterns);

    // Priority 2: Grammar structure hints
    const grammarHint = grammarStructures.length > 0
        ? grammarStructures[0].hints[hintLevel] || grammarStructures[0].hints[grammarStructures[0].hints.length - 1]
        : null;

    // Build the final hint message
    let hint = '❌ 다시 생각해봐요!<br><br>';

    // First attempt: Show grammar structure name + pairing hint
    if (hintLevel === 0) {
        if (pairingHint) {
            hint += pairingHint;
        } else if (grammarHint) {
            hint += grammarHint;
        } else {
            hint += getBasicOrderHint(firstErrorIndex);
        }
    }
    // Second attempt: Detailed explanation + pairing
    else if (hintLevel === 1) {
        if (grammarHint) {
            hint += grammarHint;
            if (pairingHint) {
                hint += '<br><br><div class="hint-divider"></div>' + pairingHint;
            }
        } else if (pairingHint) {
            hint += pairingHint;
        } else {
            hint += getDetailedOrderHint(firstErrorIndex, correctOrder);
        }
    }
    // Third+ attempt: Full structural hint + pairing
    else {
        if (grammarHint) {
            hint += grammarHint;
        }
        if (pairingHint) {
            hint += (grammarHint ? '<br><br><div class="hint-divider"></div>' : '') + pairingHint;
        }
        if (!grammarHint && !pairingHint) {
            hint += getStructuralHint(correctOrder);
        }
    }

    return hint;
}

// Basic order hint when no pattern detected
function getBasicOrderHint(errorIndex) {
    if (errorIndex === 0) {
        return '💡 <b>짝 개념 힌트</b><br>문장은 <span class="hint-subj">주어</span>로 시작해요!<br>→ 누가/무엇이 먼저 와야 해요.';
    }
    switch (state.currentStage) {
        case 1:
            return '💡 <b>청크 힌트</b><br>문장을 <span class="hint-subj">주어부</span> + <span class="hint-verb">동사부</span> + <span class="hint-obj">나머지</span>로 나눠보세요!';
        case 2:
            return '💡 <b>핵심 어순 힌트</b><br><span class="hint-subj">주어</span> → <span class="hint-verb">동사</span> → <span class="hint-obj">목적어/보어</span> 순서!<br>→ 영어는 SVO 어순이에요!';
        case 3:
            return '💡 <b>세부 어순 힌트</b><br>관사(a/the) + 형용사 + 명사 순서!<br>→ 수식어는 명사 앞에!';
        default:
            return '💡 짝을 찾아보세요!';
    }
}

// Detailed order hint for second attempt
function getDetailedOrderHint(errorIndex, correctOrder) {
    const first3 = correctOrder.slice(0, Math.min(3, correctOrder.length));
    return `💡 <b>어순 힌트</b><br>문장의 시작 부분 순서:<br>→ <span class="hint-subj">${first3[0]}</span> 이(가) 먼저 와야 해요!`;
}

// Structural hint showing pattern for third+ attempt
function getStructuralHint(correctOrder) {
    const labels = correctOrder.map((w, i) => {
        if (i === 0) return `<span class="hint-subj">${w}</span>`;
        if (i === 1) return `<span class="hint-verb">${w}</span>`;
        return `<span class="hint-obj">${w}</span>`;
    });
    return `💡 <b>구조 힌트</b><br>정답 순서의 앞부분:<br>→ ${labels.slice(0, Math.min(4, labels.length)).join(' + ')} ...`;
}

// Extract pairing concept hint from detected patterns
function getPairingConceptHint(patterns) {
    if (patterns.hasAsPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">동사 A</span> <span class="hint-prep">as</span> B 패턴!<br>→ A와 as B가 짝이에요!`;
    }
    if (patterns.hasWithPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">${patterns.verbFound} A</span> <span class="hint-prep">with</span> B 패턴!<br>→ A에게 B를 제공해요!`;
    }
    if (patterns.hasFromPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">${patterns.verbFound} A</span> <span class="hint-prep">from</span> B 패턴!<br>→ A와 B를 구별/A를 B에서 막아요!`;
    }
    if (patterns.hasToPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">${patterns.verbFound} A</span> <span class="hint-prep">to</span> B 패턴!<br>→ A를 B에 연결/귀속시켜요!`;
    }
    if (patterns.hasOfPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">${patterns.verbFound} A</span> <span class="hint-prep">of</span> B 패턴!<br>→ A에게 B를 알리거나 빼앗아요!`;
    }
    if (patterns.hasIntoPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">${patterns.verbFound} A</span> <span class="hint-prep">into</span> B 패턴!<br>→ A를 B로 변환해요!`;
    }
    if (patterns.hasForPattern) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-verb">${patterns.verbFound} A</span> <span class="hint-prep">for</span> B 패턴!<br>→ A에게 B 때문에/B로!`;
    }
    if (patterns.hasCorrelative) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-prep">${patterns.correlativeFound}</span> 상관접속사!<br>→ 앞뒤가 짝을 이뤄요!`;
    }
    if (patterns.hasComparison) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-prep">비교급 + than</span> 또는 <span class="hint-prep">as + 원급 + as</span>!<br>→ 비교 표현은 짝이 있어요!`;
    }
    if (patterns.hasPreposition) {
        return `🔗 <b>짝 개념!</b><br><span class="hint-prep">전치사(${patterns.prepositionFound})</span> + <span class="hint-obj">명사</span>!<br>→ 전치사+명사는 짝이에요!`;
    }
    return null;
}

// Pairing pattern detection (kept & maintained)
function detectPairingPatterns(sentence) {
    const sentenceLower = sentence.toLowerCase();

    const patterns = {
        hasAsPattern: false,
        hasWithPattern: false,
        hasFromPattern: false,
        hasToPattern: false,
        hasOfPattern: false,
        hasIntoPattern: false,
        hasForPattern: false,
        hasPreposition: false,
        prepositionFound: '',
        hasCorrelative: false,
        correlativeFound: '',
        hasComparison: false,
        verbFound: ''
    };

    // A as B
    const asVerbs = ['view', 'regard', 'see', 'consider', 'describe', 'define', 'perceive', 'refer'];
    asVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' as ')) {
            patterns.hasAsPattern = true;
            patterns.verbFound = v;
        }
    });

    // A with B
    const withVerbs = ['provide', 'supply', 'associate', 'replace', 'equip', 'present', 'fill', 'compare'];
    withVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' with ')) {
            patterns.hasWithPattern = true;
            patterns.verbFound = v;
        }
    });

    // A from B
    const fromVerbs = ['prevent', 'stop', 'keep', 'distinguish', 'differ', 'separate', 'protect', 'prohibit'];
    fromVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' from ')) {
            patterns.hasFromPattern = true;
            patterns.verbFound = v;
        }
    });

    // A to B
    const toVerbs = ['attribute', 'owe', 'prefer', 'add', 'apply', 'devote', 'expose'];
    toVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' to ')) {
            patterns.hasToPattern = true;
            patterns.verbFound = v;
        }
    });

    // A of B
    const ofVerbs = ['remind', 'inform', 'convince', 'accuse', 'deprive', 'rob', 'cure', 'suspect'];
    ofVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' of ')) {
            patterns.hasOfPattern = true;
            patterns.verbFound = v;
        }
    });

    // A into B
    const intoVerbs = ['transform', 'turn', 'divide', 'translate', 'put'];
    intoVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' into ')) {
            patterns.hasIntoPattern = true;
            patterns.verbFound = v;
        }
    });

    // A for B
    const forVerbs = ['thank', 'blame', 'praise', 'punish', 'forgive'];
    forVerbs.forEach(v => {
        if (sentenceLower.includes(v) && sentenceLower.includes(' for ')) {
            patterns.hasForPattern = true;
            patterns.verbFound = v;
        }
    });

    // Prepositions (general)
    const prepositions = ['in', 'on', 'at', 'by', 'about', 'through', 'during', 'before', 'after'];
    prepositions.forEach(p => {
        if (new RegExp(`\\b${p}\\b`).test(sentenceLower)) {
            patterns.hasPreposition = true;
            patterns.prepositionFound = p;
        }
    });

    // Correlative conjunctions
    if (sentenceLower.includes('both') && sentenceLower.includes('and')) {
        patterns.hasCorrelative = true;
        patterns.correlativeFound = 'both A and B';
    } else if (sentenceLower.includes('either') && sentenceLower.includes('or')) {
        patterns.hasCorrelative = true;
        patterns.correlativeFound = 'either A or B';
    } else if (sentenceLower.includes('neither') && sentenceLower.includes('nor')) {
        patterns.hasCorrelative = true;
        patterns.correlativeFound = 'neither A nor B';
    } else if (sentenceLower.includes('not only') && sentenceLower.includes('but also')) {
        patterns.hasCorrelative = true;
        patterns.correlativeFound = 'not only A but also B';
    } else if (sentenceLower.includes('not') && sentenceLower.includes('but')) {
        patterns.hasCorrelative = true;
        patterns.correlativeFound = 'not A but B';
    }

    // Comparison
    if (sentenceLower.includes('than') || (sentenceLower.includes('as') && /as .+ as/.test(sentenceLower))) {
        patterns.hasComparison = true;
    }

    return patterns;
}

function showHint() {
    state.hintsUsed++;
    const answerZone = document.getElementById('answer-zone');
    const correctOrder = JSON.parse(answerZone.dataset.correctOrder);
    const sentence = state.sentences[state.currentSentenceIndex].english;

    // Detect grammar structures and pairing patterns
    const grammarStructures = analyzeGrammarStructure(sentence);
    const patterns = detectPairingPatterns(sentence);
    const pairingHint = getPairingConceptHint(patterns);

    const hintLevel = ((state.hintsUsed - 1) % 3);  // 0, 1, 2 cycle

    let hintContent = '';

    if (hintLevel === 0) {
        // Level 1: Grammar structure name + what it is
        if (grammarStructures.length > 0) {
            const struct = grammarStructures[0];
            hintContent = `📘 <b>문법 구조 힌트</b><br>${struct.hints[0]}`;
        } else if (pairingHint) {
            hintContent = pairingHint;
        } else {
            // Fallback: sentence structure type
            hintContent = `📘 <b>어순 힌트</b><br>이 문장은 <span class="hint-subj">주어</span> + <span class="hint-verb">동사</span> + <span class="hint-obj">나머지</span> 구조예요!`;
        }
    } else if (hintLevel === 1) {
        // Level 2: Detailed grammar explanation + pairing
        if (grammarStructures.length > 0) {
            const struct = grammarStructures[0];
            hintContent = `📗 <b>상세 힌트</b><br>${struct.hints[1] || struct.hints[0]}`;
            if (pairingHint) {
                hintContent += `<br><br><div class="hint-divider"></div>${pairingHint}`;
            }
        } else if (pairingHint) {
            hintContent = pairingHint;
        } else {
            const first = correctOrder[0];
            hintContent = `📗 <b>어순 힌트</b><br>이 문장은 <span class="hint-subj">"${first}"</span>(으)로 시작해요!`;
        }
    } else {
        // Level 3: Full structural pattern + pairing
        if (grammarStructures.length > 0) {
            const struct = grammarStructures[0];
            hintContent = `📙 <b>구조 힌트</b><br>${struct.hints[2] || struct.hints[struct.hints.length - 1]}`;
            if (pairingHint) {
                hintContent += `<br><br><div class="hint-divider"></div>${pairingHint}`;
            }
        } else if (pairingHint) {
            hintContent = pairingHint;
            // Also show first word hint
            hintContent += `<br><br>📙 문장 시작: <span class="hint-subj">${correctOrder[0]}</span> → <span class="hint-verb">${correctOrder[1] || '...'}</span>`;
        } else {
            // Show first 2 words as structural hint
            hintContent = `📙 <b>구조 힌트</b><br>정답의 시작부분:<br>→ <span class="hint-subj">${correctOrder[0]}</span> + <span class="hint-verb">${correctOrder[1] || '...'}</span> + ...`;
        }
    }

    showFeedback('hint', hintContent);
}

function showFeedback(type, message) {
    const section = document.getElementById('feedback-section');
    const content = document.getElementById('feedback-content');

    section.className = `feedback-section ${type}`;
    content.innerHTML = message; // Changed to innerHTML for rich hints
}

function hideFeedback() {
    const section = document.getElementById('feedback-section');
    section.className = 'feedback-section hidden';
}

function advanceProgress() {
    if (state.progressMode === 'cycle') {
        // Cycle mode: all sentences at current stage, then next stage
        if (state.currentSentenceIndex < state.sentences.length - 1) {
            // Next sentence, same stage
            state.currentSentenceIndex++;
            loadCurrentSentence();
        } else {
            // All sentences done for this stage, move to next stage
            const currentStageIndex = state.selectedStages.indexOf(state.currentStage);
            if (currentStageIndex < state.selectedStages.length - 1) {
                state.currentStage = state.selectedStages[currentStageIndex + 1];
                state.currentSentenceIndex = 0;
                loadCurrentSentence();
            } else {
                // All stages done!
                showResult();
            }
        }
    } else {
        // Focus mode (default): all stages per sentence, then next sentence
        const currentStageIndex = state.selectedStages.indexOf(state.currentStage);
        if (currentStageIndex < state.selectedStages.length - 1) {
            state.currentStage = state.selectedStages[currentStageIndex + 1];
            loadCurrentSentence();
        } else {
            if (state.currentSentenceIndex < state.sentences.length - 1) {
                state.currentSentenceIndex++;
                state.currentStage = state.selectedStages[0];
                loadCurrentSentence();
            } else {
                showResult();
            }
        }
    }
}

// ==========================================
// Detailed Results & Feedback
// ==========================================
function displayResults() {
    const totalStages = state.sentences.length * state.selectedStages.length;
    const accuracy = totalStages > 0 ? Math.round((state.correctCount / totalStages) * 100) : 0;

    document.getElementById('stat-correct').textContent = state.correctCount;
    document.getElementById('stat-total').textContent = totalStages;
    document.getElementById('stat-accuracy').textContent = `${accuracy}%`;

    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');

    if (accuracy >= 90) {
        resultIcon.textContent = '🏆';
        resultTitle.textContent = '완벽해요!';
    } else if (accuracy >= 70) {
        resultIcon.textContent = '🎉';
        resultTitle.textContent = '훌륭해요!';
    } else if (accuracy >= 50) {
        resultIcon.textContent = '💪';
        resultTitle.textContent = '잘하고 있어요!';
    } else {
        resultIcon.textContent = '📚';
        resultTitle.textContent = '화이팅!';
    }

    // Generate detailed feedback
    generateDetailedFeedback();
}

function generateDetailedFeedback() {
    const feedbackEl = document.getElementById('detailed-feedback');
    if (!feedbackEl) return;

    const analysis = analyzePerformance();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;

    let feedbackHTML = '<div class="feedback-analysis" id="feedback-capture-area">';

    // Header with capture button
    feedbackHTML += `
        <div class="feedback-header">
            <h2>📋 학습 진단 리포트</h2>
            <div class="feedback-meta">
                <span>📅 ${dateStr}</span>
                <span>📝 ${state.sentences.length}문장</span>
            </div>
            <button class="capture-btn" onclick="captureResults()">
                <span>📸</span> 결과 캡쳐
            </button>
        </div>
    `;

    // Overall Diagnosis Banner
    feedbackHTML += `
        <div class="diagnosis-banner ${analysis.accuracy >= 70 ? 'positive' : 'negative'}">
            <div class="diagnosis-text">${analysis.overallDiagnosis}</div>
        </div>
    `;

    // Stats Overview
    feedbackHTML += `
        <div class="feedback-section-block stats-overview">
            <h3>📊 학습 통계</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">정답률</span>
                    <span class="stat-value ${analysis.accuracy >= 80 ? 'good' : analysis.accuracy >= 50 ? 'medium' : 'bad'}">${analysis.accuracy}%</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">평균 시도</span>
                    <span class="stat-value">${analysis.stats.avgAttempts}회</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">힌트/문장</span>
                    <span class="stat-value">${analysis.stats.hintsPerSentence}회</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">평균 소요시간</span>
                    <span class="stat-value">${analysis.stats.avgTimePerItem}초</span>
                </div>
            </div>
        </div>
    `;

    // Stage Analysis
    feedbackHTML += `
        <div class="feedback-section-block">
            <h3>📈 단계별 분석</h3>
            <div class="stage-analysis">
    `;

    for (const stage of state.selectedStages) {
        const stageAcc = stage === 1 ? analysis.stats.stage1Accuracy :
            stage === 2 ? analysis.stats.stage2Accuracy : analysis.stats.stage3Accuracy;
        const stageName = stage === 1 ? '청크 배열 (구/절 단위)' :
            stage === 2 ? '핵심 배열 (S+V+O)' : '완전 배열 (모든 단어)';
        const stageEmoji = stageAcc >= 80 ? '✅' : stageAcc >= 50 ? '⚠️' : '❌';
        const stageClass = stageAcc >= 80 ? 'good' : stageAcc >= 50 ? 'medium' : 'weak';

        feedbackHTML += `
            <div class="stage-result ${stageClass}">
                <div class="stage-header">
                    <span class="stage-label">${stageEmoji} ${stage}단계: ${stageName}</span>
                    <span class="stage-score">${stageAcc}%</span>
                </div>
                <div class="stage-bar">
                    <div class="stage-bar-fill" style="width: ${stageAcc}%"></div>
                </div>
            </div>
        `;
    }

    feedbackHTML += '</div></div>';

    // Strengths (if any)
    if (analysis.strengths && analysis.strengths.length > 0) {
        feedbackHTML += `
            <div class="feedback-section-block strengths-section">
                <h3>💪 강점</h3>
                <div class="strengths-list">
        `;
        for (const strength of analysis.strengths) {
            feedbackHTML += `
                <div class="strength-item">
                    <span class="strength-text">${strength}</span>
                </div>
            `;
        }
        feedbackHTML += '</div></div>';
    }

    // Weaknesses
    if (analysis.weaknesses.length > 0) {
        feedbackHTML += `
            <div class="feedback-section-block">
                <h3>🔍 개선이 필요한 부분</h3>
                <div class="weakness-list">
        `;
        for (const weakness of analysis.weaknesses) {
            feedbackHTML += `
                <div class="weakness-item">
                    <span class="weakness-text">${weakness}</span>
                </div>
            `;
        }
        feedbackHTML += '</div></div>';
    }

    // Grammar Issues (Detailed Tutorial)
    if (analysis.grammarIssues && analysis.grammarIssues.length > 0) {
        feedbackHTML += `
            <div class="feedback-section-block grammar-section">
                <h3>📚 문법 포인트 (과외 선생님 설명)</h3>
        `;

        for (const issue of analysis.grammarIssues) {
            feedbackHTML += `
                <div class="grammar-issue-card">
                    <div class="grammar-category">${issue.category}</div>
                    <div class="grammar-issue">${issue.issue}</div>
            `;

            if (issue.examples && issue.examples.length > 0) {
                feedbackHTML += `<div class="grammar-examples"><strong>📝 예시:</strong><ul>`;
                for (const ex of issue.examples) {
                    feedbackHTML += `<li>${ex}</li>`;
                }
                feedbackHTML += `</ul></div>`;
            }

            if (issue.tips && issue.tips.length > 0) {
                feedbackHTML += `<div class="grammar-tips"><strong>💡 Tip:</strong><ul>`;
                for (const tip of issue.tips) {
                    feedbackHTML += `<li>${tip}</li>`;
                }
                feedbackHTML += `</ul></div>`;
            }

            feedbackHTML += `</div>`;
        }

        feedbackHTML += '</div>';
    }

    // Difficult Sentences
    if (analysis.difficultSentences.length > 0) {
        feedbackHTML += `
            <div class="feedback-section-block">
                <h3>📝 다시 연습이 필요한 문장</h3>
                <div class="difficult-sentences">
        `;

        for (const sent of analysis.difficultSentences) {
            feedbackHTML += `
                <div class="difficult-sentence">
                    <div class="diff-header">
                        <span class="diff-num">${sent.index + 1}</span>
                        <span class="diff-reason">${sent.reason}</span>
                    </div>
                    <div class="diff-text">${sent.sentence}</div>
                    <div class="diff-analysis">💡 ${sent.analysis}</div>
                </div>
            `;
        }

        feedbackHTML += '</div></div>';
    }

    // ========================================
    // Wrong Answer Comparison Section (NEW!)
    // ========================================
    const wrongResults = state.results.filter(r => !r.correct || (r.errors && r.errors.length > 0));
    if (wrongResults.length > 0) {
        feedbackHTML += `
            <div class="feedback-section-block wrong-answers-section">
                <h3>❌ 오답 비교 - 내가 틀린 부분</h3>
                <div class="wrong-answers-list">
        `;

        // Group errors by sentence
        const sentenceErrors = {};
        for (const result of wrongResults) {
            const key = result.sentence;
            if (!sentenceErrors[key]) {
                sentenceErrors[key] = {
                    sentence: result.sentence,
                    stage: result.stage,
                    attempts: result.attempts,
                    errors: [],
                    skipped: result.skipped || false,
                    studentAnswer: result.studentAnswer || ''
                };
            }
            if (result.errors && result.errors.length > 0) {
                sentenceErrors[key].errors.push(...result.errors);
            }
        }

        for (const key of Object.keys(sentenceErrors)) {
            const item = sentenceErrors[key];
            const stageLabel = item.stage === 1 ? '1단계(청크)' : item.stage === 2 ? '2단계(핵심)' : '3단계(완전)';
            const skippedBadge = item.skipped ? ' <span class="skipped-badge">SKIP</span>' : '';

            // Build error detail: show wrong positions
            let errorDetailHtml = '';
            if (item.errors.length > 0) {
                // Deduplicate errors and show unique wrong placements
                const uniqueErrors = [];
                const seen = new Set();
                for (const err of item.errors) {
                    const key = `${err.position}-${err.placed}-${err.expected}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueErrors.push(err);
                    }
                }

                errorDetailHtml = '<div class="error-words">';
                for (const err of uniqueErrors) {
                    errorDetailHtml += `
                        <div class="error-word-pair">
                            <span class="error-placed">${err.placed}</span>
                            <span class="error-arrow">→</span>
                            <span class="error-expected">${err.expected}</span>
                        </div>
                    `;
                }
                errorDetailHtml += '</div>';
            }

            feedbackHTML += `
                <div class="wrong-answer-item">
                    <div class="wrong-header">
                        <span class="wrong-stage">${stageLabel}${skippedBadge}</span>
                        <span class="wrong-attempts">${item.attempts}회 시도</span>
                    </div>
                    <div class="wrong-correct">✅ 정답: ${item.sentence}</div>
                    ${item.studentAnswer ? `<div class="wrong-student">❌ 학생 답: ${item.studentAnswer}</div>` : ''}
                    ${errorDetailHtml}
                </div>
            `;
        }

        feedbackHTML += '</div></div>';
    }

    // Recommendations
    feedbackHTML += `
        <div class="feedback-section-block recommendations-section">
            <h3>🎯 맞춤 학습 조언</h3>
            <div class="recommendation-list">
    `;

    for (const rec of analysis.recommendations) {
        feedbackHTML += `
            <div class="recommendation-item">
                <span class="rec-text">${rec}</span>
            </div>
        `;
    }

    feedbackHTML += '</div></div>';

    // Footer
    feedbackHTML += `
        <div class="feedback-footer">
            <p>🧹 Sweep v2.0 | Made with ❤️ by Wonsummer Studio</p>
        </div>
    `;

    feedbackHTML += '</div>';

    feedbackEl.innerHTML = feedbackHTML;
}

// Screenshot capture function
function captureResults() {
    const resultScreen = document.getElementById('result-screen');
    if (!resultScreen) return;

    const analysis = analyzePerformance();
    const now = new Date();
    const dateStr = now.getFullYear() + '.' + (now.getMonth() + 1).toString().padStart(2, '0') + '.' + now.getDate().toString().padStart(2, '0') + ' ' + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const totalItems = state.sentences.length * state.selectedStages.length;
    const totalHints = state.results.reduce(function (sum, r) { return sum + (r.hintsUsed || 0); }, 0);

    var report = '';
    report += '\u{1F4CB} Sweep \uD559\uC2B5 \uC9C4\uB2E8 \uB9AC\uD3EC\uD2B8\n';
    report += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
    report += '\u{1F4C5} ' + dateStr + '\n';
    report += '\u{1F4DD} \uBB38\uC7A5: ' + state.sentences.length + '\uAC1C | \uB2E8\uACC4: ' + state.selectedStages.join(', ') + '\uB2E8\uACC4\n\n';

    report += '\u{1F4CA} \uD559\uC2B5 \uD1B5\uACC4\n';
    report += '\u2022 \uC815\uB2F5\uB960: ' + analysis.accuracy + '%\n';
    report += '\u2022 \uC815\uB2F5: ' + state.correctCount + ' / ' + totalItems + '\n';
    report += '\u2022 \uD3C9\uADE0 \uC2DC\uB3C4: ' + analysis.stats.avgAttempts + '\uD68C\n';
    report += '\u2022 \uCD1D \uD78C\uD2B8: ' + totalHints + '\uD68C\n';
    report += '\u2022 \uD3C9\uADE0 \uC18C\uC694\uC2DC\uAC04: ' + analysis.stats.avgTimePerItem + '\uCD08/\uBB38\uD56D\n\n';

    report += analysis.overallDiagnosis + '\n\n';

    report += '\u{1F4C8} \uB2E8\uACC4\uBCC4 \uBD84\uC11D\n';
    for (var si = 0; si < state.selectedStages.length; si++) {
        var stage = state.selectedStages[si];
        var stageAcc = stage === 1 ? analysis.stats.stage1Accuracy :
            stage === 2 ? analysis.stats.stage2Accuracy : analysis.stats.stage3Accuracy;
        var stageName = stage === 1 ? '\uCCAD\uD06C \uBC30\uC5F4' : stage === 2 ? '\uD575\uC2EC \uBC30\uC5F4' : '\uC644\uC804 \uBC30\uC5F4';
        var emoji = stageAcc >= 80 ? '\u2705' : stageAcc >= 50 ? '\u26A0\uFE0F' : '\u274C';
        report += emoji + ' ' + stage + '\uB2E8\uACC4(' + stageName + '): ' + Math.round(stageAcc) + '%\n';
    }
    report += '\n';

    if (analysis.strengths && analysis.strengths.length > 0) {
        report += '\u{1F4AA} \uAC15\uC810\n';
        for (var i = 0; i < analysis.strengths.length; i++) {
            report += '\u2022 ' + analysis.strengths[i].replace(/<[^>]*>/g, '') + '\n';
        }
        report += '\n';
    }

    if (analysis.weaknesses.length > 0) {
        report += '\u26A0\uFE0F \uAC1C\uC120 \uD544\uC694\n';
        for (var i = 0; i < analysis.weaknesses.length; i++) {
            report += '\u2022 ' + analysis.weaknesses[i].replace(/<[^>]*>/g, '') + '\n';
        }
        report += '\n';
    }

    // Wrong Answers
    var wrongResults = state.results.filter(function (r) {
        return !r.correct || (r.errors && r.errors.length > 0);
    });
    if (wrongResults.length > 0) {
        report += '\u274C \uC624\uB2F5 \uBE44\uAD50 - \uD2C0\uB9B0 \uBD80\uBD84\n';
        report += '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n';

        var sentenceErrors = {};
        for (var wi = 0; wi < wrongResults.length; wi++) {
            var result = wrongResults[wi];
            var key = result.sentence;
            if (!sentenceErrors[key]) {
                sentenceErrors[key] = {
                    sentence: result.sentence,
                    stage: result.stage,
                    attempts: result.attempts,
                    errors: [],
                    skipped: result.skipped || false,
                    studentAnswer: result.studentAnswer || ''
                };
            }
            if (result.errors && result.errors.length > 0) {
                sentenceErrors[key].errors = sentenceErrors[key].errors.concat(result.errors);
            }
        }

        var seKeys = Object.keys(sentenceErrors);
        for (var ki = 0; ki < seKeys.length; ki++) {
            var item = sentenceErrors[seKeys[ki]];
            var stageLabel = item.stage === 1 ? '1\uB2E8\uACC4' : item.stage === 2 ? '2\uB2E8\uACC4' : '3\uB2E8\uACC4';
            var skipText = item.skipped ? ' [SKIP]' : '';
            report += '\n[' + stageLabel + '] ' + item.attempts + '\uD68C \uC2DC\uB3C4' + skipText + '\n';
            report += '\u2705 \uC815\uB2F5: ' + item.sentence + '\n';
            if (item.studentAnswer) {
                report += '\u274C \uD559\uC0DD \uB2F5: ' + item.studentAnswer + '\n';
            }

            if (item.errors.length > 0) {
                var uniqueErrors = [];
                var seen = {};
                for (var ei = 0; ei < item.errors.length; ei++) {
                    var err = item.errors[ei];
                    var ekey = err.position + '-' + err.placed + '-' + err.expected;
                    if (!seen[ekey]) {
                        seen[ekey] = true;
                        uniqueErrors.push(err);
                    }
                }
                var errorPairs = uniqueErrors.map(function (e) {
                    return e.placed + ' \u2192 ' + e.expected;
                }).join(', ');
                report += '\u274C \uD2C0\uB9B0 \uBD80\uBD84: ' + errorPairs + '\n';
            }
        }
        report += '\n';
    }

    // Difficult Sentences
    if (analysis.difficultSentences && analysis.difficultSentences.length > 0) {
        report += '\u{1F4DD} \uC5B4\uB824\uC6E0\uB358 \uBB38\uC7A5\n';
        for (var di = 0; di < analysis.difficultSentences.length; di++) {
            var ds = analysis.difficultSentences[di];
            report += '\u2022 ' + ds.sentence + '\n  \u2192 ' + ds.reason + '\n';
        }
        report += '\n';
    }

    // Recommendations
    report += '\u{1F3AF} \uB9DE\uCDA4 \uD559\uC2B5 \uC870\uC5B8\n';
    for (var ri = 0; ri < analysis.recommendations.length; ri++) {
        report += '\u2022 ' + analysis.recommendations[ri].replace(/<[^>]*>/g, '') + '\n';
    }

    report += '\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
    report += '\u{1F9F9} Sweep v2.0 | Made with \u2764\uFE0F\n';

    navigator.clipboard.writeText(report).then(function () {
        alert('\u2705 \uACB0\uACFC \uB9AC\uD3EC\uD2B8\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!\n\n\uCE74\uD1A1\uC774\uB098 \uBA54\uBAA8\uC7A5\uC5D0 \uBD99\uC5EC\uB123\uAE30 \uD558\uC138\uC694!');
    }).catch(function () {
        var textArea = document.createElement('textarea');
        textArea.value = report;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('\u2705 \uACB0\uACFC \uB9AC\uD3EC\uD2B8\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!');
    });
}

function analyzePerformance() {

    let report = `📋 Sweep 학습 진단 리포트\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📅 ${dateStr}\n`;
    report += `📝 문장: ${state.sentences.length}개 | 단계: ${state.selectedStages.join(', ')}단계\n\n`;

    report += `📊 결과\n`;
    report += `정답률: ${analysis.accuracy}%\n`;
    report += `평균 시도: ${analysis.stats.avgAttempts}회\n`;
    report += `힌트 사용: ${analysis.stats.hintsPerSentence}회/문장\n\n`;

    report += `${analysis.overallDiagnosis}\n\n`;

    if (analysis.weaknesses.length > 0) {
        report += `⚠️ 개선 필요\n`;
        analysis.weaknesses.forEach(w => report += `• ${w}\n`);
        report += `\n`;
    }

    if (analysis.strengths && analysis.strengths.length > 0) {
        report += `💪 강점\n`;
        analysis.strengths.forEach(s => report += `• ${s}\n`);
        report += `\n`;
    }

    report += `🎯 학습 조언\n`;
    analysis.recommendations.forEach(r => report += `• ${r}\n`);

    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `🧹 Sweep v2.0\n`;

    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
        alert('✅ 결과 리포트가 복사되었습니다!\n\n카톡이나 메모장에 붙여넣기 하세요!');
    }).catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = report;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('✅ 결과 리포트가 복사되었습니다!');
    });
}

function analyzePerformance() {
    const totalStages = state.sentences.length * state.selectedStages.length;
    const accuracy = totalStages > 0 ? Math.round((state.correctCount / totalStages) * 100) : 0;

    const weaknesses = [];
    const recommendations = [];
    const difficultSentences = [];
    const grammarIssues = [];
    const strengths = [];

    // Analyze by stage
    const stage1Results = state.results.filter(r => r.stage === 1);
    const stage2Results = state.results.filter(r => r.stage === 2);
    const stage3Results = state.results.filter(r => r.stage === 3);

    const stage1Accuracy = stage1Results.length > 0
        ? (stage1Results.filter(r => r.correct).length / stage1Results.length) * 100 : 100;
    const stage2Accuracy = stage2Results.length > 0
        ? (stage2Results.filter(r => r.correct).length / stage2Results.length) * 100 : 100;
    const stage3Accuracy = stage3Results.length > 0
        ? (stage3Results.filter(r => r.correct).length / stage3Results.length) * 100 : 100;

    // Calculate detailed metrics
    const totalTime = state.results.reduce((sum, r) => sum + (r.time || 0), 0);
    const avgTimePerItem = state.results.length > 0 ? (totalTime / state.results.length).toFixed(1) : 0;
    const avgAttempts = state.results.length > 0
        ? (state.results.reduce((sum, r) => sum + r.attempts, 0) / state.results.length).toFixed(1) : 1;
    const hintsPerSentence = state.sentences.length > 0
        ? (state.hintsUsed / state.sentences.length).toFixed(1) : 0;

    // ==========================================
    // DETAILED STAGE ANALYSIS
    // ==========================================

    // Stage 1: Chunking ability (의미 단위 파악)
    if (state.selectedStages.includes(1)) {
        if (stage1Accuracy >= 90) {
            strengths.push('✨ 문장을 큰 의미 단위(구/절)로 파악하는 능력이 뛰어납니다!');
        } else if (stage1Accuracy < 70) {
            weaknesses.push('🔴 [청크 인식 부족] 문장을 의미 단위로 묶어서 보는 능력이 부족합니다.');
            grammarIssues.push({
                category: '구/절 인식',
                issue: '영어 문장을 작은 의미 덩어리로 나누어 보는 연습이 필요해요.',
                examples: [
                    '주어부: The tall boy / 동사부: is playing / 장소: in the park',
                    '시간: Yesterday / 주어: I / 동사: went / 장소: to school'
                ],
                tips: [
                    '문장을 읽을 때 "누가 / 무엇을 한다 / 어디서 / 언제" 로 나눠보세요',
                    '전치사(in, on, at, for, with)가 나오면 새로운 덩어리가 시작된다고 생각하세요',
                    '접속사(that, which, who, when, because)도 구분점이 됩니다'
                ]
            });
        } else if (stage1Accuracy < 90) {
            weaknesses.push('🟡 [청크 인식 보통] 의미 단위 파악이 조금 불안정합니다.');
        }
    }

    // Stage 2: Core structure (핵심 어순)
    if (state.selectedStages.includes(2)) {
        if (stage2Accuracy >= 90) {
            strengths.push('✨ 영어의 기본 어순(주어-동사-목적어)을 잘 이해하고 있습니다!');
        } else if (stage2Accuracy < 70) {
            weaknesses.push('🔴 [기본 어순 혼란] 영어의 핵심 구조 S+V+O를 헷갈려합니다.');
            grammarIssues.push({
                category: '기본 어순 (SVO)',
                issue: '영어는 "주어 + 동사 + 목적어" 순서가 철칙입니다!',
                examples: [
                    '한국어: 나는 사과를 먹는다 → 영어: I eat an apple',
                    '한국어: 그녀가 책을 읽었다 → 영어: She read a book',
                    '⚠️ 한국어는 SOV, 영어는 SVO!'
                ],
                tips: [
                    '항상 "누가(S) + 한다(V) + 무엇을(O)" 순서를 먼저 떠올리세요',
                    '동사를 찾으면 그 앞이 주어, 뒤가 목적어입니다',
                    '한국어 어순 그대로 영작하면 안 됩니다!'
                ]
            });
        } else if (stage2Accuracy < 90) {
            weaknesses.push('🟡 [기본 어순 불안정] 때때로 어순이 헷갈리는 것 같습니다.');
        }
    }

    // Stage 3: Full arrangement (세부 배열)
    if (state.selectedStages.includes(3)) {
        if (stage3Accuracy >= 90) {
            strengths.push('✨ 세부 단어 배열 능력이 훌륭합니다! 관사, 전치사 위치를 잘 압니다!');
        } else if (stage3Accuracy < 70) {
            weaknesses.push('🔴 [세부 배열 약함] 관사, 전치사, 수식어 위치에서 많이 틀립니다.');
            grammarIssues.push({
                category: '관사 & 수식어 위치',
                issue: '영어는 수식어가 명사 앞에 옵니다!',
                examples: [
                    '관사+형용사+명사: a beautiful flower (O) / flower beautiful a (X)',
                    '소유격+형용사+명사: my old car (O)',
                    '부사+형용사: very important (O)'
                ],
                tips: [
                    '명사 앞에는 항상 관사(a/an/the)가 먼저!',
                    '형용사는 명사 바로 앞에!',
                    '부사는 형용사/동사 앞뒤에 유연하게!'
                ]
            });
            grammarIssues.push({
                category: '전치사구 위치',
                issue: '전치사구(in the park, on the table 등)는 보통 문장 끝에!',
                examples: [
                    'I study English in my room. (O)',
                    'She lives in Seoul with her family. (O)',
                    '전치사구가 여러 개면 "장소 → 시간" 순서'
                ],
                tips: [
                    '전치사구는 문장 마지막에 배치하세요',
                    '장소 먼저, 시간 나중: at school yesterday (O)'
                ]
            });
        } else if (stage3Accuracy < 90) {
            weaknesses.push('🟡 [세부 배열 보통] 가끔 관사나 전치사 위치를 틀립니다.');
        }
    }

    // ==========================================
    // LEARNING BEHAVIOR ANALYSIS
    // ==========================================

    // Hint dependency check
    if (hintsPerSentence > 2) {
        weaknesses.push('🔴 [힌트 의존도 높음] 문장당 평균 ' + hintsPerSentence + '회 힌트 사용');
        grammarIssues.push({
            category: '학습 습관',
            issue: '힌트에 너무 의존하고 있어요. 스스로 생각하는 시간이 필요합니다.',
            examples: [],
            tips: [
                '처음 30초는 힌트 없이 스스로 고민해보세요',
                '틀려도 괜찮아요! 틀리면서 배우는 겁니다',
                '힌트를 보기 전에 "이게 맞을까?" 한번 더 생각해보세요'
            ]
        });
    } else if (hintsPerSentence < 0.5 && accuracy >= 80) {
        strengths.push('✨ 힌트 없이도 잘 해결했어요! 자기주도 학습 능력이 좋습니다!');
    }

    // Multiple attempts analysis
    if (avgAttempts > 2.5) {
        weaknesses.push('🔴 [반복 시도 많음] 평균 ' + avgAttempts + '회 시도');
        grammarIssues.push({
            category: '문제 해결 방식',
            issue: '찍기식으로 여러 번 시도하는 경향이 있어요.',
            examples: [],
            tips: [
                '배열하기 전에 전체 문장의 뜻을 먼저 파악하세요',
                '"주어-동사-목적어-부사구" 틀을 먼저 머릿속에 그려보세요',
                '급하게 시작하지 말고, 2-3초 생각한 후 시작하세요'
            ]
        });
    } else if (avgAttempts <= 1.2 && accuracy >= 80) {
        strengths.push('✨ 거의 한 번에 정답! 영어 어순 감각이 좋습니다!');
    }

    // Time analysis
    if (avgTimePerItem > 45 && accuracy < 70) {
        weaknesses.push('🟡 [시간 소요 많음] 오래 고민해도 정답률이 낮아요.');
        recommendations.push('기본 어순 규칙을 더 확실히 외우고, 패턴으로 익히세요.');
    } else if (avgTimePerItem < 15 && accuracy >= 85) {
        strengths.push('✨ 빠르고 정확해요! 영어 어순이 자동화되어 있습니다!');
    }

    // ==========================================
    // DIFFICULT SENTENCES ANALYSIS
    // ==========================================
    const sentenceStats = {};
    state.results.forEach(r => {
        if (!sentenceStats[r.sentence]) {
            sentenceStats[r.sentence] = {
                attempts: 0,
                hints: 0,
                errors: [],
                stages: []
            };
        }
        sentenceStats[r.sentence].attempts += r.attempts;
        sentenceStats[r.sentence].hints += r.hintsUsed;
        sentenceStats[r.sentence].stages.push(r.stage);
        if (r.errors) {
            sentenceStats[r.sentence].errors.push(...r.errors);
        }
    });

    state.sentences.forEach((sent, index) => {
        const stats = sentenceStats[sent.english];
        if (stats && (stats.attempts > 3 || stats.hints > 2)) {
            let reasons = [];
            let analysis = '';

            if (stats.attempts > 3) reasons.push(`${stats.attempts}회 시도`);
            if (stats.hints > 2) reasons.push(`힌트 ${stats.hints}회`);

            // Analyze what made it difficult
            const words = sent.english.split(' ');
            if (words.length > 10) {
                analysis = '긴 문장 - 청킹 연습 필요';
            } else if (sent.english.includes(' that ') || sent.english.includes(' which ')) {
                analysis = '관계사절 포함 - 절 구분 연습 필요';
            } else if (sent.english.includes(' to ')) {
                analysis = 'to부정사 포함 - to+동사 덩어리 인식 필요';
            } else if (/\b(has|have|had)\s+been\b/.test(sent.english)) {
                analysis = '완료시제 - 시제 표현 순서 학습 필요';
            } else {
                analysis = '기본 어순 재확인 필요';
            }

            difficultSentences.push({
                index: index,
                sentence: sent.english,
                reason: reasons.join(', '),
                analysis: analysis
            });
        }
    });

    // ==========================================
    // PERSONALIZED RECOMMENDATIONS
    // ==========================================

    if (accuracy >= 90) {
        recommendations.push('🎯 [다음 단계] 더 긴 문장, 복잡한 구조의 문장에 도전해보세요!');
        recommendations.push('⏱️ [속도 향상] 타이머를 더 짧게 설정해서 순발력도 키워보세요!');
        recommendations.push('📝 [심화] 관계사절, 분사구문이 포함된 문장으로 레벨업!');
    } else if (accuracy >= 70) {
        recommendations.push('📚 [복습] 틀린 문장들만 모아서 다시 연습해보세요.');
        recommendations.push('🔄 [반복] 같은 문장을 3일 연속 복습하면 장기기억이 됩니다.');
        recommendations.push('✍️ [능동 학습] 직접 비슷한 문장을 만들어보는 것도 좋아요.');
    } else if (accuracy >= 50) {
        recommendations.push('📖 [기초] 기본 5형식(SV, SVC, SVO, SVOO, SVOC)을 다시 공부하세요.');
        recommendations.push('🧩 [단계적 접근] 1단계(청크)부터 확실히 마스터한 후 넘어가세요.');
        recommendations.push('👀 [예문 노출] 올바른 영어 문장을 많이 읽어서 어순 감각을 키우세요.');
    } else {
        recommendations.push('🆘 [기초부터] 영어 기본 어순 SVO를 완전히 이해하는 것이 먼저입니다.');
        recommendations.push('📝 [천천히] 1단계만 선택해서 청크 배열부터 완벽히 해보세요.');
        recommendations.push('🤝 [도움 요청] 선생님께 기초 어순 설명을 다시 들어보세요.');
        recommendations.push('💪 [포기 금지] 처음엔 누구나 어려워요! 꾸준히 하면 반드시 늘어요!');
    }

    // ==========================================
    // OVERALL DIAGNOSIS
    // ==========================================
    let overallDiagnosis = '';
    if (accuracy >= 90) {
        overallDiagnosis = '🏆 영어 어순 마스터 수준! 실전 영작에 도전할 준비가 되었어요!';
    } else if (accuracy >= 70) {
        overallDiagnosis = '👍 기본기는 탄탄해요! 조금만 더 연습하면 완벽해질 거예요!';
    } else if (accuracy >= 50) {
        overallDiagnosis = '📈 영어 어순의 기초를 다지는 중이에요. 꾸준히 연습하면 금방 늘어요!';
    } else {
        overallDiagnosis = '🌱 아직 영어 어순이 낯설어요. 기초부터 차근차근 해봐요!';
    }

    return {
        accuracy,
        weaknesses,
        strengths,
        recommendations,
        difficultSentences,
        grammarIssues,
        overallDiagnosis,
        stats: {
            totalTime,
            avgTimePerItem,
            avgAttempts,
            hintsPerSentence,
            stage1Accuracy: Math.round(stage1Accuracy),
            stage2Accuracy: Math.round(stage2Accuracy),
            stage3Accuracy: Math.round(stage3Accuracy)
        }
    };
}

function restartLearning() {
    state.currentSentenceIndex = 0;
    state.currentStage = state.selectedStages[0];
    state.correctCount = 0;
    state.totalAttempts = 0;
    state.wrongAttempts = 0;
    state.hintsUsed = 0;
    state.results = [];
    currentAttempts = 0;
    currentErrors = [];
    lastWrongSentence = '';

    showLearning();
    loadCurrentSentence();

    if (state.timerEnabled) {
        startTimer();
    }
}

// ==========================================
// Utility Functions
// ==========================================
function resetState() {
    state.currentSentenceIndex = 0;
    state.currentStage = 1;
    state.correctCount = 0;
    state.totalAttempts = 0;
    state.wrongAttempts = 0;
    state.hintsUsed = 0;
    state.isSessionActive = false;
    state.results = [];
    currentAttempts = 0;
    currentErrors = [];
    lastWrongSentence = '';
}

// Add shake animation CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkUrlParams()) {
        showModeSelect();
    }

    // Keyboard shortcuts for learning mode
    document.addEventListener('keydown', (e) => {
        if (!state.isSessionActive) return;
        const learningScreen = document.getElementById('student-learning');
        if (!learningScreen || !learningScreen.classList.contains('active')) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            checkAnswer();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            resetAllBlocks();
        }
    });

    // Progress mode description toggle
    document.querySelectorAll('input[name="progress-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const desc = document.getElementById('progress-desc');
            if (desc) {
                const isCycle = document.getElementById('progress-cycle')?.checked;
                desc.innerHTML = isCycle
                    ? '<small>🔄 모든 문장 1단계 → 모든 문장 2단계 → 모든 문장 3단계</small>'
                    : '<small>🎯 한 문장을 1→2→3단계 모두 완료 후 다음 문장</small>';
            }
        });
    });
});
