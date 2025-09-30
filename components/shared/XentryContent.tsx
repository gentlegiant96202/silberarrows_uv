"use client";
import { useState } from 'react';
import { Monitor, Server, Globe, Download, Settings, AlertTriangle } from 'lucide-react';
import { xentryConfig } from '@/lib/xentryConfig';

export default function XentryContent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');


  const handleDownloadRDP = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      // Call the API route to get the RDP file
      const response = await fetch('/api/xentry/rdp');
      
      if (!response.ok) {
        throw new Error('Failed to generate RDP file');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'XENTRY-UK-Desktop.rdp';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setConnectionStatus('connected');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } catch (error) {
      console.error('Error downloading RDP file:', error);
      setConnectionStatus('error');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-full">
              <Monitor className="h-8 w-8 text-black" />
            </div>
            <div className="p-3 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-full">
              <Globe className="h-8 w-8 text-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-200 via-gray-100 to-gray-400 bg-clip-text text-transparent mb-4">XENTRY Remote Desktop</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Connect to your UK-based remote desktop for XENTRY diagnostics and programming
          </p>
        </div>

        {/* Connection Status */}
        <div className="max-w-md mx-auto mb-8">
          <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
            connectionStatus === 'idle' ? 'bg-gradient-to-br from-white/5 to-white/10 border-white/10' :
            connectionStatus === 'connecting' ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/20 border-yellow-500/30' :
            connectionStatus === 'connected' ? 'bg-gradient-to-br from-green-500/10 to-green-500/20 border-green-500/30' :
            'bg-gradient-to-br from-red-500/10 to-red-500/20 border-red-500/30'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'idle' ? 'bg-gradient-to-br from-gray-200 to-gray-400' :
                connectionStatus === 'connecting' ? 'bg-gradient-to-br from-yellow-400 to-yellow-300 animate-pulse' :
                connectionStatus === 'connected' ? 'bg-gradient-to-br from-green-400 to-green-300' :
                'bg-gradient-to-br from-red-400 to-red-300'
              }`} />
              <span className="text-white font-medium">
                {connectionStatus === 'idle' ? 'Ready to connect' :
                 connectionStatus === 'connecting' ? 'Preparing connection...' :
                 connectionStatus === 'connected' ? 'RDP file downloaded successfully!' :
                 'Connection failed'}
              </span>
            </div>
          </div>
        </div>

        {/* Server Information */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-6 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-lg">
                  <Server className="h-5 w-5 text-black" />
                </div>
                <span className="text-white font-semibold text-lg">Server Location</span>
              </div>
              <p className="text-white/70">{xentryConfig.server.location} ({xentryConfig.server.region})</p>
            </div>
            
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-6 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-lg">
                  <Globe className="h-5 w-5 text-black" />
                </div>
                <span className="text-white font-semibold text-lg">IP Address</span>
              </div>
              <p className="text-white/70 font-mono text-lg">172.31.17.45</p>
            </div>
          </div>
          
          {/* Username Information */}
          <div className="max-w-md mx-auto mt-6">
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-6 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-lg">
                  <Server className="h-5 w-5 text-black" />
                </div>
                <span className="text-white font-semibold text-lg">Username</span>
              </div>
              <p className="text-white/70 font-mono text-lg">SilberArrows</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleDownloadRDP}
            disabled={isConnecting}
            className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 hover:from-gray-100 hover:via-gray-200 hover:to-gray-300 disabled:from-gray-600 disabled:to-gray-700 text-black font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            <span>{isConnecting ? 'Preparing...' : 'Download RDP File'}</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-8 border border-white/10 backdrop-blur-sm">
            <h3 className="text-white font-semibold text-xl mb-6 flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-lg">
                <Settings className="h-5 w-5 text-black" />
              </div>
              <span>Setup Instructions</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <span className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">1</span>
                  <p className="text-white/70">Click "Download RDP File" to get the connection file</p>
                </div>
                <div className="flex items-start space-x-4">
                  <span className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">2</span>
                  <p className="text-white/70">Double-click the downloaded .rdp file to connect</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <span className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">3</span>
                  <p className="text-white/70">Enter your credentials when prompted</p>
                </div>
                <div className="flex items-start space-x-4">
                  <span className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">4</span>
                  <p className="text-white/70">Access XENTRY software on the UK desktop</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/20 border border-yellow-500/30 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-300 rounded-lg flex-shrink-0 mt-1">
                <AlertTriangle className="h-5 w-5 text-black" />
              </div>
              <div>
                <h4 className="text-yellow-400 font-semibold text-lg mb-2">Security Notice</h4>
                <p className="text-yellow-200/80">
                  This connection provides access to a UK-based remote desktop. Ensure you have proper authorization 
                  and follow your organization's security policies when using this service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

