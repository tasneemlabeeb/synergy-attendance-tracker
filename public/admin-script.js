// Check authentication on page load
checkAuth();

// Login form
const loginForm = document.getElementById('loginForm');
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showLoginMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                showDashboard(data.admin.email);
            }, 1000);
        } else {
            showLoginMessage(data.error, 'error');
        }
    } catch (error) {
        showLoginMessage('Network error. Please try again.', 'error');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            showDashboard(data.admin.email);
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

function showLogin() {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
}

function showDashboard(email) {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    document.getElementById('adminEmail').textContent = email;
    loadEmployees();
    initializeFilters();
    loadAttendance();
    initializeReports();
}

function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
    loginMessage.style.display = 'block';
    setTimeout(() => {
        loginMessage.style.display = 'none';
    }, 5000);
}

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab panel
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
    });
});

// ==================== EMPLOYEE MANAGEMENT ====================

let employees = [];
let editingEmployeeId = null;

const employeeModal = document.getElementById('employeeModal');
const employeeForm = document.getElementById('employeeForm');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');

addEmployeeBtn.addEventListener('click', () => {
    editingEmployeeId = null;
    document.getElementById('modalTitle').textContent = 'Add Employee';
    document.getElementById('modalEmployeeId').disabled = false;
    employeeForm.reset();
    document.getElementById('modalIsActive').checked = true;
    employeeModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    employeeModal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    employeeModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === employeeModal) {
        employeeModal.style.display = 'none';
    }
});

employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeData = {
        employeeId: document.getElementById('modalEmployeeId').value.trim(),
        employeeName: document.getElementById('modalEmployeeName').value.trim(),
        email: document.getElementById('modalEmail').value.trim(),
        phone: document.getElementById('modalPhone').value.trim(),
        department: document.getElementById('modalDepartment').value.trim(),
        position: document.getElementById('modalPosition').value.trim(),
        isActive: document.getElementById('modalIsActive').checked
    };
    
    try {
        let response;
        if (editingEmployeeId) {
            // Update existing employee
            response = await fetch(`/api/admin/employees/${editingEmployeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
        } else {
            // Add new employee
            response = await fetch('/api/admin/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            employeeModal.style.display = 'none';
            loadEmployees();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
});

async function loadEmployees() {
    try {
        const response = await fetch('/api/admin/employees');
        const data = await response.json();
        
        if (response.ok) {
            employees = data.employees;
            displayEmployees(employees);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        document.getElementById('employeesList').innerHTML = '<p class="error">Failed to load employees</p>';
    }
}

function displayEmployees(employeesList) {
    const container = document.getElementById('employeesList');
    
    if (employeesList.length === 0) {
        container.innerHTML = '<p class="no-data">No employees found. Click "Add Employee" to get started.</p>';
        return;
    }
    
    container.innerHTML = employeesList.map(emp => `
        <div class="employee-card ${!emp.isActive ? 'inactive' : ''}">
            <div class="employee-header">
                <div>
                    <h3>${emp.employeeName}</h3>
                    <span class="employee-id-badge">ID: ${emp.employeeId}</span>
                    ${!emp.isActive ? '<span class="inactive-badge">Inactive</span>' : ''}
                </div>
                <div class="employee-actions">
                    <button class="btn-icon" onclick="editEmployee('${emp.employeeId}')" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="deleteEmployee('${emp.employeeId}')" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="employee-details">
                ${emp.email ? `<p>📧 ${emp.email}</p>` : ''}
                ${emp.phone ? `<p>📱 ${emp.phone}</p>` : ''}
                ${emp.department ? `<p>🏢 ${emp.department}</p>` : ''}
                ${emp.position ? `<p>💼 ${emp.position}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function editEmployee(employeeId) {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;
    
    editingEmployeeId = employeeId;
    document.getElementById('modalTitle').textContent = 'Edit Employee';
    document.getElementById('modalEmployeeId').value = employee.employeeId;
    document.getElementById('modalEmployeeId').disabled = true;
    document.getElementById('modalEmployeeName').value = employee.employeeName;
    document.getElementById('modalEmail').value = employee.email || '';
    document.getElementById('modalPhone').value = employee.phone || '';
    document.getElementById('modalDepartment').value = employee.department || '';
    document.getElementById('modalPosition').value = employee.position || '';
    document.getElementById('modalIsActive').checked = employee.isActive;
    
    employeeModal.style.display = 'block';
}

async function deleteEmployee(employeeId) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
        const response = await fetch(`/api/admin/employees/${employeeId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            loadEmployees();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// ==================== ATTENDANCE RECORDS ====================

document.getElementById('filterBtn').addEventListener('click', loadAttendance);
document.getElementById('clearFilterBtn').addEventListener('click', clearFilters);

// Initialize filter dropdowns
function initializeFilters() {
    // Populate year dropdown
    const filterYearSelect = document.getElementById('filterYear');
    const currentYear = new Date().getFullYear();
    
    filterYearSelect.innerHTML = '<option value="">All Years</option>';
    for (let i = 0; i < 3; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (i === 0) option.selected = true;
        filterYearSelect.appendChild(option);
    }
    
    // Set current month
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('filterMonth').value = currentMonth;
    
    // Populate departments from employees
    populateDepartmentFilter();
}

async function populateDepartmentFilter() {
    try {
        const response = await fetch('/api/admin/employees');
        const data = await response.json();
        
        if (response.ok) {
            const departments = [...new Set(data.employees
                .map(emp => emp.department)
                .filter(dept => dept && dept.trim() !== ''))];
            
            const select = document.getElementById('filterDepartment');
            select.innerHTML = '<option value="">All Departments</option>';
            
            departments.sort().forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async function loadAttendance() {
    try {
        const employeeId = document.getElementById('filterEmployeeId').value.trim();
        const employeeName = document.getElementById('filterEmployeeName').value.trim();
        const department = document.getElementById('filterDepartment').value;
        const month = document.getElementById('filterMonth').value;
        const year = document.getElementById('filterYear').value;
        
        // Build query parameters
        const params = new URLSearchParams();
        if (employeeId) params.append('employeeId', employeeId);
        if (employeeName) params.append('employeeName', employeeName);
        if (department) params.append('department', department);
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        
        const url = `/api/admin/attendance/filter?${params.toString()}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            displayAttendance(data.attendance);
            updateAttendanceSummary(data.attendance);
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        document.getElementById('attendanceTableBody').innerHTML = '<tr><td colspan="7" class="error">Failed to load attendance</td></tr>';
    }
}

function clearFilters() {
    document.getElementById('filterEmployeeId').value = '';
    document.getElementById('filterEmployeeName').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterMonth').value = new Date().getMonth() + 1;
    document.getElementById('filterYear').value = new Date().getFullYear();
    loadAttendance();
}

function updateAttendanceSummary(records) {
    const summaryDiv = document.getElementById('attendanceSummary');
    
    if (records.length === 0) {
        summaryDiv.style.display = 'none';
        return;
    }
    
    summaryDiv.style.display = 'flex';
    
    // Calculate statistics
    const uniqueEmployees = [...new Set(records.map(r => r.employeeId))].length;
    const totalHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const recordsWithHours = records.filter(r => r.workHours).length;
    const avgHours = recordsWithHours > 0 ? (totalHours / recordsWithHours).toFixed(2) : '0.00';
    
    document.getElementById('totalRecords').textContent = records.length;
    document.getElementById('totalEmployees').textContent = uniqueEmployees;
    document.getElementById('avgWorkHours').textContent = avgHours + ' hrs';
}

function displayAttendance(attendanceList) {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (attendanceList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No attendance records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = attendanceList.map(record => `
        <tr>
            <td>${record.employeeId}</td>
            <td>${record.employeeName}</td>
            <td>${record.department || 'N/A'}</td>
            <td>${record.date}</td>
            <td>${record.checkIn ? formatDateTime(record.checkIn) : 'N/A'}</td>
            <td>${record.checkOut ? formatDateTime(record.checkOut) : '<span class="status-pending">Pending</span>'}</td>
            <td>${record.workHours ? '<span class="hours-badge">' + record.workHours.toFixed(2) + ' hrs</span>' : 'N/A'}</td>
        </tr>
    `).join('');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

// ==================== REPORTS ====================

function initializeReports() {
    const yearSelect = document.getElementById('reportYear');
    const currentYear = new Date().getFullYear();
    
    // Populate years (current year and 2 previous years)
    for (let i = 0; i < 3; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (i === 0) option.selected = true;
        yearSelect.appendChild(option);
    }
    
    // Set current month
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('reportMonth').value = currentMonth;
}

document.getElementById('exportBtn').addEventListener('click', async () => {
    const month = document.getElementById('reportMonth').value;
    const year = document.getElementById('reportYear').value;
    
    try {
        const response = await fetch(`/api/admin/attendance/export?month=${month}&year=${year}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${month}_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            alert('Report downloaded successfully!');
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to export report');
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Export error:', error);
    }
});

// ==================== IP WHITELIST MANAGEMENT ====================

let ipsData = [];
let currentIPId = null;
const ipModal = document.getElementById('ipModal');
const ipForm = document.getElementById('ipForm');

// Load current IP address
async function loadCurrentIP() {
    try {
        const response = await fetch('/api/admin/my-ip');
        const data = await response.json();
        
        const ipDisplay = document.getElementById('currentIP');
        ipDisplay.innerHTML = `
            <strong>${data.ip}</strong>
            ${data.isAllowed ? 
                '<span class="status-badge status-active">✅ Allowed</span>' : 
                '<span class="status-badge status-inactive">❌ Not Allowed</span>'}
        `;
    } catch (error) {
        console.error('Error loading current IP:', error);
        document.getElementById('currentIP').textContent = 'Error loading IP';
    }
}

// Load all IP addresses
async function loadIPs() {
    try {
        const response = await fetch('/api/admin/allowed-ips');
        const data = await response.json();
        
        ipsData = data.ips;
        displayIPs();
        
        if (data.testingMode) {
            const ipsList = document.getElementById('ipsList');
            const warning = document.createElement('div');
            warning.className = 'info-card warning-card';
            warning.innerHTML = `
                <h4>⚠️ Testing Mode Active</h4>
                <p>Localhost connections are currently allowed. Disable testing mode in production!</p>
            `;
            ipsList.prepend(warning);
        }
    } catch (error) {
        console.error('Error loading IPs:', error);
        document.getElementById('ipsList').innerHTML = '<p class="error">Failed to load IP addresses</p>';
    }
}

// Display IP addresses
function displayIPs() {
    const ipsList = document.getElementById('ipsList');
    
    if (ipsData.length === 0) {
        ipsList.innerHTML = '<p class="no-data">No IP addresses configured. Add your first IP address!</p>';
        return;
    }
    
    ipsList.innerHTML = ipsData.map(ip => `
        <div class="employee-card ip-card ${!ip.isActive ? 'inactive' : ''}">
            <div class="employee-info">
                <div class="employee-name">
                    <strong>${ip.ipAddress}</strong>
                    ${ip.isActive ? 
                        '<span class="status-badge status-active">Active</span>' : 
                        '<span class="status-badge status-inactive">Inactive</span>'}
                </div>
                <div class="employee-details">
                    <p><strong>Description:</strong> ${ip.description}</p>
                    <p><strong>Added:</strong> ${new Date(ip.createdAt).toLocaleDateString()}</p>
                    ${ip.createdBy ? `<p><strong>Added by:</strong> ${ip.createdBy}</p>` : ''}
                </div>
            </div>
            <div class="employee-actions">
                <button class="btn-edit" onclick="editIP(${ip.id})">Edit</button>
                <button class="btn-delete" onclick="deleteIP(${ip.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add IP button
document.getElementById('addIPBtn').addEventListener('click', () => {
    currentIPId = null;
    document.getElementById('ipModalTitle').textContent = 'Add IP Address';
    document.getElementById('modalIPAddress').value = '';
    document.getElementById('modalIPDescription').value = '';
    document.getElementById('modalIPIsActive').checked = true;
    ipModal.style.display = 'block';
});

// Close IP modal
document.getElementById('ipModalClose').addEventListener('click', () => {
    ipModal.style.display = 'none';
});

document.getElementById('ipCancelBtn').addEventListener('click', () => {
    ipModal.style.display = 'none';
});

// Edit IP
window.editIP = function(id) {
    const ip = ipsData.find(i => i.id === id);
    if (!ip) return;
    
    currentIPId = id;
    document.getElementById('ipModalTitle').textContent = 'Edit IP Address';
    document.getElementById('modalIPAddress').value = ip.ipAddress;
    document.getElementById('modalIPDescription').value = ip.description;
    document.getElementById('modalIPIsActive').checked = ip.isActive;
    ipModal.style.display = 'block';
};

// Delete IP
window.deleteIP = async function(id) {
    const ip = ipsData.find(i => i.id === id);
    if (!ip) return;
    
    if (!confirm(`Are you sure you want to delete IP address: ${ip.ipAddress}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/allowed-ips/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            loadIPs();
            loadCurrentIP(); // Refresh current IP status
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Delete error:', error);
    }
};

// Submit IP form
ipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const ipData = {
        ipAddress: document.getElementById('modalIPAddress').value.trim(),
        description: document.getElementById('modalIPDescription').value.trim(),
        isActive: document.getElementById('modalIPIsActive').checked
    };
    
    try {
        const url = currentIPId ? 
            `/api/admin/allowed-ips/${currentIPId}` : 
            '/api/admin/allowed-ips';
        const method = currentIPId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ipData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            ipModal.style.display = 'none';
            loadIPs();
            loadCurrentIP(); // Refresh current IP status
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Save error:', error);
    }
});

// Initialize IP tab when switched to
const ipsTabBtn = document.querySelector('[data-tab="ips"]');
if (ipsTabBtn) {
    ipsTabBtn.addEventListener('click', () => {
        loadIPs();
        loadCurrentIP();
    });
}
