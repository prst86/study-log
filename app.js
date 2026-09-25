const STORAGE_KEY = "studyflow_state_v1";
const WEEKLY_TARGET_MINUTES = 300;

let currentCalendarMonth = new Date();
currentCalendarMonth.setDate(1);
let selectedCalendarDate = null;

const defaultState = {
  logs: [],
  plans: []
};

function toLocalDateString(dateValue) {
  const date = new Date(dateValue);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getRelativeDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toLocalDateString(date);
}

function seedState() {
  const today = getRelativeDate(0);
  const yesterday = getRelativeDate(-1);
  const twoDaysAgo = getRelativeDate(-2);
  const threeDaysAgo = getRelativeDate(-3);
  const sixDaysAgo = getRelativeDate(-6);

  return {
    logs: [
      { id: 1, title: "JavaScript 基礎を復習", subject: "Web開発", minutes: 45, date: today },
      { id: 2, title: "英単語 30個", subject: "英語", minutes: 30, date: yesterday },
      { id: 3, title: "React コンポーネント勉強", subject: "Web開発", minutes: 60, date: twoDaysAgo },
      { id: 4, title: "英作文の練習", subject: "英語", minutes: 40, date: threeDaysAgo },
      { id: 5, title: "SQL復習", subject: "データベース", minutes: 50, date: sixDaysAgo }
    ],
    plans: [
      { id: 1, title: "Reactチュートリアルを進める", subject: "Web開発", targetMinutes: 120, dueDate: getRelativeDate(3), done: false },
      { id: 2, title: "英単語を毎日20個", subject: "英語", targetMinutes: 30, dueDate: getRelativeDate(1), done: true },
      { id: 3, title: "データベースの復習", subject: "データベース", targetMinutes: 90, dueDate: getRelativeDate(5), done: false }
    ]
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const initial = seedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(saved);
    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : []
    };
  } catch (error) {
    console.error("保存データの読み込みに失敗しました", error);
    return seedState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getThisWeekDates() {
  const dates = [];
  const today = new Date();
  const currentDay = today.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + diffToMonday + index);
    dates.push(toLocalDateString(date));
  }

  return dates;
}

function getWeeklyMinutes(logs) {
  const weekDates = new Set(getThisWeekDates());
  return logs.reduce((sum, log) => {
    return weekDates.has(log.date) ? sum + Number(log.minutes || 0) : sum;
  }, 0);
}

function getPlanMinutesThisWeek(plans) {
  const weekDates = new Set(getThisWeekDates());
  return plans.reduce((sum, plan) => {
    return weekDates.has(plan.dueDate) ? sum + Number(plan.targetMinutes || 0) : sum;
  }, 0);
}

function renderComparisonChart(state) {
  const chart = document.querySelector("#planVsActualChart");
  if (!chart) return;

  const weekDates = getThisWeekDates();
  const actualMap = new Map();
  const plannedMap = new Map();
  const actualTitlesMap = new Map();
  const plannedTitlesMap = new Map();

  weekDates.forEach((date) => {
    actualMap.set(date, 0);
    plannedMap.set(date, 0);
    actualTitlesMap.set(date, []);
    plannedTitlesMap.set(date, []);
  });

  state.logs.forEach((log) => {
    if (actualMap.has(log.date)) {
      actualMap.set(log.date, actualMap.get(log.date) + Number(log.minutes || 0));
      actualTitlesMap.get(log.date).push(`${log.title} (${log.minutes}分)`);
    }
  });

  state.plans.forEach((plan) => {
    if (plannedMap.has(plan.dueDate)) {
      plannedMap.set(plan.dueDate, plannedMap.get(plan.dueDate) + Number(plan.targetMinutes || 0));
      plannedTitlesMap.get(plan.dueDate).push(`${plan.title} (${plan.targetMinutes}分)`);
    }
  });

  const maxValue = Math.max(
    ...weekDates.map((date) => Math.max(actualMap.get(date) || 0, plannedMap.get(date) || 0)),
    1
  );

  chart.innerHTML = weekDates.map((date) => {
    const actual = actualMap.get(date) || 0;
    const planned = plannedMap.get(date) || 0;
    const dayLabel = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(new Date(`${date}T00:00:00`));
    const plannedHeight = Math.max((planned / maxValue) * 100, planned > 0 ? 8 : 0);
    const actualHeight = Math.max((actual / maxValue) * 100, actual > 0 ? 8 : 0);
    const plannedTitle = plannedTitlesMap.get(date).length > 0
      ? `予定\n${plannedTitlesMap.get(date).join("\n")}`
      : "予定なし";
    const plannedTooltip = plannedTitlesMap.get(date).length > 0
      ? plannedTitlesMap.get(date).join("<br>")
      : "予定なし";
    const actualTooltip = actualTitlesMap.get(date).length > 0
      ? actualTitlesMap.get(date).join("<br>")
      : "実績なし";

    return `
      <div class="chart-day">
        <div class="chart-bars">
          <span class="bar planned-bar" style="height: ${plannedHeight}%" title="${plannedTitle}">
            <span class="bar-tooltip"><strong>予定</strong><br>${plannedTooltip}</span>
          </span>
          <span class="bar actual-bar" style="height: ${actualHeight}%" title="実績 ${actual}分">
            <span class="bar-tooltip"><strong>実績</strong><br>${actualTooltip}</span>
          </span>
        </div>
        <div class="chart-meta">
          <strong>${actual}分</strong>
          <span>${dayLabel}</span>
        </div>
      </div>
    `;
  }).join("");
}

function getCompletedCount(plans) {
  return plans.filter((plan) => plan.done).length;
}

function getStreakDays(logs) {
  const uniqueDays = new Set(logs.map((log) => log.date));
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = toLocalDateString(cursor);
    if (uniqueDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function renderSummary(state) {
  const weeklyMinutes = getWeeklyMinutes(state.logs);
  const plannedMinutes = getPlanMinutesThisWeek(state.plans);
  const completedCount = getCompletedCount(state.plans);
  const streakDays = getStreakDays(state.logs);

  const weeklyMinutesEl = document.querySelector("#weeklyMinutes");
  const weeklyGoalEl = document.querySelector("#weeklyGoal");
  const completedCountEl = document.querySelector("#completedCount");
  const streakDaysEl = document.querySelector("#streakDays");

  weeklyMinutesEl.textContent = `${weeklyMinutes}分`;
  const ratio = Math.min((weeklyMinutes / WEEKLY_TARGET_MINUTES) * 100, 100);
  weeklyGoalEl.textContent = `目標達成率 ${Math.round(ratio)}%`;
  weeklyGoalEl.title = `予定 ${plannedMinutes}分 / 実績 ${weeklyMinutes}分`;
  completedCountEl.textContent = `${completedCount}件`;
  streakDaysEl.textContent = `${streakDays}日`;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function getLogMinutesByDate(logs) {
  const totals = new Map();

  logs.forEach((log) => {
    const minutes = Number(log.minutes || 0);
    totals.set(log.date, (totals.get(log.date) || 0) + minutes);
  });

  return totals;
}

function renderCalendar(state) {
  const monthLabel = document.querySelector("#calendarMonthLabel");
  const grid = document.querySelector("#calendarGrid");
  const monthPicker = document.querySelector("#calendarMonthPicker");
  if (!grid) return;

  const logGroups = new Map();

  state.logs.forEach((log) => {
    const entryList = logGroups.get(log.date) || [];
    entryList.push(log);
    logGroups.set(log.date, entryList);
  });

  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  const todayKey = getRelativeDate(0);
  if (monthPicker) {
    monthPicker.value = `${year}-${String(month + 1).padStart(2, "0")}`;
  }

  const firstDay = new Date(year, month, 1);
  const startIndex = firstDay.getDay();

  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startIndex + 1;
    const cellDate = new Date(year, month, dayNumber);
    const cellKey = toLocalDateString(cellDate);
    const isCurrentMonth = cellDate.getMonth() === month;
    const entries = logGroups.get(cellKey) || [];
    const minutes = entries.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    const isToday = cellKey === todayKey;
    const isSelected = selectedCalendarDate === cellKey;
    const titleSummary = entries.slice(0, 2).map((log) => {
      const text = log.title.length > 12 ? `${log.title.slice(0, 12)}…` : log.title;
      return `<span class="calendar-entry">${text}</span>`;
    }).join("");

    cells.push(`
      <button
        type="button"
        class="calendar-day ${isCurrentMonth ? "current-month" : "outside"} ${entries.length > 0 ? "has-log" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}"
        data-date="${cellKey}"
        ${entries.length > 0 ? `title="${entries.map((log) => `${log.title} ${log.minutes}分`).join(" / ")}"` : ""}
      >
        <div class="calendar-day-content">
          <div class="day-header">
            <span class="day-number">${cellDate.getDate()}</span>
            ${minutes > 0 ? `<span class="day-total">${minutes}分</span>` : "<span class=\"day-total empty\">-</span>"}
          </div>
          <div class="day-entries">${entries.length > 0 ? titleSummary : "<span class=\"day-total empty\">-</span>"}</div>
        </div>
      </button>
    `);
  }

  grid.innerHTML = cells.join("");

  grid.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      const nextDate = button.dataset.date;
      selectedCalendarDate = selectedCalendarDate === nextDate ? null : nextDate;
      renderApp();
    });
  });
}

function renderLogs(logs, selectedDate = null) {
  const list = document.querySelector("#studyList");
  const recordsTitle = document.querySelector("#records h3");
  const selectedDateLabel = document.querySelector("#selectedDateLabel");
  const dailyStats = document.querySelector("#dailyStats");
  if (!list || !recordsTitle || !selectedDateLabel || !dailyStats) return;

  const filtered = selectedDate ? logs.filter((log) => log.date === selectedDate) : logs;
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  recordsTitle.textContent = selectedDate ? `学習記録 (${formatDisplayDate(selectedDate)})` : "学習記録";
  selectedDateLabel.textContent = selectedDate ? `${formatDisplayDate(selectedDate)}` : "全日";

  const totalMinutes = sorted.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
  const uniqueSubjects = [...new Set(sorted.map((log) => log.subject))];

  dailyStats.innerHTML = `
    <span class="daily-stat-pill">学習 ${sorted.length}件</span>
    <span class="daily-stat-pill">時間 ${totalMinutes}分</span>
    <span class="daily-stat-pill">教科 ${uniqueSubjects.length}種</span>
  `;

  if (!sorted.length) {
    list.innerHTML = '<li class="list-item"><div class="item-meta"><strong>まだ記録がありません</strong><span>この日には学習が登録されていません</span></div></li>';
    return;
  }

  list.innerHTML = sorted
    .map(
      (log) => `
        <li class="list-item">
          <div class="item-meta">
            <strong>${log.title}</strong>
            <span>${log.subject} · ${formatDisplayDate(log.date)}</span>
          </div>
          <div class="row">
            <span class="item-badge">${log.minutes}分</span>
            <button class="delete-btn" type="button" data-delete-log-id="${log.id}">削除</button>
          </div>
        </li>
      `
    )
    .join("");
}

function renderPlans(plans, selectedDate = null) {
  const list = document.querySelector("#planList");
  if (!list) return;

  const filtered = selectedDate ? plans.filter((plan) => plan.dueDate === selectedDate) : plans;
  const sorted = [...filtered].sort((a, b) => Number(a.done) - Number(b.done));

  if (!sorted.length) {
    list.innerHTML = '<li class="list-item"><div class="item-meta"><strong>計画はまだありません</strong><span>この日に関連する計画はありません</span></div></li>';
    return;
  }

  list.innerHTML = sorted
    .map(
      (plan) => `
        <li class="plan-item ${plan.done ? "done" : ""}">
          <div class="item-meta">
            <strong>${plan.title}</strong>
            <span>${plan.subject} · 期日 ${formatDisplayDate(plan.dueDate)}</span>
          </div>
          <div class="row">
            <span class="item-badge">${plan.targetMinutes}分</span>
            <span class="plan-status ${plan.done ? "done" : "pending"}">${plan.done ? "達成" : "予定"}</span>
            <button class="check-btn" type="button" data-plan-id="${plan.id}">${plan.done ? "完了済み" : "完了"}</button>
            <button class="delete-btn" type="button" data-delete-plan-id="${plan.id}">削除</button>
          </div>
        </li>
      `
    )
    .join("");
}

function renderRecordsPage() {
  const state = loadState();
  renderLogs(state.logs, selectedCalendarDate || null);
}

function renderPlansPage() {
  const state = loadState();
  renderPlans(state.plans, selectedCalendarDate || null);
}

function renderCalendarPage() {
  const state = loadState();
  renderCalendar(state);
}

function renderApp() {
  const state = loadState();
  renderSummary(state);
  renderComparisonChart(state);
  renderCalendar(state);
  renderLogs(state.logs, selectedCalendarDate);
  renderPlans(state.plans, selectedCalendarDate);
}

function renderCurrentPage() {
  const page = document.body.dataset.page || "dashboard";

  if (page === "plans") {
    renderPlansPage();
    return;
  }

  if (page === "records") {
    renderRecordsPage();
    return;
  }

  if (page === "calendar") {
    renderCalendarPage();
    return;
  }

  renderApp();
}

function addStudyLog(event) {
  event.preventDefault();

  const title = document.querySelector("#studyTitle").value.trim();
  const subject = document.querySelector("#studySubject").value.trim();
  const minutes = Number(document.querySelector("#studyMinutes").value);
  const date = document.querySelector("#studyDate").value;

  if (!title || !subject || !date || Number.isNaN(minutes) || minutes <= 0) {
    return;
  }

  const state = loadState();
  state.logs.push({
    id: Date.now(),
    title,
    subject,
    minutes,
    date
  });

  saveState(state);
  selectedCalendarDate = date;
  event.target.reset();
  document.querySelector("#studyDate").value = toLocalDateString(new Date());
  renderApp();
}

function deleteLog(logId) {
  const state = loadState();
  state.logs = state.logs.filter((log) => log.id !== logId);
  state.plans = state.plans.map((plan) => {
    return plan.completedLogId === logId
      ? { ...plan, done: false, completedLogId: null }
      : plan;
  });
  saveState(state);
  renderCurrentPage();
}

function addPlan(event) {
  event.preventDefault();

  const title = document.querySelector("#planTitle").value.trim();
  const subject = document.querySelector("#planSubject").value.trim();
  const targetMinutes = Number(document.querySelector("#planMinutes").value);
  const dueDate = document.querySelector("#planDate").value;

  if (!title || !subject || !dueDate || Number.isNaN(targetMinutes) || targetMinutes <= 0) {
    return;
  }

  const state = loadState();
  state.plans.push({
    id: Date.now(),
    title,
    subject,
    targetMinutes,
    dueDate,
    done: false
  });

  saveState(state);
  event.target.reset();
  document.querySelector("#planDate").value = getRelativeDate(3);
  renderCurrentPage();
}

function togglePlan(planId) {
  const state = loadState();
  const targetPlan = state.plans.find((plan) => plan.id === planId);
  if (!targetPlan) return;

  if (targetPlan.done) {
    state.logs = state.logs.filter((log) => log.id !== targetPlan.completedLogId);
    state.plans = state.plans.map((plan) => {
      return plan.id === planId ? { ...plan, done: false, completedLogId: null } : plan;
    });
  } else {
    const completedLogId = Date.now();
    state.logs.push({
      id: completedLogId,
      title: targetPlan.title,
      subject: targetPlan.subject,
      minutes: targetPlan.targetMinutes,
      date: targetPlan.dueDate,
      planId: targetPlan.id
    });
    state.plans = state.plans.map((plan) => {
      return plan.id === planId ? { ...plan, done: true, completedLogId } : plan;
    });
  }

  saveState(state);
  renderCurrentPage();
}

function deletePlan(planId) {
  const state = loadState();
  state.plans = state.plans.filter((plan) => plan.id !== planId);
  saveState(state);
  renderCurrentPage();
}

function resetData() {
  const nextState = {
    logs: [],
    plans: []
  };
  saveState(nextState);
  selectedCalendarDate = null;
  renderApp();
}

function changeMonth(offset) {
  currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + offset, 1);
  renderCalendarPage();
}

function selectCalendarMonth(event) {
  const [year, month] = event.target.value.split("-").map(Number);
  if (!year || !month) return;
  currentCalendarMonth = new Date(year, month - 1, 1);
  renderCalendarPage();
}

function init() {
  const studyForm = document.querySelector("#studyForm");
  const planForm = document.querySelector("#planForm");
  const studyList = document.querySelector("#studyList");
  const planList = document.querySelector("#planList");
  const resetButton = document.querySelector("#resetData");
  const prevMonthButton = document.querySelector("#prevMonth");
  const nextMonthButton = document.querySelector("#nextMonth");
  const monthPicker = document.querySelector("#calendarMonthPicker");

  selectedCalendarDate = null;

  if (document.querySelector("#studyDate")) {
    document.querySelector("#studyDate").value = toLocalDateString(new Date());
  }
  if (document.querySelector("#planDate")) {
    document.querySelector("#planDate").value = getRelativeDate(3);
  }

  if (studyForm) {
    studyForm.addEventListener("submit", addStudyLog);
  }
  if (planForm) {
    planForm.addEventListener("submit", addPlan);
  }
  if (studyList) {
    studyList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-delete-log-id]");
      if (!button) return;
      deleteLog(Number(button.dataset.deleteLogId));
    });
  }
  if (planList) {
    planList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-plan-id]");
      const deleteButton = event.target.closest("button[data-delete-plan-id]");
      if (button) {
        togglePlan(Number(button.dataset.planId));
      }
      if (deleteButton) {
        deletePlan(Number(deleteButton.dataset.deletePlanId));
      }
    });
  }
  if (resetButton) {
    resetButton.addEventListener("click", resetData);
  }
  if (prevMonthButton && nextMonthButton) {
    prevMonthButton.addEventListener("click", () => changeMonth(-1));
    nextMonthButton.addEventListener("click", () => changeMonth(1));
  }
  if (monthPicker) {
    monthPicker.addEventListener("change", selectCalendarMonth);
  }

  const page = document.body.dataset.page || "dashboard";

  if (page === "dashboard") {
    renderApp();
    return;
  }

  if (page === "records") {
    renderRecordsPage();
    return;
  }

  if (page === "plans") {
    renderPlansPage();
    return;
  }

  if (page === "calendar") {
    renderCalendarPage();
  }
}

init();
