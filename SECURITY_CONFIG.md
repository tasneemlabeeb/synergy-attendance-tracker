# 🔒 Network Security Configuration Guide

## Current Configuration

### Your Office Network
- **Network Range**: `192.168.0.0/24`
- **Allowed IPs**: `192.168.0.1` - `192.168.0.254`
- **Your Current IP**: `192.168.0.103`

### Security Features
✅ IP Whitelisting (CIDR subnet support)
✅ Rate Limiting (10 attempts/hour per employee)
✅ Detailed access logging
✅ Testing mode for development

---

## 🚀 Quick Start

### 1. Testing Phase (Current Setup)
The system is currently in **testing mode** which allows localhost access.

**Test from your office:**
```bash
# Your current machine
http://192.168.0.103:3000

# Or localhost
http://localhost:3000
```

**Test blocking (from mobile data):**
- Disconnect from WiFi
- Use mobile data
- Try to check in - should be blocked ❌

### 2. Production Deployment

**Step 1: Disable Testing Mode**
Edit `server.js` line 16:
```javascript
const ALLOW_LOCALHOST_FOR_TESTING = false;  // Change true to false
```

**Step 2: Restart the server**
```bash
npm start
```

**Step 3: Verify**
- Try from office WiFi → Should work ✅
- Try from home/mobile → Should be blocked ❌

---

## 📍 Adding Multiple Office Locations

If you have multiple offices or branches:

Edit `server.js` lines 10-15:
```javascript
const ALLOWED_IPS = [
    '192.168.0.0/24',      // Main office (current)
    '192.168.1.0/24',      // Branch office
    '10.0.0.0/24',         // Another location
    '172.16.0.100',        // Specific IP for VPN
];
```

---

## 🔍 Finding Your Office IP

### On Mac/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### On Windows:
```cmd
ipconfig
```

### Understanding CIDR Notation:
- `192.168.0.0/24` = Allows `192.168.0.1` to `192.168.0.254` (256 IPs)
- `192.168.0.0/25` = Allows `192.168.0.1` to `192.168.0.126` (128 IPs)
- `10.0.0.0/16` = Allows `10.0.0.1` to `10.0.255.254` (65,536 IPs)

---

## 🛡️ Security Features Explained

### 1. IP Whitelisting
Only specified networks can mark attendance.
- **Benefit**: Prevents remote attendance marking
- **Log**: `✅ IP 192.168.0.105 is within allowed network`

### 2. Rate Limiting
Prevents spam and abuse.
- **Limit**: 10 check-in/out attempts per hour
- **Per**: Employee ID
- **Auto-reset**: Every hour
- **Log**: `🚫 Rate limit exceeded for employee: EMP001`

### 3. Access Logging
Every attendance attempt is logged:
```
📍 Attendance request from IP: 192.168.0.105
✅ IP 192.168.0.105 is within allowed network 192.168.0.0/24
✅ Check-in successful: EMP001 (John Doe) from IP 192.168.0.105
```

Blocked attempts:
```
📍 Attendance request from IP: 103.248.12.55
❌ IP 103.248.12.55 is NOT in allowed networks
🚫 BLOCKED: Attendance attempt from unauthorized IP: 103.248.12.55
```

---

## 🔧 Troubleshooting

### Problem: "Access denied" from office WiFi

**Solution 1: Check your IP**
```bash
ifconfig | grep "inet "
```
Make sure it starts with `192.168.0.`

**Solution 2: Check server configuration**
Make sure `192.168.0.0/24` is in `ALLOWED_IPS` array

**Solution 3: Check logs**
Server console will show:
- `✅ IP x.x.x.x is within allowed network` (allowed)
- `❌ IP x.x.x.x is NOT in allowed networks` (blocked)

### Problem: Can't access from other devices on same network

**Solution**: Use the server's IP instead of localhost
```
# Instead of
http://localhost:3000

# Use
http://192.168.0.103:3000
```

### Problem: Rate limit error

**Solution**: Wait 1 hour or restart the server to clear limits
```bash
# Kill and restart
pkill -f "node server.js"
npm start
```

---

## 📊 Monitoring Access

### View Real-time Logs
Server console shows all access attempts:
```
✅ Check-in successful: EMP001 (John Doe) from IP 192.168.0.105
✅ Check-out successful: EMP002 from IP 192.168.0.110 | Work Hours: 8.5
🚫 BLOCKED: Attendance attempt from unauthorized IP: 103.248.12.55
🚫 Rate limit exceeded for employee: EMP003
```

### Log Analysis Tips
- Look for `🚫 BLOCKED` entries to identify unauthorized access attempts
- Monitor `Rate limit exceeded` to identify potential abuse
- Track IPs to ensure employees are on office network

---

## 🚨 Security Best Practices

### For Production:
1. ✅ Disable testing mode (`ALLOW_LOCALHOST_FOR_TESTING = false`)
2. ✅ Use HTTPS (SSL certificate) for production
3. ✅ Keep server behind firewall
4. ✅ Regularly review access logs
5. ✅ Update allowed IPs when network changes
6. ✅ Use strong admin password
7. ✅ Regular backups of data folder

### Network Setup:
1. ✅ Static IP or DHCP reservation for server
2. ✅ Configure router to allow internal network access
3. ✅ Block external port 3000 on router/firewall
4. ✅ Use VPN if remote access is needed

### Monitoring:
1. ✅ Check logs daily for unauthorized attempts
2. ✅ Monitor rate limit triggers
3. ✅ Review attendance data for anomalies
4. ✅ Keep employee list updated

---

## 🆘 Emergency Procedures

### If System is Compromised:
1. Stop the server immediately: `pkill -f "node server.js"`
2. Review logs for suspicious activity
3. Change admin password in `server.js`
4. Update `ALLOWED_IPS` to restrict further
5. Restart with new configuration

### If Network Changes:
1. Find new office IP range
2. Update `ALLOWED_IPS` in `server.js`
3. Restart server
4. Test from office WiFi
5. Inform employees of any access changes

---

## 📞 Support Checklist

When reporting issues, provide:
- [ ] Your IP address (from `ifconfig`)
- [ ] Server logs (from terminal)
- [ ] Which network you're connected to
- [ ] Screenshots of error messages
- [ ] Time of the issue

---

## 🎯 Current Status

**Server Configuration:**
- Network: `192.168.0.0/24` ✅
- Testing Mode: `ENABLED` ⚠️
- Rate Limit: `10/hour` ✅
- Logging: `ENABLED` ✅

**Next Steps:**
1. Test from office WiFi
2. Test from mobile data (should be blocked)
3. If tests pass, disable testing mode
4. Deploy to production server
5. Inform employees

---

## 📝 Configuration Checklist

- [ ] Office network IP range identified
- [ ] `ALLOWED_IPS` configured in server.js
- [ ] Tested from office WiFi (should work)
- [ ] Tested from outside network (should be blocked)
- [ ] Testing mode disabled for production
- [ ] Admin password secured
- [ ] Server deployed on dedicated machine
- [ ] Employees informed of access method
- [ ] Monitoring and logging active
- [ ] Backup procedures in place

---

**Last Updated**: October 5, 2025
**Configuration**: Office Network 192.168.0.0/24
**Status**: Testing Mode - Ready for Production
