/* ===== TodoApp - Main Logic ===== */

const STORAGE_KEY = 'todoapp_tasks';
const THEME_KEY = 'todoapp_theme';

let tasks = [];
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;

/* ===== DOM References ===== */
const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const dueTimeInput = document.getElementById('dueTimeInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const doneCount = document.getElementById('doneCount');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const themeToggle = document.getElementById('themeToggle');
const modalOverlay = document.getElementById('modalOverlay');
const editInput = document.getElementById('editInput');
const editPriority = document.getElementById('editPriority');
const editDueDate = document.getElementById('editDueDate');
const editDueTime = document.getElementById('editDueTime');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const toast = document.getElementById('toast');

/* ===== Storage ===== */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch {
    tasks = [];
  }
}

/* ===== Theme ===== */
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeToggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved === 'dark');
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});

/* ===== Toast ===== */
let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ===== ID Generator ===== */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ===== Add Task ===== */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }

  const task = {
    id: genId(),
    text,
    priority: prioritySelect.value,
    dueDate: dueDateInput.value || null,
    dueTime: dueTimeInput.value || null,
    completed: false,
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  saveTasks();
  taskInput.value = '';
  dueDateInput.value = '';
  dueTimeInput.value = '';
  prioritySelect.value = 'medium';
  render();
  showToast('✅ Task added!');
  taskInput.focus();
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

/* ===== Toggle Complete ===== */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
  showToast(task.completed ? '🎉 Task completed!' : '↩️ Marked as active');
}

/* ===== Delete Task ===== */
function deleteTask(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, 200);
  }
  showToast('🗑 Task deleted');
}

/* ===== Edit Task ===== */
function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  editInput.value = task.text;
  editPriority.value = task.priority;
  editDueDate.value = task.dueDate || '';
  editDueTime.value = task.dueTime || '';
  modalOverlay.classList.add('open');
  setTimeout(() => editInput.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

saveEdit.addEventListener('click', () => {
  if (!editingId) return;
  const text = editInput.value.trim();
  if (!text) return;
  const task = tasks.find(t => t.id === editingId);
  if (task) {
    task.text = text;
    task.priority = editPriority.value;
    task.dueDate = editDueDate.value || null;
    task.dueTime = editDueTime.value || null;
    saveTasks();
    render();
    showToast('✏️ Task updated!');
  }
  closeModal();
});

cancelEdit.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ===== Filter & Search ===== */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.toLowerCase();
  render();
});

/* ===== Clear Actions ===== */
clearCompletedBtn.addEventListener('click', () => {
  const count = tasks.filter(t => t.completed).length;
  if (!count) { showToast('No completed tasks to clear'); return; }
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
  showToast(`🗑 Cleared ${count} completed task${count > 1 ? 's' : ''}`);
});

clearAllBtn.addEventListener('click', () => {
  if (!tasks.length) { showToast('No tasks to clear'); return; }
  if (!confirm('Clear ALL tasks? This cannot be undone.')) return;
  tasks = [];
  saveTasks();
  render();
  showToast('🗑 All tasks cleared');
});

/* ===== Due Date & Time Helpers ===== */
function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / 86400000);
  const timePart = timeStr ? ` at ${formatTime(timeStr)}` : '';

  if (diff < 0) return { label: `Overdue by ${Math.abs(diff)}d${timePart}`, overdue: true };
  if (diff === 0) return { label: `Due today${timePart}`, overdue: false };
  if (diff === 1) return { label: `Due tomorrow${timePart}`, overdue: false };
  return {
    label: `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${timePart}`,
    overdue: false
  };
}

/* ===== Filter Logic ===== */
function getFilteredTasks() {
  return tasks.filter(task => {
    const matchesSearch = !searchQuery || task.text.toLowerCase().includes(searchQuery);
    let matchesFilter = true;
    if (currentFilter === 'active') matchesFilter = !task.completed;
    else if (currentFilter === 'completed') matchesFilter = task.completed;
    else if (currentFilter === 'high') matchesFilter = task.priority === 'high';
    return matchesSearch && matchesFilter;
  });
}

/* ===== Stats ===== */
function updateStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const active = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  totalCount.textContent = total;
  activeCount.textContent = active;
  doneCount.textContent = done;
  progressFill.style.width = pct + '%';
  progressLabel.textContent = pct + '% complete';
}

/* ===== Escape HTML ===== */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== Create Task Element ===== */
function createTaskEl(task) {
  const due = task.dueDate ? formatDate(task.dueDate, task.dueTime) : null;

  // Outer wrapper (holds swipe backgrounds + the card)
  const wrapper = document.createElement('li');
  wrapper.className = 'swipe-wrapper';
  wrapper.dataset.id = task.id;

  wrapper.innerHTML = `
    <div class="swipe-bg done-bg">
      <span class="swipe-bg-icon">✔️</span>
      <span class="swipe-bg-label">Done</span>
    </div>
    <div class="swipe-bg delete-bg">
      <span class="swipe-bg-label">Delete</span>
      <span class="swipe-bg-icon">🗑</span>
    </div>
  `;

  // The actual card
  const li = document.createElement('div');
  li.className = `task-item priority-${task.priority}${task.completed ? ' completed' : ''}`;
  li.draggable = true;
  li.innerHTML = `
    <div class="task-checkbox${task.completed ? ' checked' : ''}"
         role="checkbox"
         aria-checked="${task.completed}"
         tabindex="0"
         data-action="toggle"></div>
    <div class="task-content">
      <span class="task-text">${escapeHtml(task.text)}</span>
      <div class="task-meta">
        <span class="priority-badge ${task.priority}">${task.priority}</span>
        ${due ? `<span class="due-date${due.overdue ? ' overdue' : ''}">📅 ${due.label}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit" data-action="edit" aria-label="Edit task" title="Edit">✏️</button>
      <button class="action-btn delete" data-action="delete" aria-label="Delete task" title="Delete">🗑</button>
    </div>
  `;

  wrapper.appendChild(li);

  // ── Click actions ──
  li.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'toggle') toggleTask(task.id);
    else if (action === 'edit') openEdit(task.id);
    else if (action === 'delete') deleteTask(task.id);
    else if (!e.target.closest('.task-actions')) toggleTask(task.id);
  });

  li.querySelector('.task-checkbox').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTask(task.id); }
  });

  // ── Swipe gesture ──
  attachSwipe(wrapper, li, task.id);

  // ── Drag-to-reorder ──
  attachDrag(wrapper, task.id);

  return wrapper;
}

/* ===== Swipe Logic ===== */
function attachSwipe(wrapper, card, id) {
  const THRESHOLD = 80;
  let startX = 0, startY = 0, currentX = 0, swiping = false, locked = false;

  const doneBg = wrapper.querySelector('.done-bg');
  const deleteBg = wrapper.querySelector('.delete-bg');

  function onStart(x, y) {
    startX = x; startY = y; currentX = 0; swiping = true; locked = false;
    card.style.transition = 'none';
    card.style.touchAction = 'pan-y';
  }

  function onMove(x, y) {
    if (!swiping) return;
    const dx = x - startX;
    const dy = y - startY;
    if (!locked) {
      if (Math.abs(dy) > Math.abs(dx) + 4) { swiping = false; return; }
      if (Math.abs(dx) < 6) return;
      locked = true;
      card.style.touchAction = 'none';
    }
    currentX = dx;
    card.style.transform = `translateX(${currentX}px)`;
    if (currentX > 0) {
      doneBg.style.opacity = Math.min(currentX / THRESHOLD, 1);
      deleteBg.style.opacity = 0;
    } else {
      deleteBg.style.opacity = Math.min(-currentX / THRESHOLD, 1);
      doneBg.style.opacity = 0;
    }
  }

  function onEnd() {
    if (!swiping) return;
    swiping = false;
    locked = false;
    card.style.touchAction = 'pan-y';
    card.style.transition = 'transform 0.3s cubic-bezier(.4,0,.2,1)';
    card.style.transform = 'translateX(0)';
    doneBg.style.opacity = 0;
    deleteBg.style.opacity = 0;
    if (currentX > THRESHOLD) {
      toggleTask(id);
    } else if (currentX < -THRESHOLD) {
      deleteTask(id);
    }
  }

  card.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
    if (locked) e.preventDefault();
  }, { passive: false });

  card.addEventListener('touchend', onEnd);
  card.addEventListener('touchcancel', onEnd);
}

/* ===== Drag-to-Reorder Logic ===== */
let dragSrcId = null;

function attachDrag(wrapper, id) {
  wrapper.addEventListener('dragstart', (e) => {
    dragSrcId = id;
    wrapper.querySelector('.task-item').classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  wrapper.addEventListener('dragend', () => {
    wrapper.querySelector('.task-item')?.classList.remove('dragging');
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
    dragSrcId = null;
  });
}

function initDragList() {
  taskList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.swipe-wrapper');
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
    if (target && target.dataset.id !== dragSrcId) {
      target.querySelector('.task-item')?.classList.add('drag-over');
    }
  });

  taskList.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.swipe-wrapper');
    if (!target || !dragSrcId) return;
    const dstId = target.dataset.id;
    if (dragSrcId === dstId) return;
    const srcIdx = tasks.findIndex(t => t.id === dragSrcId);
    const dstIdx = tasks.findIndex(t => t.id === dstId);
    if (srcIdx === -1 || dstIdx === -1) return;
    const [moved] = tasks.splice(srcIdx, 1);
    tasks.splice(dstIdx, 0, moved);
    saveTasks();
    render();
  });
}

/* ===== Render ===== */
function render() {
  updateStats();
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    filtered.forEach(task => taskList.appendChild(createTaskEl(task)));
  }
}

/* ===== Service Worker ===== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ===== Init ===== */
function init() {
  initTheme();
  loadTasks();
  render();
  initDragList();
}

init();
