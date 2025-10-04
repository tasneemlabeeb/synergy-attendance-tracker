const employeeIdInput = document.getElementById('employeeId');
const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const messageDiv = document.getElementById('message');
const attendanceList = document.getElementById('attendanceList');
const statusDisplay = document.getElementById('statusDisplay');

let currentEmployeeId = '';
let checkTimeout;

// Load today's attendance on page load
loadAttendance();

// Listen for employee ID input
employeeIdInput.addEventListener('input', () => {
    clearTimeout(checkTimeout);
    const employeeId = employeeIdInput.value.trim();
    
    if (employeeId.length >= 3) {
        checkTimeout = setTimeout(() => {
            checkEmployeeStatus(employeeId);
        }, 500);
    } else {
        statusDisplay.innerHTML = '<p class="loading">Enter your ID to check status...</p>';
        checkInBtn.disabled = true;
        checkOutBtn.disabled = true;
    }
});

// Handle Check In
checkInBtn.addEventListener('click', async () => {
    await markAttendance('in');
});

// Handle Check Out
checkOutBtn.addEventListener('click', async () => {
    await markAttendance('out');
});

// Check employee status
async function checkEmployeeStatus(employeeId) {
    try {
        const response = await fetch(`/api/attendance/status/${employeeId}`);
        const data = await response.json();
        
        if (response.ok) {
            currentEmployeeId = employeeId;
            updateStatusDisplay(data);
            updateButtons(data);
        } else {
            statusDisplay.innerHTML = '<p class="error">Employee not found</p>';
            checkInBtn.disabled = true;
            checkOutBtn.disabled = true;
        }
    } catch (error) {
        console.error('Error checking status:', error);
        statusDisplay.innerHTML = '<p class="error">Failed to check status</p>';
    }
}

// Update status display
function updateStatusDisplay(status) {
    let html = '<div class="status-info">';
    
    if (!status.hasCheckedIn) {
        html += '<p class="status-pending">⏳ Not checked in yet</p>';
    } else if (status.hasCheckedIn && !status.hasCheckedOut) {
        html += `<p class="status-in">✅ Checked in at ${formatTime(status.checkIn)}</p>`;
        html += '<p class="status-note">Remember to check out when you leave!</p>';
    } else if (status.hasCheckedOut) {
        html += `<p class="status-complete">✅ Checked in at ${formatTime(status.checkIn)}</p>`;
        html += `<p class="status-complete">✅ Checked out at ${formatTime(status.checkOut)}</p>`;
        html += `<p class="status-hours">⏱️ Work Hours: ${status.workHours} hours</p>`;
    }
    
    html += '</div>';
    statusDisplay.innerHTML = html;
}

// Update button states
function updateButtons(status) {
    if (!status.hasCheckedIn) {
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
    } else if (status.hasCheckedIn && !status.hasCheckedOut) {
        checkInBtn.disabled = true;
        checkOutBtn.disabled = false;
    } else {
        checkInBtn.disabled = true;
        checkOutBtn.disabled = true;
    }
}

// Mark attendance (check in or out)
async function markAttendance(type) {
    const employeeId = employeeIdInput.value.trim();
    
    if (!employeeId) {
        showMessage('Please enter your Employee ID', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employeeId,
                type
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message, 'success');
            loadAttendance();
            checkEmployeeStatus(employeeId);
        } else {
            showMessage(data.error || 'Failed to mark attendance', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Error:', error);
    }
}

// Load today's attendance
async function loadAttendance() {
    try {
        const response = await fetch('/api/attendance/today');
        const data = await response.json();
        
        if (response.ok && data.attendance && data.attendance.length > 0) {
            displayAttendance(data.attendance);
        } else {
            attendanceList.innerHTML = '<p class="no-data">No attendance records for today</p>';
        }
    } catch (error) {
        attendanceList.innerHTML = '<p class="error">Failed to load attendance</p>';
        console.error('Error:', error);
    }
}

// Display attendance records
function displayAttendance(records) {
    attendanceList.innerHTML = records.map(record => {
        const checkInTime = record.checkIn ? formatTime(record.checkIn) : 'N/A';
        const checkOutTime = record.checkOut ? formatTime(record.checkOut) : 'Pending';
        const workHours = record.workHours ? `${record.workHours.toFixed(1)}h` : '-';
        
        return `
            <div class="attendance-item">
                <div class="employee-info">
                    <strong>${record.employeeName}</strong>
                    <span class="employee-id">ID: ${record.employeeId}</span>
                </div>
                <div class="time-info">
                    <div class="time-detail">
                        <span class="time-label">In:</span>
                        <span class="time">${checkInTime}</span>
                    </div>
                    <div class="time-detail">
                        <span class="time-label">Out:</span>
                        <span class="time ${record.checkOut ? '' : 'pending'}">${checkOutTime}</span>
                    </div>
                    <div class="time-detail">
                        <span class="time-label">Hours:</span>
                        <span class="time-hours">${workHours}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

// Show message
function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}
