// XENTRY Remote Desktop Configuration
export const xentryConfig = {
  // Server Configuration
  server: {
    ip: process.env.XENTRY_UK_SERVER_IP || 'YOUR_UK_SERVER_IP',
    port: process.env.XENTRY_UK_SERVER_PORT || '3389',
    username: process.env.XENTRY_UK_SERVER_USERNAME || 'Administrator',
    region: 'eu-west-2', // London, UK
    location: 'London, UK',
  },
  
  // RDP Configuration
  rdp: {
    filename: 'XENTRY-UK-Desktop.rdp',
    authenticationLevel: 2,
    sessionBpp: 32,
    screenMode: 2,
    smartSizing: true,
    dynamicResolution: true,
    desktopScaleFactor: 100,
    redirectClipboard: true,
    redirectPrinters: true,
    redirectComPorts: true,
    redirectSmartCards: true,
    redirectDrives: true,
  },
  
  // Security Configuration
  security: {
    allowedIPs: process.env.XENTRY_ALLOWED_IPS?.split(',') || [],
    requireVPN: process.env.XENTRY_REQUIRE_VPN === 'true',
    accessToken: process.env.XENTRY_ACCESS_TOKEN,
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  },
  
  // Monitoring Configuration
  monitoring: {
    logConnections: true,
    alertOnFailedAttempts: true,
    maxFailedAttempts: 5,
    alertEmail: process.env.XENTRY_ALERT_EMAIL,
  },
  
  // AWS Configuration
  aws: {
    region: 'eu-west-2',
    instanceType: process.env.XENTRY_INSTANCE_TYPE || 't3.medium',
    amiId: process.env.XENTRY_AMI_ID || 'ami-0c94855ba95b798c7', // Windows Server 2022
    keyPairName: process.env.XENTRY_KEY_PAIR_NAME,
    securityGroupId: process.env.XENTRY_SECURITY_GROUP_ID,
  },
  
  // UI Configuration
  ui: {
    showSetupGuide: true,
    showServerInfo: true,
    showSecurityNotice: true,
    enableTestConnection: true,
  }
};

// Helper function to generate RDP content
export function generateRDPContent(serverAddress?: string): string {
  const address = serverAddress || xentryConfig.server.ip;
  
  return `full address:s:${address}
username:s:${xentryConfig.server.username}
authentication level:i:${xentryConfig.rdp.authenticationLevel}
redirectclipboard:i:${xentryConfig.rdp.redirectClipboard ? 1 : 0}
redirectprinters:i:${xentryConfig.rdp.redirectPrinters ? 1 : 0}
redirectcomports:i:${xentryConfig.rdp.redirectComPorts ? 1 : 0}
redirectsmartcards:i:${xentryConfig.rdp.redirectSmartCards ? 1 : 0}
redirectdrives:i:${xentryConfig.rdp.redirectDrives ? 1 : 0}
session bpp:i:${xentryConfig.rdp.sessionBpp}
screen mode id:i:${xentryConfig.rdp.screenMode}
smart sizing:i:${xentryConfig.rdp.smartSizing ? 1 : 0}
dynamic resolution:i:${xentryConfig.rdp.dynamicResolution ? 1 : 0}
desktopscalefactor:i:${xentryConfig.rdp.desktopScaleFactor}
use multimon:i:0
audiocapturemode:i:0
videoplaybackmode:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enableworkspacereconnect:i:0
disable wallpaper:i:0
allow font smoothing:i:0
allow desktop composition:i:0
disable full window drag:i:1
disable menu anims:i:1
disable themes:i:0
disable cursor setting:i:0
bitmapcachepersistenable:i:1
audiomode:i:0`;
}

// Helper function to validate configuration
export function validateXentryConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!xentryConfig.server.ip || xentryConfig.server.ip === 'YOUR_UK_SERVER_IP') {
    errors.push('XENTRY_UK_SERVER_IP environment variable is not set');
  }
  
  if (!xentryConfig.server.username) {
    errors.push('XENTRY_UK_SERVER_USERNAME environment variable is not set');
  }
  
  if (xentryConfig.security.allowedIPs.length === 0) {
    errors.push('XENTRY_ALLOWED_IPS environment variable is not set');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to get server status
export async function getServerStatus(): Promise<{
  isOnline: boolean;
  latency?: number;
  lastChecked: Date;
}> {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`http://${xentryConfig.server.ip}:${xentryConfig.server.port}`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    return {
      isOnline: response.ok,
      latency,
      lastChecked: new Date(),
    };
  } catch (error) {
    return {
      isOnline: false,
      lastChecked: new Date(),
    };
  }
}

