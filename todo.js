const STORAGE_KEY = "daily-todo-tasks";
const THEME_KEY = "daily-todo-theme";

const form = document.getElementById("add-form");
const taskInput = document.getElementById("task-name");
const taskDate = document.getElementById("task-date");
const taskTime = document.getElementById("task-time");
const cancelEditButton = document.getElementById("cancel-edit");
const submitButton = form.querySelector(".add-button");
const tasksContainer = document.getElementById("tasks");
const activeCount = document.getElementById("active-count");
const completedCount = document.getElementById("completed-count");
const themeToggle = document.getElementById("theme-toggle");

let currentFilter = "all";
let tasks = loadTasks();
let editingTaskId = null;

function loadTasks() {
    try {
        const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(savedTasks) ? savedTasks : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
    tasksContainer.replaceChildren();

    const visibleTasks = tasks.filter(task => {
        if (currentFilter === "active") return !task.completed;
        if (currentFilter === "completed") return task.completed;
        return true;
    });

    activeCount.textContent = tasks.filter(task => !task.completed).length;
    completedCount.textContent = tasks.filter(task => task.completed).length;

    if (visibleTasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-state";
        emptyMessage.textContent = currentFilter === "all"
            ? "No tasks yet. Add one to get started!"
            : `No ${currentFilter} tasks right now.`;
        tasksContainer.appendChild(emptyMessage);
        return;
    }

    visibleTasks.forEach(task => {
        const row = document.createElement("article");
        row.className = `task-row${task.completed ? " is-completed" : ""}`;

        const checkbox = document.createElement("input");
        checkbox.className = "task-checkbox";
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Mark ${task.name} as ${task.completed ? "active" : "completed"}`);
        checkbox.dataset.action = "toggle";
        checkbox.dataset.id = task.id;

        const text = document.createElement("p");
        text.className = "task-text";
        text.textContent = task.name;

        if (task.date || task.time) {
            const schedule = document.createElement("p");
            schedule.className = "task-schedule";

            if (task.date) {
                const [year, month, day] = task.date.split("-").map(Number);
                const date = new Date(year, month - 1, day);
                schedule.textContent = date.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                });
            }

            if (task.time) {
                const [hours, minutes] = task.time.split(":").map(Number);
                const time = new Date(2000, 0, 1, hours, minutes);
                const formattedTime = time.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit"
                });
                schedule.textContent += task.date ? ` · ${formattedTime}` : formattedTime;
            }

            row.append(checkbox, text, schedule);
        } else {
            row.append(checkbox, text);
        }

        const editButton = document.createElement("button");
        editButton.className = "task-action";
        editButton.type = "button";
        editButton.textContent = "✎";
        editButton.title = "Edit task";
        editButton.setAttribute("aria-label", `Edit ${task.name}`);
        editButton.dataset.action = "edit";
        editButton.dataset.id = task.id;

        const deleteButton = document.createElement("button");
        deleteButton.className = "task-action delete";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete task";
        deleteButton.setAttribute("aria-label", `Delete ${task.name}`);
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = task.id;

        row.append(editButton, deleteButton);
        tasksContainer.appendChild(row);
    });
}

function resetForm() {
    form.reset();
    editingTaskId = null;
    submitButton.innerHTML = '<span aria-hidden="true">＋</span> Add task';
    cancelEditButton.hidden = true;
}

form.addEventListener("submit", event => {
    event.preventDefault();
    const name = taskInput.value.trim();
    if (!name) return;

    if (editingTaskId) {
        const task = tasks.find(item => item.id === editingTaskId);
        if (!task) {
            resetForm();
            return;
        }
        task.name = name;
        task.date = taskDate.value;
        task.time = taskTime.value;
    } else {
        tasks.unshift({
            id: window.crypto?.randomUUID?.() || String(Date.now()),
            name,
            date: taskDate.value,
            time: taskTime.value,
            completed: false
        });
    }

    saveTasks();
    renderTasks();
    resetForm();
    taskInput.focus();
});

cancelEditButton.addEventListener("click", () => {
    resetForm();
    taskInput.focus();
});

tasksContainer.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const task = tasks.find(item => item.id === button.dataset.id);
    if (!task) return;

    if (button.dataset.action === "edit") {
        editingTaskId = task.id;
        taskInput.value = task.name;
        taskDate.value = task.date || "";
        taskTime.value = task.time || "";
        submitButton.innerHTML = "Save changes";
        cancelEditButton.hidden = false;
        taskInput.focus();
    }

    if (button.dataset.action === "delete") {
        tasks = tasks.filter(item => item.id !== task.id);
        if (editingTaskId === task.id) resetForm();
        saveTasks();
        renderTasks();
    }
});

tasksContainer.addEventListener("change", event => {
    if (!event.target.matches('input[data-action="toggle"]')) return;

    const task = tasks.find(item => item.id === event.target.dataset.id);
    if (!task) return;

    task.completed = event.target.checked;
    saveTasks();
    renderTasks();
});

document.querySelector(".filters").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach(filterButton => {
        filterButton.classList.toggle("selected", filterButton === button);
    });
    renderTasks();
});

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const isDark = theme === "dark";
    themeToggle.querySelector("span").textContent = isDark ? "☀" : "☾";
    themeToggle.querySelector(".theme-label").textContent = isDark ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
}

setTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
});

renderTasks();