let todos = JSON.parse(localStorage.getItem('my_assistant_todos')) || [];
let balance = parseInt(localStorage.getItem('my_assistant_balance')) || 0;
let history = JSON.parse(localStorage.getItem('my_assistant_history')) || [];
let myTimetableData = JSON.parse(localStorage.getItem('my_assistant_timetable')) || [];
let lastCheckDate = localStorage.getItem('last_check_date') || ""; 
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

// --- 存檔與渲染 ---
function saveAndRender() {
    localStorage.setItem('my_assistant_todos', JSON.stringify(todos));
    localStorage.setItem('my_assistant_balance', balance);
    localStorage.setItem('my_assistant_history', JSON.stringify(history));
    localStorage.setItem('last_check_date', lastCheckDate);
    
    document.getElementById('header-balance').innerText = balance;
    if(document.getElementById('vault-balance')) {
        document.getElementById('vault-balance').innerText = `💰 ${balance}`;
    }
    renderTodoList();
}

// --- 待辦清單渲染 (包含日期顯示、紅字、分類) ---
function renderTodoList() {
    const tList = document.getElementById('task-list');
    const rList = document.getElementById('routine-list');
    const cList = document.getElementById('completed-this-week-list');
    if(!tList || !rList) return;
    
    tList.innerHTML = ''; rList.innerHTML = '';
    if(cList) cList.innerHTML = '';

    const today = new Date();
    today.setHours(0,0,0,0);

    todos.forEach(item => {
        const li = document.createElement('li');
        li.className = `todo-item ${item.completed ? 'completed' : ''}`;
        
        let textStyle = "";
        let dateDisplay = ""; 

        if (item.type === 'task') {
            const dueDate = new Date(item.date);
            dueDate.setHours(0,0,0,0);
            dateDisplay = `<small style="display:block; font-size: 11px; color: #8e8e93; margin-top: 2px;">截止日: ${item.date}</small>`;

            if (!item.completed && today > dueDate) {
                textStyle = "color: #ff3b30; font-weight: bold;";
            }
        }

        li.innerHTML = `
            <div onclick="toggleComplete(${item.id})" style="display:flex;align-items:center;flex:1;${textStyle}">
                <div class="checkbox"></div>
                <div class="todo-info">
                    <strong>${item.text}</strong>
                    ${dateDisplay} 
                </div>
            </div>
            <div style="color:#34c759;font-weight:bold;">+$${item.reward}</div>`;
        
        if (item.completed && item.type === 'task') {
            if(cList) cList.appendChild(li);
            else tList.appendChild(li);
        } else if (item.type === 'task') {
            tList.appendChild(li);
        } else {
            rList.appendChild(li);
        }
    });
}

// --- 切換完成狀態 (包含罰金補扣邏輯) ---
function toggleComplete(id) {
    const item = todos.find(t => t.id === id);
    if (!item) return;

    item.completed = !item.completed;
    
    if (item.completed) {
        balance += item.reward;
        history.unshift({ name: "達成：" + item.text, amt: item.reward, date: new Date().toLocaleString() });
    } else {
        // 取消完成：扣回獎金
        balance -= item.reward;
        history.unshift({ name: "取消：" + item.text, amt: -item.reward, date: new Date().toLocaleString() });

        // 如果過期未完成且未被罰過，補扣罰金
        if (item.type === 'task') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const dueDate = new Date(item.date);
            dueDate.setHours(0,0,0,0);

            if (today > dueDate && !item.fined) {
                balance -= (item.penalty || 0);
                item.fined = true;
                history.unshift({ name: `補扣過期罰金：${item.text}`, amt: -(item.penalty || 0), date: new Date().toLocaleString() });
            }
        }
    }
    saveAndRender();
}

// --- 過期與換日檢查 ---
function checkExpiredLogic() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let changed = false;

    todos.forEach(item => {
        if (item.type === 'task' && !item.completed && !item.fined) {
            const dueDate = new Date(item.date);
            dueDate.setHours(0,0,0,0);
            const checkLimit = new Date(dueDate);
            checkLimit.setDate(checkLimit.getDate() + 1); 

            if (today >= checkLimit) {
                balance -= (item.penalty || 0);
                item.fined = true;
                history.unshift({ name: `過期罰金：${item.text}`, amt: -(item.penalty || 0), date: new Date().toLocaleString() });
                changed = true;
            }
        }

        if (item.type === 'routine' && lastCheckDate !== "" && lastCheckDate !== todayStr) {
            if (!item.completed && !item.fined) {
                balance -= (item.penalty || 0);
                history.unshift({ name: `例行未達標：${item.text}`, amt: -(item.penalty || 0), date: new Date().toLocaleString() });
            }
            item.completed = false; 
            item.fined = false;
            changed = true;
        }
    });

    lastCheckDate = todayStr;
    if (changed) saveAndRender();
}

function addNewItem() {
    const text = document.getElementById('todo-text').value;
    const date = document.getElementById('todo-date').value;
    if (!text) return;
    
    todos.push({
        id: Date.now(),
        text: text,
        type: document.getElementById('todo-type').value,
        reward: parseInt(document.getElementById('reward-amt').value) || 0,
        penalty: parseInt(document.getElementById('penalty-amt').value) || 0,
        date: date || new Date().toISOString().split('T')[0],
        completed: false,
        fined: false
    });
    saveAndRender();
    document.getElementById('todo-text').value = '';
}

function toggleExtraFields() {
    const type = document.getElementById('todo-type').value;
    const routineFields = document.getElementById('routine-extra-fields');
    const taskDate = document.getElementById('todo-date');
    if (type === 'routine') {
        routineFields.style.display = 'block';
        taskDate.style.display = 'none';
    } else {
        routineFields.style.display = 'none';
        taskDate.style.display = 'block';
    }
}

// --- 行事曆渲染 (包含任務標籤) ---
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
        const currentStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = new Date().toDateString() === new Date(y, m, d).toDateString();
        
        const dayTasks = todos.filter(t => t.type === 'task' && t.date === currentStr);
        let taskHtml = '';
        dayTasks.forEach(t => {
            const style = t.completed ? 'text-decoration: line-through; opacity: 0.5;' : '';
            taskHtml += `<div style="font-size: 9px; background: rgba(0,122,255,0.1); color: #007aff; margin-top: 2px; padding: 1px 2px; border-radius: 2px; width: 90%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; ${style}">${t.text}</div>`;
        });

        dayEl.innerHTML = `<div class="date-number ${isToday ? 'today' : ''}">${d}</div><div style="width: 100%; display: flex; flex-direction: column; align-items: center;">${taskHtml}</div>`;
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
    if (ed) ed.style.display = (ed.style.display === 'none' || ed.style.display === '') ? 'block' : 'none';
}

function applyJsonTimetable() {
    const jsonInput = document.getElementById('json-input');
    try {
        if (!jsonInput.value) return alert("請貼上 JSON 內容");
        myTimetableData = JSON.parse(jsonInput.value);
        localStorage.setItem('my_assistant_timetable', JSON.stringify(myTimetableData));
        renderDynamicTimetable();
        document.getElementById('timetable-editor').style.display = 'none';
        alert("課表生成成功！");
    } catch (e) { alert("JSON 格式錯誤"); }
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
    if (isNaN(amt) || amt <= 0 || amt > balance) return alert("金額無效或餘額不足");
    balance -= amt;
    history.unshift({ name: "領取：" + (reasonInput.value || "未註明"), amt: -amt, date: new Date().toLocaleString() });
    saveAndRender();
    renderHistoryList();
    amtInput.value = ''; reasonInput.value = '';
}

// --- 初始化 ---
window.onload = function() {
    checkExpiredLogic();
    saveAndRender();
};

// --- 全域掛載 ---
window.openTimetableEditor = openTimetableEditor;
window.applyJsonTimetable = applyJsonTimetable;
window.showPage = showPage;
window.changeMonth = changeMonth;
window.addNewItem = addNewItem;
window.toggleExtraFields = toggleExtraFields;
window.withdrawMoney = withdrawMoney;
window.toggleComplete = toggleComplete;
window.copyAiPrompt = function() {
    const promptText = document.getElementById('ai-prompt');
    promptText.select();
    try {
        navigator.clipboard.writeText(promptText.value);
        alert("指令已複製！");
    } catch (err) {
        document.execCommand('copy');
        alert("指令已複製！");
    }
};
