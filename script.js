let todos = JSON.parse(localStorage.getItem('my_assistant_todos')) || [];
let balance = parseInt(localStorage.getItem('my_assistant_balance')) || 0;
let history = JSON.parse(localStorage.getItem('my_assistant_history')) || [];
let myTimetableData = JSON.parse(localStorage.getItem('my_assistant_timetable')) || [];
let currentViewDate = new Date();

// --- 介面控制 ---
function showPage(pageId, title, element) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + '-page').classList.add('active');
    document.getElementById('page-title').innerText = title;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    if (pageId === 'calendar') renderCalendar();
    if (pageId === 'timetable') renderDynamicTimetable();
    if (pageId === 'vault') renderHistoryList();
}

// --- 待辦功能 ---
function saveAndRender() {
    localStorage.setItem('my_assistant_todos', JSON.stringify(todos));
    localStorage.setItem('my_assistant_balance', balance);
    localStorage.setItem('my_assistant_history', JSON.stringify(history));
    document.getElementById('header-balance').innerText = balance;
    if(document.getElementById('vault-balance')) document.getElementById('vault-balance').innerText = `💰 ${balance}`;
    renderTodoList();
}

function renderTodoList() {
    const tList = document.getElementById('task-list');
    const rList = document.getElementById('routine-list');
    if(!tList || !rList) return;
    tList.innerHTML = ''; rList.innerHTML = '';
    todos.forEach(item => {
        const li = document.createElement('li');
        li.className = `todo-item ${item.completed ? 'completed' : ''}`;
        li.innerHTML = `<div onclick="toggleComplete(${item.id})" style="display:flex;align-items:center;flex:1">
            <div class="checkbox"></div><strong>${item.text}</strong></div>
            <div style="color:#34c759;font-weight:bold;">+$${item.reward}</div>`;
        (item.type === 'task' ? tList : rList).appendChild(li);
    });
}

function toggleComplete(id) {
    const item = todos.find(t => t.id === id);
    item.completed = !item.completed;
    const amt = item.completed ? item.reward : -item.reward;
    balance += amt;
    history.unshift({ name: (item.completed ? '' : '取消：') + item.text, amt: amt, date: new Date().toLocaleString() });
    saveAndRender();
}

function addNewItem() {
    const text = document.getElementById('todo-text').value;
    if (!text) return;
    todos.push({
        id: Date.now(),
        text: text,
        type: document.getElementById('todo-type').value,
        reward: parseInt(document.getElementById('reward-amt').value) || 0,
        completed: false
    });
    saveAndRender();
    document.getElementById('todo-text').value = '';
}

function toggleExtraFields() {
    const type = document.getElementById('todo-type').value;
    const routineFields = document.getElementById('routine-extra-fields');
    const taskDate = document.getElementById('todo-date');
    if (!routineFields || !taskDate) return;
    if (type === 'routine') {
        routineFields.style.display = 'block';
        taskDate.style.display = 'none';
    } else {
        routineFields.style.display = 'none';
        taskDate.style.display = 'block';
    }
}

// --- 行事曆功能 ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const display = document.getElementById('month-year-display');
    if(!grid) return;
    grid.innerHTML = '';
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    display.innerText = `${y}年 ${m + 1}月`;
    const firstDay = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= lastDate; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        const isToday = new Date().toDateString() === new Date(y, m, d).toDateString();
        dayEl.innerHTML = `<div class="date-number ${isToday ? 'today' : ''}">${d}</div>`;
        grid.appendChild(dayEl);
    }
}

function changeMonth(offset) {
    currentViewDate.setMonth(currentViewDate.getMonth() + offset);
    renderCalendar();
}

// --- 課表功能 ---
function toFullWidth(str) {
    return str.replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xfee0));
}

function renderDynamicTimetable() {
    const grid = document.getElementById('timetable-grid');
    if(!grid) return;
    grid.innerHTML = '<div class="grid-header-corner"></div><div class="grid-header">一</div><div class="grid-header">二</div><div class="grid-header">三</div><div class="grid-header">四</div><div class="grid-header">五</div>';
    for (let p = 1; p <= 8; p++) {
        const tCell = document.createElement('div'); tCell.className = 'timetable-cell'; tCell.innerText = p; grid.appendChild(tCell);
        for (let d = 1; d <= 5; d++) {
            const cell = document.createElement('div'); cell.className = 'timetable-cell';
            const course = myTimetableData.find(c => c.day === d && c.period === p);
            if (course) cell.innerHTML = `<div class="course-text">${toFullWidth(course.name)}</div><div class="room-text">${toFullWidth(course.room)}</div>`;
            grid.appendChild(cell);
        }
    }
}

function openTimetableEditor() {
    const ed = document.getElementById('timetable-editor');
    if (ed) {
        ed.style.display = (ed.style.display === 'none' || ed.style.display === '') ? 'block' : 'none';
    }
}

function applyJsonTimetable() {
    const jsonInput = document.getElementById('json-input');
    try {
        const rawData = jsonInput.value;
        if (!rawData) return alert("請貼上 JSON 內容");
        myTimetableData = JSON.parse(rawData);
        localStorage.setItem('my_assistant_timetable', JSON.stringify(myTimetableData));
        renderDynamicTimetable();
        document.getElementById('timetable-editor').style.display = 'none';
        alert("課表生成成功！");
    } catch (e) {
        alert("JSON 格式錯誤");
    }
}

// --- 金庫功能 ---
function renderHistoryList() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = history.map(h => `
        <li class="history-item">
            <div><strong>${h.name}</strong><small style="display:block;color:#999">${h.date}</small></div>
            <div class="${h.amt >= 0 ? 'amount-plus' : 'amount-minus'}">${h.amt >= 0 ? '+' : ''}${h.amt}</div>
        </li>
    `).join('');
}

function withdrawMoney() {
    const amtInput = document.getElementById('withdraw-amount');
    const reasonInput = document.getElementById('withdraw-reason');
    const amt = parseInt(amtInput.value);
    const reason = reasonInput.value || "未註明用途";
    if (isNaN(amt) || amt <= 0 || amt > balance) return alert("金額無效或餘額不足");
    balance -= amt;
    history.unshift({ name: "領取：" + reason, amt: -amt, date: new Date().toLocaleString() });
    saveAndRender();
    renderHistoryList();
    amtInput.value = ''; reasonInput.value = '';
}

window.onload = saveAndRender;

// --- 【關鍵修正】強制將函式掛載到全域 window 物件 ---
// 這樣無論編譯器如何封裝，HTML 的 onclick 都一定找得到它們
window.openTimetableEditor = openTimetableEditor;
window.applyJsonTimetable = applyJsonTimetable;
window.showPage = showPage;
window.changeMonth = changeMonth;
window.addNewItem = addNewItem;
window.toggleExtraFields = toggleExtraFields;
window.withdrawMoney = withdrawMoney;
window.toggleComplete = toggleComplete;

// 新增：一鍵複製指令功能
function copyAiPrompt() {
    const promptText = document.getElementById('ai-prompt');
    promptText.select();
    promptText.setSelectionRange(0, 99999); // 針對手機端
    
    try {
        navigator.clipboard.writeText(promptText.value);
        alert("指令已複製！請去傳給 AI 並附上照片。");
    } catch (err) {
        // 備用方案：如果瀏覽器不支援 clipboard API
        document.execCommand('copy');
        alert("指令已複製！");
    }
}

// 確保全域掛載，讓 HTML 點擊生效
window.copyAiPrompt = copyAiPrompt;
