const GRID_SIZE = 4;
const TOTAL_SLOTS = GRID_SIZE * GRID_SIZE;
let score = 0;

// Levels: 0 to 4 (5 levels)
const MAX_LEVEL = 4;
const LEVEL_SCORES = [10, 50, 150, 500, 2000];

const gridElement = document.getElementById('grid');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const spawnBtn = document.getElementById('spawn-btn');
const particleContainer = document.getElementById('particle-container');

// Modal Elements
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreDisplay = document.getElementById('final-score-display');
const restartBtn = document.getElementById('restart-btn');

let highScore = parseInt(localStorage.getItem('mergeGardenHighScore') || '0');
highScoreElement.textContent = highScore;

// State: array of objects or null
let gridState = new Array(TOTAL_SLOTS).fill(null);

let draggedItem = null;
let draggedFromIndex = null;

// --- Audio System ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playSound(type) {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'merge') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'ultimate') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(2000, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

function initGame() {
    score = 0;
    gridState = new Array(TOTAL_SLOTS).fill(null);
    gameOverModal.classList.add('hidden');
    gridElement.innerHTML = '';
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.classList.add('grid-slot');
        slot.dataset.index = i;
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragenter', handleDragEnter);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
        
        gridElement.appendChild(slot);
    }
    
    // Spawn initial items
    spawnItem();
    spawnItem();
    spawnItem();
}

function spawnItem() {
    const emptySlots = [];
    gridState.forEach((item, index) => {
        if (!item) emptySlots.push(index);
    });
    
    if (emptySlots.length === 0) return; // Grid full
    
    const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    createItem(randomSlot, 0);
    playSound('pop');
    checkGameOver();
}

function createItem(slotIndex, level, isMerge = false) {
    gridState[slotIndex] = { level };
    renderGrid();
    
    const slotElement = gridElement.children[slotIndex];
    const itemElement = slotElement.querySelector('.item');
    if (itemElement) {
        itemElement.classList.add('new-item');
    }

    if (isMerge) {
        createParticles(slotElement);
    }
}

function renderGrid() {
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = gridElement.children[i];
        slot.innerHTML = '';
        
        const itemData = gridState[i];
        if (itemData) {
            const itemElement = document.createElement('div');
            itemElement.classList.add('item', `level-${itemData.level}`);
            itemElement.draggable = true;
            itemElement.dataset.index = i;
            
            itemElement.addEventListener('dragstart', handleDragStart);
            itemElement.addEventListener('dragend', handleDragEnd);
            
            // For mobile touch (simple implementation)
            itemElement.addEventListener('touchstart', handleTouchStart, {passive: false});
            itemElement.addEventListener('touchmove', handleTouchMove, {passive: false});
            itemElement.addEventListener('touchend', handleTouchEnd);
            
            slot.appendChild(itemElement);
        }
    }
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('mergeGardenHighScore', highScore);
    }
}

// --- Game Over Logic ---
function checkGameOver() {
    const emptySlots = gridState.filter(item => item === null);
    if (emptySlots.length > 0) return;

    // Grid is full, check for possible merges
    let canMerge = false;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const item = gridState[i];
        if (!item) continue;

        // Check right
        if (i % GRID_SIZE !== GRID_SIZE - 1) {
            const rightItem = gridState[i + 1];
            if (rightItem && rightItem.level === item.level) canMerge = true;
        }
        // Check down
        if (Math.floor(i / GRID_SIZE) !== GRID_SIZE - 1) {
            const downItem = gridState[i + GRID_SIZE];
            if (downItem && downItem.level === item.level) canMerge = true;
        }
    }

    if (!canMerge) {
        finalScoreDisplay.textContent = score;
        gameOverModal.classList.remove('hidden');
    }
}

// --- Drag & Drop Desktop ---
function handleDragStart(e) {
    draggedItem = gridState[e.target.dataset.index];
    draggedFromIndex = parseInt(e.target.dataset.index);
    setTimeout(() => e.target.style.opacity = '0.5', 0);
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedItem = null;
    draggedFromIndex = null;
    
    // Clear drag-over classes
    document.querySelectorAll('.grid-slot').forEach(s => s.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    if (e.target.classList.contains('grid-slot')) {
        e.target.classList.add('drag-over');
    } else if (e.target.parentElement.classList.contains('grid-slot')) {
        e.target.parentElement.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('grid-slot')) {
        e.target.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    let targetSlot = e.target;
    if (!targetSlot.classList.contains('grid-slot')) {
        targetSlot = targetSlot.parentElement;
    }
    
    targetSlot.classList.remove('drag-over');
    
    if (draggedFromIndex === null) return;
    
    const targetIndex = parseInt(targetSlot.dataset.index);
    if (targetIndex === draggedFromIndex) return;
    
    processMoveOrMerge(draggedFromIndex, targetIndex);
}

// --- Touch Logic ---
let touchTargetIndex = null;

function handleTouchStart(e) {
    const touch = e.touches[0];
    draggedFromIndex = parseInt(e.target.dataset.index);
    draggedItem = gridState[draggedFromIndex];
    e.target.style.opacity = '0.5';
    e.target.style.position = 'absolute';
    e.target.style.zIndex = 100;
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    e.target.style.left = touch.pageX - 32 + 'px';
    e.target.style.top = touch.pageY - 32 + 'px';
    
    // Find element under touch
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elemBelow) return;
    
    let slot = elemBelow.closest('.grid-slot');
    if (slot) {
        document.querySelectorAll('.grid-slot').forEach(s => s.classList.remove('drag-over'));
        slot.classList.add('drag-over');
        touchTargetIndex = parseInt(slot.dataset.index);
    } else {
        touchTargetIndex = null;
    }
}

function handleTouchEnd(e) {
    e.target.style.opacity = '1';
    e.target.style.position = '';
    e.target.style.zIndex = '';
    e.target.style.left = '';
    e.target.style.top = '';
    
    document.querySelectorAll('.grid-slot').forEach(s => s.classList.remove('drag-over'));

    if (touchTargetIndex !== null && touchTargetIndex !== draggedFromIndex) {
        processMoveOrMerge(draggedFromIndex, touchTargetIndex);
    } else {
        renderGrid(); // Reset position if dropped in invalid area
    }
    
    draggedItem = null;
    draggedFromIndex = null;
    touchTargetIndex = null;
}

function processMoveOrMerge(fromIdx, toIdx) {
    const itemToMove = gridState[fromIdx];
    const itemAtTarget = gridState[toIdx];
    
    if (!itemAtTarget) {
        // Move
        gridState[toIdx] = itemToMove;
        gridState[fromIdx] = null;
        playSound('pop');
        renderGrid();
        checkGameOver();
    } else if (itemAtTarget.level === itemToMove.level) {
        // Merge
        if (itemToMove.level === MAX_LEVEL) {
            // Ultimate Merge
            gridState[fromIdx] = null;
            gridState[toIdx] = null; // Remove both
            score += 10000;
            playSound('ultimate');
            createParticles(gridElement.children[toIdx], true); // Big explosion
            renderGrid();
        } else {
            // Normal Merge
            gridState[fromIdx] = null;
            const newLevel = itemToMove.level + 1;
            score += LEVEL_SCORES[newLevel];
            playSound('merge');
            createItem(toIdx, newLevel, true);
        }
        checkGameOver();
    } else {
        // Swap or invalid
        renderGrid();
    }
}

function createParticles(element, isUltimate = false) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const count = isUltimate ? 30 : 12;
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const distance = (isUltimate ? 60 : 30) + Math.random() * (isUltimate ? 80 : 40);
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--translate-end', `translate(${tx}px, ${ty}px)`);
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        
        if (isUltimate) {
             particle.style.transform = 'scale(1.5)';
             particle.style.boxShadow = '0 0 10px #fcd34d';
        }
        
        // Random color based on theme
        const colors = ['#10b981', '#3b82f6', '#fcd34d', '#ffffff'];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        particleContainer.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 600);
    }
}

spawnBtn.addEventListener('click', spawnItem);
restartBtn.addEventListener('click', initGame);

initGame();
