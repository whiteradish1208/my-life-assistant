let todos = JSON.parse(localStorage.getItem('my_assistant_todos')) || [];
let balance = parseInt(localStorage.getItem('my_assistant_balance')) || 0;
let history = JSON.parse(localStorage.getItem('my_assistant_history')) || [];
let myTimetableData = JSON.parse(localStorage.getItem('my_assistant_timetable')) || [];
let lastCheckDate = localStorage.getItem('last_check_date') || ""; // 用於判斷日期更迭
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
    localStorage.setItem('last_check_date', lastCheckDate);
    document.getElementById('header-balance').innerText = balance;
    if(document.getElementById('vault-balance')) document.getElementById('vault-balance').innerText = `💰 ${balance}`;
    renderTodoList();
}

// 修正：增加過期判斷、紅字顯示與「本週已完成」分類
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
        
        // 判斷重要事項是否過期變紅
        let textStyle = "";
        let dateDisplay = ""; // 用於儲存日期顯示文字

        if (item.type === 'task') {
            const dueDate = new Date(item.date);
            dueDate.setHours(0,0,0,0);
            
            // 格式化日期顯示 (例如: 2026-04-18)
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
        
        // 分類邏輯
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

// 修正：新增過期罰金邏輯與自動檢查
function checkExpiredLogic() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const isMonday = today.getDay() === 1;

    let changed = false;

    todos.forEach(item => {
        // 重要事項：期限隔天未完成扣錢
        if (item.type === 'task' && !item.completed && !item.fined) {
            const dueDate = new Date(item.date);
            dueDate.setHours(0,0,0,0);
            const checkLimit = new Date(dueDate);
            checkLimit.setDate(checkLimit.getDate() + 1); // 期限隔天

            if (today >= checkLimit) {
                balance -= (item.penalty || 0);
                item.fined = true;
                history.unshift({ name: `過期罰金：${item.text}`, amt: -(item.penalty || 0), date: new Date().toLocaleString() });
                changed = true;
            }
        }

        // 例行公事：換日重置並判斷上週期是否完成
        if (item.type === 'routine' && lastCheckDate !== "" && lastCheckDate !== todayStr) {
            if (!item.completed && !item.fined) {
                balance -= (item.penalty || 0);
                history.unshift({ name: `例行未達標：${item.text}`, amt: -(item.penalty || 0), date: new Date().toLocaleString() });
            }
            item.completed = false; // 重置週期
            item.fined = false;
            changed = true;
        }
    });

    // 每週一重置 (此處僅紀錄日期，渲染邏輯會自動處理分類)
    if (isMonday && lastCheckDate !== todayStr) {
        // 保留給未來可能的每週清除邏輯
    }

    lastCheckDate = todayStr;
    if (changed) saveAndRender();
}

function toggleComplete(id) {
    const item = todos.find(t => t.id === id);
    if (!item) return;

    item.completed = !item.completed;
    
    if (item.completed) {
        // --- 動作：標記為完成 ---
        balance += item.reward;
        history.unshift({ name: "達成：" + item.text, amt: item.reward, date: new Date().toLocaleString() });
    } else {
        // --- 動作：取消完成 (變回未完成) ---
        // 1. 先扣回獎勵
        balance -= item.reward;
        history.unshift({ name: "取消：" + item.text, amt: -item.reward, date: new Date().toLocaleString() });

        // 2. 額外檢查：如果取消的是「重要任務」且已經「過期」，且之前沒扣過罰金，現在補扣
        if (item.type === 'task') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const dueDate = new Date(item.date);
            dueDate.setHours(0,0,0,0);

            // 如果今天已經超過了截止日，且尚未標記過罰款
            if (today > dueDate && !item.fined) {
                balance -= (item.penalty || 0);
                item.fined = true; // 標記已罰款，避免重複扣錢
                history.unshift({ 
                    name: `補扣過期罰金：${item.text}`, 
                    amt: -(item.penalty || 0), 
                    date: new Date().toLocaleString() 
                });
            }
        }
    }
    
    saveAndRender();
}

// 修正：加入罰金欄位儲存
function addNewItem() {
    const text = document.getElementById('todo-text').value;
    if (!text) return;
    todos.push({
        id: Date.now(),
        text: text,
        type: document.getElementById('todo-type').value,
        reward: parseInt(document.getElementById('reward-amt').value) || 0,
        penalty: parseInt(document.getElementById('penalty-amt').value) || 0, // 儲存罰金
        date: document.getElementById('todo-date').value, // 儲存日期
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
    
    // 填充月初空白
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    // 開始畫每一天
    for (let d = 1; d <= lastDate; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        // 格式化當前格子的日期字串 (YYYY-MM-DD) 以便比對
        const currentStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const isToday = new Date().toDateString() === new Date(y, m, d).toDateString();
        
        // 找出這一天有哪些重要事項
        const dayTasks = todos.filter(t => t.type === 'task' && t.date === currentStr);
        
        let taskHtml = '';
        dayTasks.forEach(t => {
            // 如果已完成就加刪除線，如果過期未完成且不是今天以前就顯示紅色
            const style = t.completed ? 'text-decoration: line-through; opacity: 0.5;' : '';
            taskHtml += `<div style="font-size: 9px; background: rgba(0,122,255,0.1); color: #007aff; margin-top: 2px; padding: 1px 2px; border-radius: 2px; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; ${style}">
                ${t.text}
            </div>`;
        });

        dayEl.innerHTML = `
            <div class="date-number ${isToday ? 'today' : ''}">${d}</div>
            <div style="width: 100%; overflow-y: auto; display: flex; flex-direction: column; align-items: center;">
                ${taskHtml}
            </div>
        `;
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

// 修正：初始化時載入過期檢查
window.onload = function() {
    // 設定日期輸入框的預設值為今天
    const dateInput = document.getElementById('todo-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // 原有的初始化邏輯
    checkExpiredLogic();
    saveAndRender();
};

window.openTimetableEditor = openTimetableEditor;
window.applyJsonTimetable = applyJsonTimetable;
window.showPage = showPage;
window.changeMonth = changeMonth;
window.addNewItem = addNewItem;
window.toggleExtraFields = toggleExtraFields;
window.withdrawMoney = withdrawMoney;
window.toggleComplete = toggleComplete;

function copyAiPrompt() {
    const promptText = document.getElementById('ai-prompt');
    promptText.select();
    promptText.setSelectionRange(0, 99999);
    try {
        navigator.clipboard.writeText(promptText.value);
        alert("指令已複製！請去傳給 AI 並附上照片。");
    } catch (err) {
        document.execCommand('copy');
        alert("指令已複製！");
    }
}
window.copyAiPrompt = copyAiPrompt;
