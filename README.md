# 📋 Synergy Solutions & Advisory Ltd. - Attendance Management System

A comprehensive web-based attendance tracking system with admin dashboard, employee management, and Excel reporting capabilities. Attendance can only be marked from office WiFi network.

## ✨ Features

### For Employees:
- ⏰ Check-in and Check-out tracking
- 📊 View today's attendance in real-time
- ⏱️ Automatic work hours calculation
- 🔒 IP-based restriction (office network only)
- � Responsive design

### For Admins:
- � Secure admin login
- � Complete employee management (Add, Edit, Delete)
- � View all attendance records with filtering
- 📈 Export monthly reports to Excel
- 📧 Email: info@synergy.com.bd
- 🔑 Password: C?18dr!4SYN-attdn

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your office IP addresses in `server.js`:
```javascript
const ALLOWED_IPS = [
    '127.0.0.1',           // Keep this for local testing
    '::1',                 
    '::ffff:127.0.0.1',    
    '192.168.1.100',       // ADD YOUR OFFICE IP HERE
    '10.0.0.50',           // ADD MORE IPs AS NEEDED
];
```

### Finding Your Office IP Address

**On macOS/Linux:**
```bash
ifconfig | grep "inet "
```

**On Windows:**
```cmd
ipconfig
```

Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)

### Running the Application

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The application will be available at: `http://localhost:3000`

## 📁 Project Structure

```
synergy-attendance-tracker/
├── public/
│   ├── index.html        # Employee attendance interface
│   ├── script.js         # Employee frontend JavaScript
│   ├── style.css         # Employee interface styling
│   ├── admin.html        # Admin dashboard
│   ├── admin-script.js   # Admin frontend JavaScript
│   └── admin-style.css   # Admin dashboard styling
├── data/
│   ├── attendance.json   # Attendance records (auto-generated)
│   └── employees.json    # Employee database (auto-generated)
├── server.js             # Express server with all APIs
├── package.json          # Dependencies
└── README.md             # Documentation
```

## 🌐 Access Points

- **Employee Portal**: `http://localhost:3000/`
- **Admin Dashboard**: `http://localhost:3000/admin.html`

## 🔧 Configuration

### Changing the Port

Edit `server.js`:
```javascript
const PORT = 3000; // Change to your desired port
```

### Adding More IP Addresses

To allow multiple office locations or networks, add their IPs to the `ALLOWED_IPS` array in `server.js`:

```javascript
const ALLOWED_IPS = [
    '127.0.0.1',
    '192.168.1.100',    // Office Location 1
    '192.168.2.50',     // Office Location 2
    '10.0.0.25',        // Office Location 3
];
```

## 📊 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/check` - Check authentication status

### Employee Management (Admin Only)
- `GET /api/admin/employees` - Get all employees
- `POST /api/admin/employees` - Add new employee
- `PUT /api/admin/employees/:employeeId` - Update employee
- `DELETE /api/admin/employees/:employeeId` - Delete employee

### Attendance
- `POST /api/attendance` - Mark check-in or check-out
  - Body: `{ employeeId: string, type: 'in' | 'out' }`
- `GET /api/attendance/status/:employeeId` - Get employee's today status
- `GET /api/attendance/today` - Get today's attendance records

### Admin Attendance (Admin Only)
- `GET /api/admin/attendance/all` - Get all attendance records
- `GET /api/admin/attendance/range` - Get attendance by date range
- `GET /api/admin/attendance/export` - Export monthly Excel report

## 🔒 Security Features

- **IP-based access control**: Only requests from allowed IP addresses can mark attendance
- **Duplicate prevention**: Employees cannot mark attendance twice on the same day
- **Input validation**: Server validates all incoming data

## 📱 Usage

1. Employees open the web app from their office network
2. Enter their Employee ID and Name
3. Click "Mark Attendance"
4. View real-time attendance list on the same page

## 🛠️ Troubleshooting

### "Access denied" error
- Make sure you're connected to the office WiFi
- Verify the office IP is correctly added to `ALLOWED_IPS` in `server.js`
- Check your current IP with `ifconfig` or `ipconfig`

### "Already marked attendance today" error
- Each employee can only mark attendance once per day
- Wait until the next day to mark attendance again

### Server won't start
- Make sure port 3000 is not in use
- Run `npm install` to ensure all dependencies are installed

## � How to Use

### For Employees:
1. Open `http://localhost:3000/`
2. Enter your Employee ID
3. Click "Check In" when you arrive
4. Click "Check Out" when you leave
5. View your work hours for the day

### For Admins:
1. Open `http://localhost:3000/admin.html`
2. Login with:
   - Email: `info@synergy.com.bd`
   - Password: `C?18dr!4SYN-attdn`
3. **Employee Management Tab**: Add, edit, or delete employees
4. **Attendance Tab**: View all attendance records with date filtering
5. **Reports Tab**: Export monthly attendance to Excel

## 💡 Future Enhancements

- SMS/Email notifications for check-in/out
- Late arrival and early departure tracking
- Leave management system
- Department-wise reports
- Mobile app version
- Database integration (MongoDB/PostgreSQL)
- Biometric integration

## 📝 License

MIT License - Feel free to use and modify for your needs.

## 🤝 Support

For issues or questions, please check the troubleshooting section or create an issue in the repository.
