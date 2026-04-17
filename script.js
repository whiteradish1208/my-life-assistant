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

// 在 addNewItem 函式下方加入這個：

function toggleExtraFields() {
    const type = document.getElementById('todo-type').value;
    const routineFields = document.getElementById('routine-extra-fields');
    const taskDate = document.getElementById('todo-date');

    // 檢查元素是否存在，避免報錯
    if (!routineFields || !taskDate) return;

    if (type === 'routine') {
        // 選「例行公事」：顯示週期選單，隱藏日期選擇
        routineFields.style.display = 'block';
        taskDate.style.display = 'none';
    } else {
        // 選「重要任務」：隱藏週期選單，顯示日期選擇
        routineFields.style.display = 'none';
        taskDate.style.display = 'block';
    }
}

// --- 行事曆功能 ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const display = document.getElementById('month-year-display');
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

// --- 課表功能 (還原結構) ---
function toFullWidth(str) {
    return str.replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xfee0));
}

function renderDynamicTimetable() {
    const grid = document.getElementById('timetable-grid');
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
    ed.style.display = ed.style.display === 'none' ? 'block' : 'none';
}

function applyJsonTimetable() {
    try {
        myTimetableData = JSON.parse(document.getElementById('json-input').value);
        localStorage.setItem('my_assistant_timetable', JSON.stringify(myTimetableData));
        renderDynamicTimetable();
        document.getElementById('timetable-editor').style.display = 'none';
    } catch(e) { alert("格式錯誤"); }
}

// --- 金庫功能 ---
function renderHistoryList() {
    const list = document.getElementById('history-list');
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

    // 檢查金額是否合法且餘額充足
    if (isNaN(amt) || amt <= 0) {
        alert("請輸入有效的金額");
        return;
    }
    if (amt > balance) {
        alert("餘額不足");
        return;
    }

    // 1. 更新餘額
    balance -= amt;

    // 2. 將領取紀錄加入歷史明細（unshift 會加到最上面）
    history.unshift({ 
        name: "領取：" + reason, 
        amt: -amt, 
        date: new Date().toLocaleString() 
    });

    // 3. 儲存數據並刷新介面
    saveAndRender();
    renderHistoryList(); // 強制更新金庫頁面的明細列表

    // 4. 清空輸入框
    amtInput.value = '';
    reasonInput.value = '';
}

window.onload = saveAndRender;
