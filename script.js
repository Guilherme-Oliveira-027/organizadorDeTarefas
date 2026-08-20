const DB_NAME = 'produtividadeTaskBoard';
const STORE_NAME = 'tasks';

const defaultTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Revisar planejamento semanal',
    category: 'Trabalho',
    status: 'pendente',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    description: 'Organizar prioridades, revisar metas e ajustar foco do grupo.'
  },
  {
    id: crypto.randomUUID(),
    title: 'Estudar JavaScript avançado',
    category: 'Estudo',
    status: 'em andamento',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '18:30',
    description: 'Praticar arrays, funções e lógica de programação com exercícios.'
  },
  {
    id: crypto.randomUUID(),
    title: 'Responder e-mails e pendências',
    category: 'Tarefa',
    status: 'pendente',
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    time: '14:00',
    description: 'Atualizar comunicação com clientes, colegas e acompanhamento de tarefas.'
  }
];

const state = {
  filter: 'all',
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  tasks: []
};

const taskForm = document.querySelector('#taskForm');
const taskList = document.querySelector('#taskList');
const filterButtons = document.querySelectorAll('.filter-btn');
const clockElement = document.querySelector('#clock');
const calendarDays = document.querySelector('#calendarDays');
const monthLabel = document.querySelector('#calMonthLabel');
const prevMonthBtn = document.querySelector('#prevMonthBtn');
const nextMonthBtn = document.querySelector('#nextMonthBtn');

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadTasks() {
  const db = await openDatabase();

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const tasks = request.result.length ? request.result : [...defaultTasks];
      if (!request.result.length) {
        state.tasks = tasks;
        saveTasks().catch(() => {});
      } else {
        state.tasks = tasks;
      }
      resolve(tasks);
    };

    request.onerror = () => resolve([...defaultTasks]);
  });
}

async function saveTasks() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    state.tasks.forEach((task) => {
      store.put(task);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  clockElement.textContent = time;
}

function getCategoryColor(category) {
  switch (category) {
    case 'Estudo':
      return '#8b5cf6';
    case 'Trabalho':
      return '#3b82f6';
    case 'Reunião':
      return '#f59e0b';
    default:
      return '#10b981';
  }
}

function updateStats() {
  const totalTasks = state.tasks.length;
  const studyTasks = state.tasks.filter((task) => task.category === 'Estudo').length;
  const workTasks = state.tasks.filter((task) => task.category === 'Trabalho').length;
  const doneTasks = state.tasks.filter((task) => task.status === 'concluída').length;

  document.querySelector('#totalTasks').textContent = totalTasks;
  document.querySelector('#studyTasks').textContent = studyTasks;
  document.querySelector('#workTasks').textContent = workTasks;
  document.querySelector('#doneTasks').textContent = doneTasks;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderCalendar() {
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const today = new Date();
  const monthLabelText = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(state.currentMonth);

  monthLabel.textContent = monthLabelText.charAt(0).toUpperCase() + monthLabelText.slice(1);
  calendarDays.innerHTML = '';

  const totalCells = 42;

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - startWeekday + 1;
    const currentDate = new Date(year, month, dayNumber);
    const cell = document.createElement('div');
    const isCurrentMonth = currentDate.getMonth() === month;
    const isoDate = toISODate(currentDate);
    const cellTasks = state.tasks.filter((task) => task.date === isoDate);

    cell.className = 'calendar-day';

    if (!isCurrentMonth) {
      cell.classList.add('other-month');
    }

    if (toISODate(today) === isoDate) {
      cell.classList.add('today');
    }

    if (cellTasks.length) {
      cell.classList.add('has-tasks');
    }

    const dayNumberEl = document.createElement('div');
    dayNumberEl.className = 'calendar-day-number';
    dayNumberEl.textContent = currentDate.getDate();
    cell.appendChild(dayNumberEl);

    if (cellTasks.length) {
      const taskListEl = document.createElement('div');
      taskListEl.className = 'calendar-task-list';

      cellTasks.slice(0, 2).forEach((task) => {
        const pill = document.createElement('span');
        pill.className = 'calendar-task-pill';
        pill.style.background = getCategoryColor(task.category);
        pill.textContent = task.title;
        taskListEl.appendChild(pill);
      });

      if (cellTasks.length > 2) {
        const more = document.createElement('span');
        more.className = 'calendar-more';
        more.textContent = `+${cellTasks.length - 2} mais`;
        taskListEl.appendChild(more);
      }

      cell.appendChild(taskListEl);
    }

    calendarDays.appendChild(cell);
  }
}

function renderTasks() {
  const filteredTasks = state.filter === 'all'
    ? [...state.tasks]
    : state.tasks.filter((task) => task.category === state.filter);

  filteredTasks.sort((a, b) => {
    const firstDate = new Date(`${a.date}T${a.time || '00:00'}`);
    const secondDate = new Date(`${b.date}T${b.time || '00:00'}`);
    return firstDate - secondDate;
  });

  if (!filteredTasks.length) {
    taskList.innerHTML = '<div class="empty-state">Nenhuma atividade encontrada para esse filtro.</div>';
    updateStats();
    return;
  }

  const template = document.querySelector('#taskItemTemplate');
  taskList.innerHTML = '';

  filteredTasks.forEach((task) => {
    const clone = template.content.cloneNode(true);
    const badge = clone.querySelector('.task-badge');
    const title = clone.querySelector('.task-title');
    const description = clone.querySelector('.task-description');
    const date = clone.querySelector('.task-date');
    const time = clone.querySelector('.task-time');
    const status = clone.querySelector('.task-status');
    const doneBtn = clone.querySelector('.done-btn');
    const deleteBtn = clone.querySelector('.delete-btn');

    badge.style.background = getCategoryColor(task.category);
    badge.style.boxShadow = `0 0 0 4px ${getCategoryColor(task.category)}22`;
    title.textContent = task.title;
    description.textContent = task.description || 'Sem descrição adicional.';
    date.textContent = formatDate(task.date);
    time.textContent = task.time || 'Sem horário';
    status.textContent = task.status;
    status.dataset.status = task.status;

    doneBtn.addEventListener('click', async () => {
      const taskIndex = state.tasks.findIndex((item) => item.id === task.id);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].status = state.tasks[taskIndex].status === 'concluída' ? 'pendente' : 'concluída';
        await saveTasks();
        renderTasks();
        renderCalendar();
      }
    });

    deleteBtn.addEventListener('click', async () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      await saveTasks();
      renderTasks();
      renderCalendar();
    });

    taskList.appendChild(clone);
  });

  updateStats();
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Sem data';
  }

  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

async function handleTaskSubmit(event) {
  event.preventDefault();

  const formData = new FormData(taskForm);
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category') || 'Tarefa');
  const status = String(formData.get('status') || 'pendente');
  const date = String(formData.get('date') || '');
  const time = String(formData.get('time') || '');
  const description = String(formData.get('description') || '').trim();

  if (!title || !date || !time) {
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    category,
    status,
    date,
    time,
    description
  });

  await saveTasks();
  taskForm.reset();
  renderTasks();
  renderCalendar();
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    state.filter = button.dataset.filter;
    renderTasks();
  });
});

prevMonthBtn.addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

taskForm.addEventListener('submit', handleTaskSubmit);

async function initializeApp() {
  state.tasks = await loadTasks();
  updateClock();
  setInterval(updateClock, 60000);
  renderCalendar();
  renderTasks();
}

initializeApp();
