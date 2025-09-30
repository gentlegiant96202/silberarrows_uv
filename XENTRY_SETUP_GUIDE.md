# XENTRY Remote Desktop Setup Guide

## Overview
This guide will help you set up a UK-based remote desktop for XENTRY diagnostics and programming, accessible through your Next.js application.

## AWS Infrastructure Options

### Option 1: AWS WorkSpaces (Recommended)
**Cost**: ~$25-50/month per user
**Pros**: Managed service, automatic updates, easy scaling
**UK Region**: London (eu-west-2)

#### Setup Steps:
1. **Create WorkSpace Directory**
   ```bash
   # Using AWS CLI
   aws workspaces create-workspace-directory \
     --directory-id d-1234567890 \
     --region eu-west-2
   ```

2. **Launch WorkSpace**
   - Go to AWS WorkSpaces console
   - Select London (eu-west-2) region
   - Choose Windows 10 or Windows Server
   - Select appropriate bundle (Standard, Performance, Power, or Graphics)

### Option 2: AWS EC2 Windows Server
**Cost**: ~$15-100/month depending on instance size
**Pros**: Full control, customizable
**UK Region**: London (eu-west-2)

#### Setup Steps:
1. **Launch EC2 Instance**
   - AMI: Windows Server 2022 Base
   - Instance Type: t3.medium (2 vCPU, 4 GB RAM) minimum
   - Region: eu-west-2 (London)
   - Storage: 30 GB minimum

2. **Configure Security Group**
   ```json
   {
     "Inbound Rules": [
       {
         "Type": "RDP",
         "Protocol": "TCP",
         "Port": 3389,
         "Source": "YOUR_IP_RANGE"
       }
     ]
   }
   ```

3. **Get Administrator Password**
   - Select instance in EC2 console
   - Click "Connect" → "RDP client"
   - Click "Get Password"
   - Upload your key pair to decrypt password

## Environment Configuration

### 1. Add Environment Variables
Create or update your `.env.local` file:

```bash
# XENTRY Remote Desktop Configuration
XENTRY_UK_SERVER_IP=YOUR_ACTUAL_UK_SERVER_IP
XENTRY_UK_SERVER_USERNAME=Administrator
XENTRY_UK_SERVER_PORT=3389

# Optional: For additional security
XENTRY_ACCESS_TOKEN=your_secure_token_here
```

### 2. Update RDP Configuration
Replace `YOUR_UK_SERVER_IP` in the following files with your actual server IP:
- `/app/api/xentry/rdp/route.ts`
- Update the display in the XENTRY tab component

## Security Considerations

### 1. Network Security
- **Restrict RDP Access**: Only allow connections from specific IP ranges
- **Use VPN**: Consider requiring VPN access before RDP connection
- **Firewall Rules**: Configure Windows Firewall on the remote desktop

### 2. Authentication
- **Strong Passwords**: Use complex passwords for administrator account
- **Multi-Factor Authentication**: Enable MFA where possible
- **Regular Updates**: Keep Windows and RDP updated

### 3. Monitoring
- **CloudWatch**: Monitor EC2/WorkSpace usage
- **Access Logs**: Track who connects and when
- **Alerting**: Set up alerts for unusual access patterns

## XENTRY Software Installation

### 1. Prerequisites
- Windows 10/11 or Windows Server 2019/2022
- .NET Framework 4.8 or later
- Visual C++ Redistributables
- Administrator privileges

### 2. Installation Steps
1. Download XENTRY software from Mercedes-Benz
2. Install with administrator privileges
3. Configure network settings
4. Test diagnostics functionality

### 3. Configuration
- Set up user accounts for technicians
- Configure diagnostic profiles
- Test with sample vehicles

## Testing the Setup

### 1. Test RDP File Generation
```bash
curl -X GET http://localhost:3000/api/xentry/rdp
```

### 2. Test RDP Connection
1. Download the RDP file from your application
2. Double-click to open
3. Enter credentials when prompted
4. Verify connection to UK desktop

### 3. Test XENTRY Access
1. Connect to remote desktop
2. Launch XENTRY software
3. Verify diagnostics functionality

## Troubleshooting

### Common Issues

#### 1. RDP Connection Failed
- Check security group rules
- Verify IP address is correct
- Ensure Windows Firewall allows RDP

#### 2. XENTRY Software Issues
- Check .NET Framework installation
- Verify administrator privileges
- Check network connectivity

#### 3. Performance Issues
- Consider upgrading instance type
- Check network latency
- Monitor resource usage

### Support Contacts
- AWS Support: For infrastructure issues
- Mercedes-Benz Support: For XENTRY software issues
- Internal IT: For application integration

## Cost Optimization

### 1. Instance Scheduling
- Use AWS Instance Scheduler to stop/start EC2 instances
- Schedule WorkSpaces for business hours only

### 2. Right-Sizing
- Monitor usage patterns
- Adjust instance types based on actual usage
- Use Spot Instances for non-critical workloads

### 3. Reserved Instances
- Consider Reserved Instances for predictable workloads
- Use Savings Plans for flexible usage

## Maintenance

### 1. Regular Updates
- Windows updates
- XENTRY software updates
- Security patches

### 2. Backup Strategy
- Regular snapshots of EC2 instances
- Backup XENTRY configurations
- Document custom settings

### 3. Monitoring
- Set up CloudWatch alarms
- Monitor costs and usage
- Regular security audits

## Next Steps

1. **Set up AWS infrastructure** (EC2 or WorkSpaces)
2. **Configure environment variables** in your application
3. **Install XENTRY software** on the remote desktop
4. **Test the complete workflow** from your application
5. **Train users** on the new XENTRY tab functionality
6. **Monitor and optimize** based on usage patterns

## Security Checklist

- [ ] Security group restricts RDP access to specific IPs
- [ ] Strong administrator password configured
- [ ] Windows Firewall properly configured
- [ ] Regular security updates scheduled
- [ ] Access logging enabled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] User training completed
- [ ] Security policies documented

