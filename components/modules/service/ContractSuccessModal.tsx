'use client';

import React, { useState } from 'react';
import { CheckCircle, Mail, Send, Copy } from 'lucide-react';

interface ContractSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractData: {
    reference_no: string;
    service_type: 'standard' | 'premium';
    owner_name: string;
    mobile_no: string;
    email: string;
    make: string;
    model: string;
    model_year: string;
    vin: string;
    start_date: string;
    end_date: string;
    invoice_amount: string;
  };
}

export default function ContractSuccessModal({ isOpen, onClose, contractData }: ContractSuccessModalProps) {
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSendEmail = () => {
    const subject = `SilberArrows ServiceCare Contract - ${contractData.reference_no}`;
    const emailBody = `ServiceCare Contract Summary - SilberArrows Platform
Reference: ${contractData.reference_no}

Customer Information:
- Name: ${contractData.owner_name}
- Mobile: ${contractData.mobile_no}
- Email: ${contractData.email}

Vehicle Information:
- Make/Model: ${contractData.make} ${contractData.model}
- Year: ${contractData.model_year}
- VIN: ${contractData.vin}

Contract Details:
- Service Type: ${contractData.service_type === 'standard' ? 'Standard (2 Years)' : 'Premium (4 Years)'}
- Start Date: ${new Date(contractData.start_date).toLocaleDateString('en-GB')}
- End Date: ${new Date(contractData.end_date).toLocaleDateString('en-GB')}
- Amount: AED ${parseInt(contractData.invoice_amount).toLocaleString()}

Sales Executive: Dubizzle Sales Team`;

    // Build mailto URL
    let mailtoUrl = `mailto:${emailTo}`;
    const params = [];
    
    if (emailCc) {
      params.push(`cc=${encodeURIComponent(emailCc)}`);
    }
    
    params.push(`subject=${encodeURIComponent(subject)}`);
    params.push(`body=${encodeURIComponent(emailBody)}`);
    
    if (params.length > 0) {
      mailtoUrl += '?' + params.join('&');
    }
    
    // Open default email client
    window.location.href = mailtoUrl;
    
    // Show success message
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handleCopyToClipboard = () => {
    const summary = `
ServiceCare Contract Summary
Reference: ${contractData.reference_no}

Customer: ${contractData.owner_name}
Mobile: ${contractData.mobile_no}
Email: ${contractData.email}

Vehicle: ${contractData.make} ${contractData.model} (${contractData.model_year})
VIN: ${contractData.vin}

Service Type: ${contractData.service_type === 'standard' ? 'Standard (2 Years)' : 'Premium (4 Years)'}
Period: ${new Date(contractData.start_date).toLocaleDateString('en-GB')} - ${new Date(contractData.end_date).toLocaleDateString('en-GB')}
Amount: AED ${parseInt(contractData.invoice_amount).toLocaleString()}
    `.trim();

    navigator.clipboard.writeText(summary);
    alert('Contract summary copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-xl md:max-w-3xl lg:max-w-5xl relative max-h-[95vh] overflow-hidden">
        <div className="max-h-[calc(95vh-3rem)] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 border-2 border-white/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Contract Created Successfully!</h2>
              <p className="text-sm text-gray-400">Reference: {contractData.reference_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-2xl leading-none text-white/70 hover:text-white transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contract Summary */}
          <div className="space-y-4">
            {/* Customer Information */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Customer Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">Name</div>
                  <div className="text-white font-medium">{contractData.owner_name}</div>
                </div>
                <div>
                  <div className="text-gray-400">Mobile</div>
                  <div className="text-white font-medium">{contractData.mobile_no}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400">Email</div>
                  <div className="text-white font-medium">{contractData.email}</div>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Vehicle Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">Make & Model</div>
                  <div className="text-white font-medium">{contractData.make} {contractData.model}</div>
                </div>
                <div>
                  <div className="text-gray-400">Year</div>
                  <div className="text-white font-medium">{contractData.model_year}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400">VIN</div>
                  <div className="text-white font-medium font-mono">{contractData.vin}</div>
                </div>
              </div>
            </div>

            {/* Contract Details */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Contract Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">Service Type</div>
                  <div className="text-white font-medium capitalize">
                    {contractData.service_type} ({contractData.service_type === 'standard' ? '2 Years' : '4 Years'})
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Amount</div>
                  <div className="text-white font-bold text-lg">
                    AED {parseInt(contractData.invoice_amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Start Date</div>
                  <div className="text-white font-medium">
                    {new Date(contractData.start_date).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">End Date</div>
                  <div className="text-white font-medium">
                    {new Date(contractData.end_date).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Section */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Email Contract Summary</h3>
            </div>
            
            {emailSent ? (
              <div className="flex items-center space-x-2 p-3 bg-white/10 border border-white/20 rounded-lg text-white">
                <CheckCircle className="w-5 h-5 text-white" />
                <span>Email sent successfully!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Send To *</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">CC (Optional)</label>
                  <input
                    type="email"
                    value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCopyToClipboard}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white transition-all duration-200"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Summary</span>
            </button>
            <button
              onClick={handleSendEmail}
              disabled={!emailTo}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Open in Email Client</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all duration-200"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
