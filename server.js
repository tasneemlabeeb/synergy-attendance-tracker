const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

const app = express();
const PORT = 9876;

// ========================================
// OFFICE NETWORK CONFIGURATION
// ========================================
const ALLOWED_IPS = [
    '103.187.94.18/32',    // Synergy Office Public IP (IPv4)
    '2401:f40:1215:147:b823:7a1:4566:8771/128',  // Synergy Office Public IP (IPv6)
    // Add more office locations if needed:
    // '103.187.94.19/32',   // Another office location
];

// For testing purposes, you can temporarily allow localhost
// Set to false in production!
const ALLOW_LOCALHOST_FOR_TESTING = false;

// ========================================
// RATE LIMITING CONFIGURATION
// ========================================
const MAX_ATTEMPTS_PER_HOUR = 10;
const rateLimitStore = new Map();

// Admin credentials
const ADMIN_EMAIL = 'info@synergy.com.bd';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('C?18dr!4SYN-attdn', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'synergy-attendance-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express.static('public'));

// Path to data files
const DATA_FILE = path.join(__dirname, 'data', 'attendance.json');
const EMPLOYEES_FILE = path.join(__dirname, 'data', 'employees.json');

// Initialize data files if they don't exist
async function initializeDataFiles() {
    const dataDir = path.join(__dirname, 'data');
    
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
    
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([]));
    }
    
    try {
        await fs.access(EMPLOYEES_FILE);
    } catch {
        await fs.writeFile(EMPLOYEES_FILE, JSON.stringify([]));
    }
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
}

// ========================================
// IP VALIDATION FUNCTIONS
// ========================================

// Get client IP address
function getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.connection.socket?.remoteAddress;
}

// Convert IP string to number for subnet calculations
function ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Check if IP is in subnet (CIDR notation support)
function isIPInSubnet(ip, subnet) {
    const [subnetIP, maskBits] = subnet.split('/');
    const mask = ~(Math.pow(2, 32 - parseInt(maskBits)) - 1);
    
    const ipNum = ipToNumber(ip);
    const subnetNum = ipToNumber(subnetIP);
    
    return (ipNum & mask) === (subnetNum & mask);
}

// Main IP validation function with enhanced security
function isIPAllowed(ip) {
    // Clean up IPv6-mapped IPv4 addresses
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    // Allow localhost for testing (remove in production)
    if (ALLOW_LOCALHOST_FOR_TESTING) {
        if (cleanIP === '127.0.0.1' || cleanIP === '::1' || ip === '::1') {
            console.log('⚠️  Warning: Localhost access allowed for testing');
            return true;
        }
    }
    
    // Check if IP is in allowed list
    for (const allowedIP of ALLOWED_IPS) {
        if (allowedIP.includes('/')) {
            // CIDR notation (e.g., 192.168.0.0/24)
            if (isIPInSubnet(cleanIP, allowedIP)) {
                console.log(`✅ IP ${cleanIP} is within allowed network ${allowedIP}`);
                return true;
            }
        } else {
            // Exact match
            if (cleanIP === allowedIP) {
                console.log(`✅ IP ${cleanIP} matches allowed IP`);
                return true;
            }
        }
    }
    
    console.log(`❌ IP ${cleanIP} is NOT in allowed networks`);
    return false;
}

// ========================================
// RATE LIMITING FUNCTIONS
// ========================================

function checkRateLimit(employeeId) {
    const now = Date.now();
    const key = `${employeeId}`;
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + 3600000 });
        return true;
    }
    
    const data = rateLimitStore.get(key);
    
    if (now > data.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + 3600000 });
        return true;
    }
    
    if (data.count >= MAX_ATTEMPTS_PER_HOUR) {
        console.log(`🚫 Rate limit exceeded for employee: ${employeeId}`);
        return false;
    }
    
    data.count++;
    return true;
}

// Clear expired rate limit entries every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 3600000);

// Get today's date string (YYYY-MM-DD)
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Helper function to read employees
async function getEmployees() {
    try {
        const data = await fs.readFile(EMPLOYEES_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper function to save employees
async function saveEmployees(employees) {
    await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(employees, null, 2));
}

// ==================== ADMIN AUTHENTICATION ====================

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        if (email === ADMIN_EMAIL && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
            req.session.isAdmin = true;
            req.session.email = email;
            res.json({ 
                message: 'Login successful',
                admin: { email: ADMIN_EMAIL }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Check admin session
app.get('/api/admin/check', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.json({ 
            isAuthenticated: true,
            admin: { email: req.session.email }
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// ==================== EMPLOYEE MANAGEMENT ====================

// Get all employees
app.get('/api/admin/employees', isAuthenticated, async (req, res) => {
    try {
        const employees = await getEmployees();
        res.json({ employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new employee
app.post('/api/admin/employees', isAuthenticated, async (req, res) => {
    try {
        const { employeeId, employeeName, email, phone, department, position } = req.body;
        
        if (!employeeId || !employeeName) {
            return res.status(400).json({ error: 'Employee ID and name are required' });
        }
        
        const employees = await getEmployees();
        
        // Check if employee ID already exists
        if (employees.some(emp => emp.employeeId === employeeId)) {
            return res.status(400).json({ error: 'Employee ID already exists' });
        }
        
        const newEmployee = {
            employeeId,
            employeeName,
            email: email || '',
            phone: phone || '',
            department: department || '',
            position: position || '',
            createdAt: new Date().toISOString(),
            isActive: true
        };
        
        employees.push(newEmployee);
        await saveEmployees(employees);
        
        res.json({ 
            message: 'Employee added successfully',
            employee: newEmployee
        });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update employee
app.put('/api/admin/employees/:employeeId', isAuthenticated, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { employeeName, email, phone, department, position, isActive } = req.body;
        
        const employees = await getEmployees();
        const index = employees.findIndex(emp => emp.employeeId === employeeId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        employees[index] = {
            ...employees[index],
            employeeName: employeeName || employees[index].employeeName,
            email: email !== undefined ? email : employees[index].email,
            phone: phone !== undefined ? phone : employees[index].phone,
            department: department !== undefined ? department : employees[index].department,
            position: position !== undefined ? position : employees[index].position,
            isActive: isActive !== undefined ? isActive : employees[index].isActive,
            updatedAt: new Date().toISOString()
        };
        
        await saveEmployees(employees);
        
        res.json({ 
            message: 'Employee updated successfully',
            employee: employees[index]
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete employee
app.delete('/api/admin/employees/:employeeId', isAuthenticated, async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const employees = await getEmployees();
        const filteredEmployees = employees.filter(emp => emp.employeeId !== employeeId);
        
        if (employees.length === filteredEmployees.length) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        await saveEmployees(filteredEmployees);
        
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ATTENDANCE SYSTEM ====================

// API: Mark attendance (Check-in or Check-out)
app.post('/api/attendance', async (req, res) => {
    try {
        const clientIP = getClientIP(req);
        console.log(`📍 Attendance request from IP: ${clientIP}`);
        
        // 1. Check if request is from office IP
        if (!isIPAllowed(clientIP)) {
            console.log(`🚫 BLOCKED: Attendance attempt from unauthorized IP: ${clientIP}`);
            return res.status(403).json({
                error: '⚠️ Attendance can only be marked from office premises (192.168.0.x network)',
                yourIP: clientIP.replace(/^::ffff:/, ''),
                allowedNetworks: ALLOWED_IPS
            });
        }
        
        const { employeeId, type } = req.body; // type: 'in' or 'out'
        
        if (!employeeId) {
            return res.status(400).json({
                error: 'Employee ID is required'
            });
        }
        
        // 2. Check rate limiting
        if (!checkRateLimit(employeeId)) {
            return res.status(429).json({
                error: '⚠️ Too many attempts. Please try again in an hour.',
                retryAfter: 3600
            });
        }
        
        // Verify employee exists
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.employeeId === employeeId && emp.isActive);
        
        if (!employee) {
            return res.status(404).json({
                error: 'Employee not found or inactive'
            });
        }
        
        // Read existing attendance data
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const attendance = JSON.parse(data);
        
        const today = getTodayDateString();
        const now = new Date();
        
        // Find today's attendance record for this employee
        const todayRecord = attendance.find(
            record => record.employeeId === employeeId && record.date === today
        );
        
        if (type === 'in') {
            // Check-in
            if (todayRecord && todayRecord.checkIn) {
                return res.status(400).json({
                    error: 'You have already checked in today'
                });
            }
            
            if (todayRecord) {
                // Update existing record
                todayRecord.checkIn = now.toISOString();
                todayRecord.checkInIP = clientIP;
            } else {
                // Create new record
                attendance.push({
                    employeeId,
                    employeeName: employee.employeeName,
                    date: today,
                    checkIn: now.toISOString(),
                    checkInIP: clientIP,
                    checkOut: null,
                    checkOutIP: null
                });
            }
            
            await fs.writeFile(DATA_FILE, JSON.stringify(attendance, null, 2));
            
            console.log(`✅ Check-in successful: ${employeeId} (${employee.employeeName}) from IP ${clientIP}`);
            
            res.json({
                message: 'Checked in successfully!',
                checkIn: now.toISOString()
            });
            
        } else if (type === 'out') {
            // Check-out
            if (!todayRecord || !todayRecord.checkIn) {
                return res.status(400).json({
                    error: 'You must check in before checking out'
                });
            }
            
            if (todayRecord.checkOut) {
                return res.status(400).json({
                    error: 'You have already checked out today'
                });
            }
            
            todayRecord.checkOut = now.toISOString();
            todayRecord.checkOutIP = clientIP;
            
            // Calculate work hours
            const checkInTime = new Date(todayRecord.checkIn);
            const checkOutTime = now;
            const workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);
            todayRecord.workHours = parseFloat(workHours);
            
            await fs.writeFile(DATA_FILE, JSON.stringify(attendance, null, 2));
            
            console.log(`✅ Check-out successful: ${employeeId} from IP ${clientIP} | Work Hours: ${workHours}`);
            
            res.json({
                message: 'Checked out successfully!',
                checkOut: now.toISOString(),
                workHours: workHours
            });
        } else {
            return res.status(400).json({
                error: 'Invalid type. Use "in" or "out"'
            });
        }
        
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Get employee's attendance status for today
app.get('/api/attendance/status/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const attendance = JSON.parse(data);
        
        const today = getTodayDateString();
        const todayRecord = attendance.find(
            record => record.employeeId === employeeId && record.date === today
        );
        
        if (todayRecord) {
            res.json({
                hasCheckedIn: !!todayRecord.checkIn,
                hasCheckedOut: !!todayRecord.checkOut,
                checkIn: todayRecord.checkIn,
                checkOut: todayRecord.checkOut,
                workHours: todayRecord.workHours || null
            });
        } else {
            res.json({
                hasCheckedIn: false,
                hasCheckedOut: false,
                checkIn: null,
                checkOut: null,
                workHours: null
            });
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: Get today's attendance
app.get('/api/attendance/today', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const attendance = JSON.parse(data);
        
        const today = getTodayDateString();
        const todayAttendance = attendance
            .filter(record => record.date === today)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        res.json({
            date: today,
            count: todayAttendance.length,
            attendance: todayAttendance
        });
        
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// API: Get all attendance (admin only)
app.get('/api/admin/attendance/all', isAuthenticated, async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const attendance = JSON.parse(data);
        
        res.json({
            total: attendance.length,
            attendance: attendance
        });
        
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// API: Get attendance with advanced filtering (admin only)
app.get('/api/admin/attendance/filter', isAuthenticated, async (req, res) => {
    try {
        const { employeeId, employeeName, department, month, year } = req.query;
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const attendance = JSON.parse(data);
        
        const employees = await getEmployees();
        
        // Enrich attendance with employee details
        const enrichedAttendance = attendance.map(record => {
            const employee = employees.find(emp => emp.employeeId === record.employeeId);
            return {
                ...record,
                department: employee ? employee.department : 'N/A',
                position: employee ? employee.position : 'N/A'
            };
        });
        
        let filtered = enrichedAttendance;
        
        // Filter by employee ID
        if (employeeId && employeeId.trim() !== '') {
            filtered = filtered.filter(record => 
                record.employeeId.toLowerCase().includes(employeeId.toLowerCase())
            );
        }
        
        // Filter by employee name
        if (employeeName && employeeName.trim() !== '') {
            filtered = filtered.filter(record => 
                record.employeeName.toLowerCase().includes(employeeName.toLowerCase())
            );
        }
        
        // Filter by department
        if (department && department.trim() !== '') {
            filtered = filtered.filter(record => 
                record.department && record.department.toLowerCase() === department.toLowerCase()
            );
        }
        
        // Filter by month and year
        if (month && year) {
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() + 1 === parseInt(month) && 
                       recordDate.getFullYear() === parseInt(year);
            });
        } else if (month) {
            // Filter by month only (current year)
            const currentYear = new Date().getFullYear();
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() + 1 === parseInt(month) && 
                       recordDate.getFullYear() === currentYear;
            });
        } else if (year) {
            // Filter by year only
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getFullYear() === parseInt(year);
            });
        }
        
        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({
            count: filtered.length,
            attendance: filtered,
            filters: { employeeId, employeeName, department, month, year }
        });
        
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// ==================== EXCEL EXPORT ====================

// Export monthly attendance to Excel with separate sheets per employee
app.get('/api/admin/attendance/export', isAuthenticated, async (req, res) => {
    try {
        const { month, year } = req.query;
        
        if (!month || !year) {
            return res.status(400).json({
                error: 'Month and year are required'
            });
        }
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const attendance = JSON.parse(data);
        const employees = await getEmployees();
        
        // Filter attendance for the specified month
        const filtered = attendance.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() + 1 === parseInt(month) && 
                   recordDate.getFullYear() === parseInt(year);
        });
        
        if (filtered.length === 0) {
            return res.status(404).json({
                error: 'No attendance records found for the selected period'
            });
        }
        
        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Synergy Solutions & Advisory Ltd.';
        workbook.created = new Date();
        
        // Group attendance by employee
        const employeeAttendance = {};
        filtered.forEach(record => {
            if (!employeeAttendance[record.employeeId]) {
                employeeAttendance[record.employeeId] = [];
            }
            employeeAttendance[record.employeeId].push(record);
        });
        
        // Create Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary');
        
        // Add title to summary
        summarySheet.mergeCells('A1:G1');
        summarySheet.getCell('A1').value = 'Synergy Solutions & Advisory Ltd.';
        summarySheet.getCell('A1').font = { bold: true, size: 16 };
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };
        
        summarySheet.mergeCells('A2:G2');
        summarySheet.getCell('A2').value = `Attendance Summary - ${getMonthName(month)} ${year}`;
        summarySheet.getCell('A2').font = { bold: true, size: 14 };
        summarySheet.getCell('A2').alignment = { horizontal: 'center' };
        
        summarySheet.addRow([]);
        
        // Summary headers
        summarySheet.columns = [
            { header: 'Employee ID', key: 'employeeId', width: 15 },
            { header: 'Employee Name', key: 'employeeName', width: 25 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Position', key: 'position', width: 20 },
            { header: 'Days Present', key: 'daysPresent', width: 15 },
            { header: 'Total Hours', key: 'totalHours', width: 15 },
            { header: 'Avg Hours/Day', key: 'avgHours', width: 15 }
        ];
        
        const headerRow = summarySheet.getRow(4);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E3C72' }
        };
        
        // Add summary data
        Object.keys(employeeAttendance).forEach(empId => {
            const records = employeeAttendance[empId];
            const employee = employees.find(emp => emp.employeeId === empId);
            
            const totalHours = records.reduce((sum, record) => {
                return sum + (record.workHours || 0);
            }, 0);
            
            const daysPresent = records.length;
            const avgHours = daysPresent > 0 ? totalHours / daysPresent : 0;
            
            summarySheet.addRow({
                employeeId: empId,
                employeeName: records[0].employeeName,
                department: employee ? employee.department : 'N/A',
                position: employee ? employee.position : 'N/A',
                daysPresent: daysPresent,
                totalHours: totalHours.toFixed(2),
                avgHours: avgHours.toFixed(2)
            });
        });
        
        // Create separate sheet for each employee
        Object.keys(employeeAttendance).sort().forEach(empId => {
            const records = employeeAttendance[empId];
            const employee = employees.find(emp => emp.employeeId === empId);
            
            // Sanitize sheet name (Excel sheet names can't contain certain characters)
            const sheetName = empId.replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
            const worksheet = workbook.addWorksheet(sheetName);
            
            // Add employee header
            worksheet.mergeCells('A1:F1');
            worksheet.getCell('A1').value = `Employee: ${records[0].employeeName} (${empId})`;
            worksheet.getCell('A1').font = { bold: true, size: 14 };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            
            worksheet.mergeCells('A2:F2');
            worksheet.getCell('A2').value = `Department: ${employee ? employee.department : 'N/A'} | Position: ${employee ? employee.position : 'N/A'}`;
            worksheet.getCell('A2').font = { bold: true, size: 11 };
            worksheet.getCell('A2').alignment = { horizontal: 'center' };
            
            worksheet.addRow([]);
            
            // Set columns
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Day', key: 'day', width: 12 },
                { header: 'Check In', key: 'checkIn', width: 20 },
                { header: 'Check Out', key: 'checkOut', width: 20 },
                { header: 'Work Hours', key: 'workHours', width: 12 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            // Style header row
            const empHeaderRow = worksheet.getRow(4);
            empHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            empHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E3C72' }
            };
            
            // Sort records by date
            records.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Add data rows
            records.forEach(record => {
                const date = new Date(record.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const status = record.checkOut ? 'Complete' : 'Incomplete';
                
                const row = worksheet.addRow({
                    date: record.date,
                    day: dayName,
                    checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A',
                    checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A',
                    workHours: record.workHours ? record.workHours.toFixed(2) : 'N/A',
                    status: status
                });
                
                // Color code status
                if (status === 'Incomplete') {
                    row.getCell('status').font = { color: { argb: 'FFDC3545' } };
                } else {
                    row.getCell('status').font = { color: { argb: 'FF28A745' } };
                }
            });
            
            // Add summary at the bottom
            worksheet.addRow([]);
            const totalHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
            const avgHours = records.length > 0 ? totalHours / records.length : 0;
            
            const summaryRow = worksheet.addRow({
                date: 'TOTAL',
                day: '',
                checkIn: '',
                checkOut: '',
                workHours: totalHours.toFixed(2),
                status: `Avg: ${avgHours.toFixed(2)}h`
            });
            summaryRow.font = { bold: true };
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE9ECEF' }
            };
        });
        
        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Synergy_Attendance_${getMonthName(month)}_${year}.xlsx`
        );
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Helper function to get month name
function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1];
}

// Initialize and start server
initializeDataFiles().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Synergy Solutions & Advisory Ltd. - Attendance Tracker`);
        console.log(`📍 Server running on http://localhost:${PORT}`);
        console.log(`� Admin: ${ADMIN_EMAIL}`);
        console.log(`🔒 Allowed IPs: ${ALLOWED_IPS.join(', ')}`);
        console.log(`⚠️  Remember to configure office IP addresses in server.js`);
    });
});
