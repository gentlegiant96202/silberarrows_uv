'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Phone, 
  Calendar, 
  User, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  BarChart3,
  Database,
  TrendingUp, 
  TrendingDown, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Award,
  AlertTriangle,
  Activity,
  UserPlus,
  UserMinus,
  Building,
  CalendarDays,
  Coffee,
  X,
  Save,
  Edit,
  FileDown,
  Trash2,
  Printer,
  PhoneCall,
  CheckSquare,
  AlertCircle,
  Calculator
} from 'lucide-react';
import PulsatingLogo from '@/components/shared/PulsatingLogo';
import { useMarketingLoading } from '@/lib/MarketingLoadingContext';

// Interface matching the exact data structure from the spreadsheet
interface CallLogEntry {
  id: string;
  date: string; // DD/MM/YYYY format
  time: string; // HH:MM format
  customer_name: string;
  phone_number: string; // Can be "ANONYMOUS"
  reach_out_method: string; // "Call" etc.
  person_in_charge: string;
  answered_yn: string; // "Yes", "No", or empty
  action_taken: string; // "Closed", "Transferred to Next Agent", etc.
  person_in_charge_2: string; // Secondary person, can be empty
  answered_yn_2: string; // "Yes", "No", or empty for second person
  notes: string;
}

// Staff management interfaces
interface StaffMember {
  id: string;
  name: string;
  department: 'Service' | 'Sales' | 'Leasing' | 'Admin';
  status: 'Active' | 'Inactive';
  joinDate: string;
  leaveDate?: string;
  email: string;
  phone: string;
}

interface MonthlyWorkingDays {
  id?: string;
  year: number;
  month: number; // 1-12
  workingDays: number;
  totalDays: number;
}

// Mock staff data
const mockStaffMembers: StaffMember[] = [
  {
    id: '1',
    name: 'Gareth',
    department: 'Service',
    status: 'Active',
    joinDate: '2023-01-15',
    email: 'gareth@silberarrows.com',
    phone: '+971 50 123 4567'
  },
  {
    id: '2',
    name: 'Daniel',
    department: 'Sales',
    status: 'Active',
    joinDate: '2023-03-20',
    email: 'daniel@silberarrows.com',
    phone: '+971 55 987 6543'
  },
  {
    id: '3',
    name: 'Alex',
    department: 'Sales',
    status: 'Active',
    joinDate: '2023-05-10',
    email: 'alex@silberarrows.com',
    phone: '+971 52 456 7890'
  },
  {
    id: '4',
    name: 'Nick',
    department: 'Leasing',
    status: 'Active',
    joinDate: '2023-07-01',
    email: 'nick@silberarrows.com',
    phone: '+971 54 321 0987'
  },
  {
    id: '5',
    name: 'Remi',
    department: 'Service',
    status: 'Active',
    joinDate: '2023-09-15',
    email: 'remi@silberarrows.com',
    phone: '+971 56 789 0123'
  },
  {
    id: '6',
    name: 'John Smith',
    department: 'Sales',
    status: 'Inactive',
    joinDate: '2022-08-01',
    leaveDate: '2024-01-15',
    email: 'john.smith@silberarrows.com',
    phone: '+971 50 555 0123'
  },
  {
    id: '7',
    name: 'Lucy',
    department: 'Sales',
    status: 'Active',
    joinDate: '2023-11-01',
    email: 'lucy@silberarrows.com',
    phone: '+971 50 111 2222'
  },
  {
    id: '8',
    name: 'Essrar',
    department: 'Sales',
    status: 'Active',
    joinDate: '2023-12-01',
    email: 'essrar@silberarrows.com',
    phone: '+971 50 333 4444'
  },
  {
    id: '9',
    name: 'Sam',
    department: 'Admin',
    status: 'Active',
    joinDate: '2024-01-01',
    email: 'sam@silberarrows.com',
    phone: '+971 50 555 6666'
  }
];

// Dynamic working days configuration generator - automatically scales to any year
const generateMonthlyWorkingDays = (startYear: number, endYear: number): MonthlyWorkingDays[] => {
  const workingDays: MonthlyWorkingDays[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const totalDays = new Date(year, month, 0).getDate(); // Get actual days in month
      
      // Calculate default working days (excludes weekends approximately)
      // Typical month has ~22 working days (about 71% of total days)
      const weekendsInMonth = Math.floor(totalDays / 7) * 2; // Approximate weekends
      const defaultWorkingDays = totalDays - weekendsInMonth - 1; // -1 for buffer/holidays
      
      workingDays.push({
        year,
        month,
        workingDays: Math.max(defaultWorkingDays, 20), // Minimum 20 working days
        totalDays
      });
    }
  }
  
  return workingDays;
};

// Auto-generate configuration: previous year, current year, and next 3 years
const currentYear = new Date().getFullYear();
const monthlyWorkingDaysConfig: MonthlyWorkingDays[] = generateMonthlyWorkingDays(
  currentYear - 1, 
  currentYear + 3
);

// Mock data matching the provided format
const mockCallLogEntries: CallLogEntry[] = [
  {
    id: '1',
    date: '04/07/2024',
    time: '16:05',
    customer_name: 'Arhama',
    phone_number: '563211666',
    reach_out_method: 'Call',
    person_in_charge: 'Gareth',
    answered_yn: 'No',
    action_taken: 'Transferred to Next Agent',
    person_in_charge_2: 'Gareth',
    answered_yn_2: 'Yes',
    notes: ''
  },
  {
    id: '2',
    date: '04/07/2024',
    time: '16:19',
    customer_name: 'Farsi',
    phone_number: '559866426',
    reach_out_method: 'Call',
    person_in_charge: 'Daniel',
    answered_yn: 'Yes',
    action_taken: 'Closed',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: ''
  },
  {
    id: '3',
    date: '04/07/2024',
    time: '17:36',
    customer_name: 'Taj',
    phone_number: 'ANONYMOUS',
    reach_out_method: 'Call',
    person_in_charge: 'Gareth',
    answered_yn: 'Yes',
    action_taken: 'Closed',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: ''
  },
  {
    id: '4',
    date: '04/07/2024',
    time: '17:46',
    customer_name: 'Jim',
    phone_number: '554707449',
    reach_out_method: 'Call',
    person_in_charge: 'Alex',
    answered_yn: 'Yes',
    action_taken: 'Closed',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: ''
  },
  {
    id: '5',
    date: '05/07/2024',
    time: '10:10',
    customer_name: 'Michael',
    phone_number: 'ANONYMOUS',
    reach_out_method: 'Call',
    person_in_charge: '',
    answered_yn: '',
    action_taken: '',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: 'enquired service for other car brands (Audi & others)'
  },
  {
    id: '6',
    date: '05/07/2024',
    time: '13:20',
    customer_name: 'Indu',
    phone_number: '505582946',
    reach_out_method: 'Call',
    person_in_charge: 'Alex',
    answered_yn: 'No',
    action_taken: 'Transferred to Next Agent',
    person_in_charge_2: 'Nick',
    answered_yn_2: 'Yes',
    notes: 'was looking for Dan, who was on day off but was adamant in speaking to someone for assistance'
  },
  {
    id: '7',
    date: '05/07/2024',
    time: '15:30',
    customer_name: 'Emar',
    phone_number: '585225699',
    reach_out_method: 'Call',
    person_in_charge: '',
    answered_yn: '',
    action_taken: '',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: 'call was dropped, called back did not answer - will call again'
  },
  {
    id: '8',
    date: '05/07/2024',
    time: '15:32',
    customer_name: 'Pascal',
    phone_number: '502205307',
    reach_out_method: 'Call',
    person_in_charge: 'Remi',
    answered_yn: 'No',
    action_taken: '',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: 'was looking for Gareth about collecting his A35 today - posted in Whatsapp call group'
  }
];

export default function CallLogBoard() {
  // Add print styles
  React.useEffect(() => {
    const printStyles = `
      @media print {
        * { 
          -webkit-print-color-adjust: exact !important; 
          color-adjust: exact !important; 
        }
        
        body { 
          background: white !important;
          color: black !important;
        }
        
        @page { 
          margin: 0.5cm; 
          size: A4;
        }
        
        /* Hide ALL navigation elements */
        nav, header, [data-testid*="nav"], [class*="nav"], [class*="Nav"], 
        [class*="header"], [class*="Header"], [class*="toolbar"], [class*="menu"] {
          display: none !important;
        }
        
        /* Hide specific elements that appear in print */
        .print\\:hidden {
          display: none !important;
        }
        
        /* Show only our dashboard content */
        body.printing * {
          background: transparent !important;
        }
        
        /* Force print layout */
        body.printing {
          overflow: visible !important;
        }
        
        /* Simple chart representation for print */
        body.printing [class*="h-[450px]"], 
        body.printing [class*="h-[650px]"] {
          height: 300px !important;
          background: white !important;
          border: 1px solid #ccc !important;
        }
        
        /* Make chart bars visible in print */
        body.printing [style*="height"]:not([class*="text"]) {
          background: #333 !important;
          border: 1px solid #666 !important;
        }
        
        .print\\:page-break-inside-avoid {
          page-break-inside: avoid !important;
        }
        
        .print\\:page-break-after {
          page-break-after: always !important;
        }
      }
    `;
    
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);
  const { setLoading: setGlobalLoading } = useMarketingLoading();
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(mockCallLogEntries);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // Internal tab state
  const [searchTerm, setSearchTerm] = useState('');

  const [filterPerson, setFilterPerson] = useState<string>('all');
  
  // Sync local loading state with global loading context
  useEffect(() => {
    setGlobalLoading(loading);
  }, [loading, setGlobalLoading]);

  // Screenshot functionality - Prompts user to take screenshot
  const handlePrintReport = async () => {
    try {
      // Use the Screen Capture API to let user select what to capture
      if ('getDisplayMedia' in navigator.mediaDevices) {
        // Request screen capture permission
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'never'
          } as MediaTrackConstraints
        });
        
        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
            
            // Download the screenshot
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `call-log-dashboard-${new Date().toISOString().split('T')[0]}.png`;
                a.click();
                URL.revokeObjectURL(url);
              }
            });
          }
        });
      } else {
        // Show instructions for manual screenshot
        alert('To take a screenshot:\n\n• Mac: Press Cmd + Shift + 4, then select the dashboard area\n• Windows: Press Windows + Shift + S, then select the dashboard area\n• Or use your browser\'s built-in screenshot feature');
      }
    } catch (error) {
      // Show manual screenshot instructions
      alert('To take a screenshot:\n\n• Mac: Press Cmd + Shift + 4, then select the dashboard area\n• Windows: Press Windows + Shift + S, then select the dashboard area\n• Or use your browser\'s built-in screenshot feature');
    }
  };
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth.toString().padStart(2, '0');
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear().toString();
  });
  
  // Staff management state
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(mockStaffMembers);
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState<MonthlyWorkingDays[]>(monthlyWorkingDaysConfig);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [isNewStaffModalOpen, setIsNewStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Edit states for inline editing
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<CallLogEntry | null>(null);
  
  // Staff edit states
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  
  // Working days edit states
  const [editingWorkingDays, setEditingWorkingDays] = useState(false);
  const [editingWorkingDaysData, setEditingWorkingDaysData] = useState<MonthlyWorkingDays[]>([]);
  
  // File handling states and refs
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination states
  const [displayedEntries, setDisplayedEntries] = useState(100);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ENTRIES_PER_PAGE = 100;
  
  // Shared bar canvas height to keep both charts perfectly flush at the bottom
  const BAR_CANVAS_PX = 240;
  
  // Form states
  
  const [staffForm, setStaffForm] = useState<{
    name: string;
    department: 'Service' | 'Sales' | 'Leasing' | 'Admin';
    status: 'Active' | 'Inactive';
    joinDate: string;
    leaveDate: string;
    email: string;
    phone: string;
  }>({
    name: '',
    department: 'Service',
    status: 'Active',
    joinDate: '',
    leaveDate: '',
    email: '',
    phone: ''
  });

  // Helper function to safely update editing row
  const updateEditingRow = (updates: Partial<CallLogEntry>) => {
    setEditingRow(prev => prev ? { ...prev, ...updates } : null);
  };

  // Helper function to safely update editing staff
  const updateEditingStaff = (updates: Partial<StaffMember>) => {
    setEditingStaff(prev => prev ? { ...prev, ...updates } : null);
  };

  // Load staff directory from API
  const loadStaffDirectory = async () => {
    try {
      const params = new URLSearchParams();
      if (departmentFilter && departmentFilter !== 'all') params.set('department', departmentFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (staffSearchTerm) params.set('search', staffSearchTerm);
      const response = await fetch(`/api/staff-directory?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result?.data) {
        // Merge API data with mock data, prioritizing API data
        const apiStaff = result.data as StaffMember[];
        const mergedStaff = [...mockStaffMembers];
        
        // Add or update with API staff data
        apiStaff.forEach(apiMember => {
          const existingIndex = mergedStaff.findIndex(mock => mock.name === apiMember.name);
          if (existingIndex >= 0) {
            mergedStaff[existingIndex] = apiMember;
          } else {
            mergedStaff.push(apiMember);
          }
        });
        
        setStaffMembers(mergedStaff);
      } else {
        // If API fails, keep mock data
      }
    } catch (e) {
      // Keep mock data on error
    }
  };

  // Save staff (create or update)
  const saveStaffMember = async (member: StaffMember) => {
    try {
      const isNew = member.id.startsWith('new-staff-');
      const payload = {
        id: isNew ? undefined : member.id,
        name: member.name,
        department: member.department,
        status: member.status,
        joinDate: member.joinDate,
        leaveDate: member.leaveDate || null,
        email: member.email || null,
        phone: member.phone || null,
      };
      const response = await fetch('/api/staff-directory', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save staff');
      }
      await loadStaffDirectory();
      setEditingStaffId(null);
      setEditingStaff(null);
    } catch (e) {
      alert('Failed to save staff member');
    }
  };

  // Load working days configuration
  const loadWorkingDaysConfig = async () => {
    try {
      const response = await fetch('/api/working-days-config');
      const result = await response.json();
      if (response.ok && result?.data) {
        const mapped: MonthlyWorkingDays[] = result.data.map((c: any) => ({
          id: c.id,
          year: c.year,
          month: c.month,
          workingDays: c.workingDays,
          totalDays: c.totalDays,
        }));
        setMonthlyWorkingDays(mapped);
      }
    } catch (e) {
    }
  };

  // Save working days configuration (PUT when id exists, otherwise POST)
  const saveWorkingDaysConfig = async (data: MonthlyWorkingDays[]) => {
    try {
      for (const cfg of data) {
        const hasId = Boolean(cfg.id);
        const payload = hasId
          ? { id: cfg.id, workingDays: cfg.workingDays, totalDays: cfg.totalDays }
          : { year: cfg.year, month: cfg.month, workingDays: cfg.workingDays, totalDays: cfg.totalDays };

        const method = hasId ? 'PUT' : 'POST';
        const res = await fetch('/api/working-days-config', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to ${hasId ? 'update' : 'create'} working days for ${cfg.year}-${cfg.month}`);
        }
      }

      await loadWorkingDaysConfig();
      setEditingWorkingDays(false);
      setEditingWorkingDaysData([]);
    } catch (e) {
      alert('Failed to save working days configuration');
    }
  };

  // Function to ensure working days exist for a given year
  const ensureWorkingDaysForYear = (year: number) => {
    const hasYear = monthlyWorkingDays.some(wd => wd.year === year);
    if (!hasYear) {
      const newYearData = generateMonthlyWorkingDays(year, year);
      setMonthlyWorkingDays(prev => [...prev, ...newYearData].sort((a, b) => 
        a.year === b.year ? a.month - b.month : a.year - b.year
      ));
    }
  };

  // Auto-ensure we have data for current and next year
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    ensureWorkingDaysForYear(currentYear);
    ensureWorkingDaysForYear(currentYear + 1);
    loadStaffDirectory();
    loadWorkingDaysConfig();
  }, []);

  // Reload staff list when directory filters/search change
  useEffect(() => {
    loadStaffDirectory();
  }, [departmentFilter, statusFilter, staffSearchTerm]);

  // Load call logs from database on component mount
  useEffect(() => {
    loadCallLogs();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    // Only run if we have call logs data
    const safeLogs = Array.isArray(callLogs) ? callLogs : [];
    if (!safeLogs || safeLogs.length === 0) return;

    // Reset to initial page size on filter/data changes
    setDisplayedEntries(ENTRIES_PER_PAGE);
  }, [selectedMonth, selectedYear, callLogs]);

  // Date formatting utilities for dd/mm/yyyy format
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDateFromDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return dateStr;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Download sample Excel format
  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Date (dd/mm/yyyy)': '04/07/2024',
        'Time (hh:mm)': '16:05',
        'Customer Name': 'John Doe',
        'Phone Number': '563211666',
        'Reach Out Method': 'Call',
        'Person in Charge 1': 'Gareth',
        'Answered Y/N 1': 'Yes',
        'Action Taken': 'Scheduled Meeting',
        'Person in Charge 2': '',
        'Answered Y/N 2': '',
        'Notes': 'Customer interested in luxury sedan'
      },
      {
        'Date (dd/mm/yyyy)': '05/07/2024',
        'Time (hh:mm)': '14:30',
        'Customer Name': 'Jane Smith',
        'Phone Number': 'ANONYMOUS',
        'Reach Out Method': 'Call',
        'Person in Charge 1': 'Remi',
        'Answered Y/N 1': 'No',
        'Action Taken': 'Left Voicemail',
        'Person in Charge 2': '',
        'Answered Y/N 2': '',
        'Notes': 'Follow up required tomorrow'
      }
    ];

    const csvContent = [
      Object.keys(sampleData[0]).join(','),
      ...sampleData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'call_log_sample_format.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export data to CSV
  const exportData = () => {
    setIsExporting(true);
    
    try {
      const safeLogs = Array.isArray(callLogs) ? callLogs : [];
      const exportData = safeLogs.map(log => ({
        'Date (dd/mm/yyyy)': formatDateForDisplay(log.date),
        'Time (hh:mm)': log.time,
        'Customer Name': log.customer_name,
        'Phone Number': log.phone_number,
        'Reach Out Method': log.reach_out_method,
        'Person in Charge 1': log.person_in_charge,
        'Answered Y/N 1': log.answered_yn,
        'Action Taken': log.action_taken,
        'Person in Charge 2': log.person_in_charge_2 || '',
        'Answered Y/N 2': log.answered_yn_2 || '',
        'Notes': log.notes || ''
      }));

      const csvContent = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `call_logs_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import data from CSV and save to database
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        const importedData: CallLogEntry[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          
          const entry: CallLogEntry = {
            id: `imported-${Date.now()}-${i}`,
            date: parseDateFromDDMMYYYY(values[0]) || values[0],
            time: values[1] || '',
            customer_name: values[2] || '',
            phone_number: values[3] || '',
            reach_out_method: values[4] || 'Call',
            person_in_charge: values[5] || '',
            answered_yn: values[6] || 'Yes',
            action_taken: values[7] || '',
            person_in_charge_2: values[8] || '',
            answered_yn_2: values[9] || '',
            notes: values[10] || ''
          };
          
          importedData.push(entry);
        }
        
        if (importedData.length > 0) {
          // Save to database via bulk import API
          try {
            setImportProgress(importedData.length);
            const response = await fetch('/api/call-logs/bulk-import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                entries: importedData.map(entry => ({
                  call_date: entry.date,
                  call_time: entry.time,
                  customer_name: entry.customer_name,
                  phone_number: entry.phone_number,
                  reach_out_method: entry.reach_out_method,
                  person_in_charge: entry.person_in_charge,
                  answered_yn: entry.answered_yn,
                  action_taken: entry.action_taken,
                  person_in_charge_2: entry.person_in_charge_2,
                  answered_yn_2: entry.answered_yn_2,
                  notes: entry.notes
                }))
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              // Update local state with imported data
              setCallLogs(prev => [...importedData, ...prev]);
              
              alert(`Successfully imported and saved ${result.successCount || importedData.length} call log entries to database.`);
              
              // Refresh data from database to ensure consistency
              await loadCallLogs();
            } else {
              const errorData = await response.json();
              alert(`Import failed: ${errorData.error || 'Unknown error'}. Data may not persist after refresh.`);
              // Still update local state for immediate viewing
              setCallLogs(prev => [...importedData, ...prev]);
            }
          } catch (error) {
            alert('Import failed due to network error. Data may not persist after refresh.');
            // Still update local state for immediate viewing
            setCallLogs(prev => [...importedData, ...prev]);
          }
        } else {
          alert('No valid data found in the file.');
        }
      } catch (error) {
        alert('Import failed. Please check your file format and try again.');
      } finally {
        setIsImporting(false);
        setImportProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsText(file);
  };

  // Load call logs from database
  const loadCallLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/call-logs');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        if (Array.isArray(data)) {
          // Merge API data with mock data for richer visualization
          const mergedLogs = [...mockCallLogEntries];
          data.forEach(apiLog => {
            if (!mergedLogs.find(mock => mock.id === apiLog.id)) {
              mergedLogs.push(apiLog);
            }
          });
          setCallLogs(mergedLogs);
        } else {
          // Keep mock data if API doesn't return array
        }
      } else {
        // Keep existing mock data
      }
    } catch (error) {
      // Keep existing mock data on error
    } finally {
      setLoading(false);
    }
  };

  // Utility functions for working days calculations
  const getWorkingDaysForMonth = (year: number, month: number): number => {
    const config = monthlyWorkingDays.find(wd => wd.year === year && wd.month === month);
    return config ? config.workingDays : 22; // Default to 22 working days if not found
  };

  const calculateWorkingDaysForDateRange = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalWorkingDays = 0;

    // Iterate through each month in the date range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
      
      const monthWorkingDays = getWorkingDaysForMonth(year, month);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0); // Last day of the month
      
      // Calculate the overlap between the date range and this month
      const overlapStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
      const overlapEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));
      
      if (overlapStart <= overlapEnd) {
        const totalDaysInMonth = monthEnd.getDate();
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const proportionalWorkingDays = (monthWorkingDays * overlapDays) / totalDaysInMonth;
        totalWorkingDays += proportionalWorkingDays;
      }
      
      // Move to the next month
      currentDate.setMonth(currentDate.getMonth() + 1);
      currentDate.setDate(1);
    }

    return Math.round(totalWorkingDays);
  };

  const getDateRangeFromFilter = (filter: string) => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    switch (filter) {
      case 'today':
        return { startDate: endDate, endDate };
      case '7days': {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        return { startDate: startDate.toISOString().split('T')[0], endDate };
      }
      case '30days': {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
        return { startDate: startDate.toISOString().split('T')[0], endDate };
      }
      case '90days': {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 89);
        return { startDate: startDate.toISOString().split('T')[0], endDate };
      }
      default:
        return { startDate: endDate, endDate };
    }
  };

  // Get unique dates and people for filters
  const safeCallLogs = Array.isArray(callLogs) ? callLogs : [];
  const uniqueDates = Array.from(new Set(safeCallLogs.map(log => log.date))).sort();
  const uniquePeople = Array.from(new Set(safeCallLogs.flatMap(log => 
    [log.person_in_charge, log.person_in_charge_2].filter(person => person && person.trim())
  ))).sort();

  // Helper: determine if a call was answered (either primary or secondary)
  const wasAnswered = (log: CallLogEntry) => {
    const a1 = (log.answered_yn || '').trim().toLowerCase();
    const a2 = (log.answered_yn_2 || '').trim().toLowerCase();
    return a1 === 'yes' || a2 === 'yes';
  };

  // Helper: apply only month/year filters for dashboard analytics
  const dashboardLogs = useMemo(() => {
    const logs = Array.isArray(callLogs) ? callLogs : [];
    if (selectedMonth === 'all' && selectedYear === 'all') return logs;
    return logs.filter((log) => {
      let month = '';
      let year = '';
      if (log.date.includes('/')) {
        const parts = log.date.split('/');
        if (parts.length === 3) { month = parts[1].padStart(2, '0'); year = parts[2]; }
      } else if (log.date.includes('-')) {
        const parts = log.date.split('-');
        if (parts.length === 3) { year = parts[0]; month = parts[1].padStart(2, '0'); }
      }
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      if (selectedYear !== 'all' && year !== selectedYear) return false;
      return true;
    });
  }, [callLogs, selectedMonth, selectedYear]);

  // Dashboard aggregations
  const dashboardAgg = useMemo(() => {
    const logs = dashboardLogs;
    
    // Daily aggregation
    const dailyMap: Record<string, { answered: number; unanswered: number; total: number } > = {};
    for (const log of logs) {
      const key = log.date; // keep original display date
      const answered = wasAnswered(log);
      if (!dailyMap[key]) dailyMap[key] = { answered: 0, unanswered: 0, total: 0 };
      dailyMap[key].total += 1;
      if (answered) dailyMap[key].answered += 1; else dailyMap[key].unanswered += 1;
    }
    const daily = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => {
        // try to sort by actual date where possible
        const pa = a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date;
        const pb = b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date;
        return new Date(pa).getTime() - new Date(pb).getTime();
      });

    // Yearly totals (use selectedYear or fall back to year from logs)
    let yearlyAnswered = 0, yearlyUnanswered = 0;
    for (const log of logs) {
      if (wasAnswered(log)) yearlyAnswered++; else yearlyUnanswered++;
    }

    // Department-wise for selected month (and year)
    const deptMap: Record<string, { answered: number; unanswered: number; total: number }> = {};
    const staffByName: Record<string, StaffMember> = {};
    for (const s of staffMembers) staffByName[s.name] = s;
    
    const isInSelectedMonth = (log: CallLogEntry) => {
      if (selectedMonth === 'all' && selectedYear === 'all') return true;
      let m = '', y = '';
      if (log.date.includes('/')) { const p = log.date.split('/'); m = p[1]?.padStart(2, '0'); y = p[2]; }
      else if (log.date.includes('-')) { const p = log.date.split('-'); y = p[0]; m = p[1]?.padStart(2, '0'); }
      if (selectedYear !== 'all' && y !== selectedYear) return false;
      if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      return true;
    };

    const staffMap: Record<string, { answered: number; unanswered: number; total: number }> = {};

    for (const log of logs) {
      if (!isInSelectedMonth(log)) continue;
      const answered = wasAnswered(log);
      const addTo = (person?: string) => {
        if (!person) return;
        // department - provide better fallback for unknown staff
        const staff = staffByName[person];
        const dept = staff?.department || (person ? `Unknown (${person})` : 'Unknown');
        if (!deptMap[dept]) deptMap[dept] = { answered: 0, unanswered: 0, total: 0 };
        deptMap[dept].total += 1;
        if (answered) deptMap[dept].answered += 1; else deptMap[dept].unanswered += 1;
        // staff
        if (!staffMap[person]) staffMap[person] = { answered: 0, unanswered: 0, total: 0 };
        staffMap[person].total += 1;
        if (answered) staffMap[person].answered += 1; else staffMap[person].unanswered += 1;
      };
      addTo(log.person_in_charge);
      addTo(log.person_in_charge_2);
    }

    const dept = Object.entries(deptMap).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
    const staff = Object.entries(staffMap).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);

    return { daily, yearlyAnswered, yearlyUnanswered, dept, staff };
  }, [dashboardLogs, staffMembers, selectedMonth, selectedYear]);

  // Filter call logs based on search and filters (for data tab)
  const filteredCallLogs = (Array.isArray(callLogs) ? callLogs : []).filter(log => {
    const matchesSearch = 
      log.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.person_in_charge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.person_in_charge_2 && log.person_in_charge_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by person
    const matchesPerson = filterPerson === 'all' || 
      log.person_in_charge === filterPerson || 
      log.person_in_charge_2 === filterPerson;
    
    // Month/Year filtering - handle multiple date formats
    let matchesMonthYear = true;
    if (selectedMonth !== 'all' || selectedYear !== 'all') {
      let month = '';
      let year = '';
      
      // Try to parse different date formats
      if (log.date.includes('/')) {
        // DD/MM/YYYY or MM/DD/YYYY format
        const parts = log.date.split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY format (day first)
          month = parts[1].padStart(2, '0');
          year = parts[2];
        }
      } else if (log.date.includes('-')) {
        // YYYY-MM-DD format
        const parts = log.date.split('-');
        if (parts.length === 3) {
          year = parts[0];
          month = parts[1].padStart(2, '0');
        }
      }
      
      if (selectedMonth !== 'all' && month !== selectedMonth) {
        matchesMonthYear = false;
      }
      if (selectedYear !== 'all' && year !== selectedYear) {
        matchesMonthYear = false;
      }
    }
    
    return matchesSearch && matchesPerson && matchesMonthYear;
  });

  // Paginated call logs - show only the first N entries for performance
  const paginatedCallLogs = useMemo(() => {
    return filteredCallLogs.slice(0, displayedEntries);
  }, [filteredCallLogs, displayedEntries]);

  // Load more entries
  const loadMoreEntries = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedEntries(prev => prev + ENTRIES_PER_PAGE);
      setIsLoadingMore(false);
    }, 300); // Small delay for UX
  };

  const getAnsweredBadge = (answered: string) => {
    if (!answered || answered.trim() === '') {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    if (answered.toLowerCase() === 'yes') {
      return (
        <div className="flex items-center gap-1 text-green-300">
          <CheckCircle className="w-3 h-3" />
          <span className="text-xs font-medium">Yes</span>
        </div>
      );
    }
    if (answered.toLowerCase() === 'no') {
      return (
        <div className="flex items-center gap-1 text-red-300">
          <XCircle className="w-3 h-3" />
          <span className="text-xs font-medium">No</span>
        </div>
      );
    }
    return <span className="text-white/60 text-xs">{answered}</span>;
  };

  const getActionBadge = (action: string) => {
    if (!action || action.trim() === '') {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium border";
    
    if (action.toLowerCase().includes('closed')) {
      return <span className={`${baseClasses} bg-green-500/20 text-green-300 border-green-500/30`}>Closed</span>;
    }
    if (action.toLowerCase().includes('transferred')) {
      return <span className={`${baseClasses} bg-blue-500/20 text-blue-300 border-blue-500/30`}>Transferred</span>;
    }
    
    return <span className={`${baseClasses} bg-gray-500/20 text-gray-300 border-gray-500/30`}>{action}</span>;
  };

  const MetricCard = ({ 
    title, 
    value, 
    percentage, 
    icon: Icon, 
    trend, 
    trendValue,
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    percentage?: number;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
      green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-300',
      yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-300',
      red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-300',
      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
    };

    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-white/80">{title}</h3>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-white">{value}</div>
          {percentage !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div 
                  className="bg-current h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-white/70">{percentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Dashboard Content
  const renderDashboard = () => (
    <div className="px-6 py-8 h-full overflow-y-auto min-h-0 print:px-0 print:py-0 print:h-auto print:overflow-visible">
      {/* Print-only header */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-black mb-2">Call Log Dashboard Report</h1>
        <p className="text-lg text-gray-600">
          Generated on {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Period: {selectedMonth !== 'all' ? new Date(2000, parseInt(selectedMonth) - 1).toLocaleDateString('en-US', { month: 'long' }) : 'All Months'} 
          {selectedYear !== 'all' ? ` ${selectedYear}` : ' - All Years'}
        </p>
      </div>
      {/* Header with tabs and controls */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6 print:mb-4">
          {/* Internal Tab Navigation */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeSubTab === 'dashboard'
                  ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveSubTab('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeSubTab === 'data'
                  ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <Database className="w-4 h-4" />
              Data Entry
            </button>
            <button
              onClick={() => setActiveSubTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeSubTab === 'staff'
                  ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Management
            </button>
          </div>

          {/* Print Button and Month/Year Filter on Dashboard */}
          <div className="flex gap-2">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium text-sm hover:bg-blue-600/30 transition-all duration-200 print:hidden"
            >
              <Printer className="w-4 h-4" />
              Screenshot Report
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 print:hidden"
            >
              <option value="all">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 print:hidden"
            >
              <option value="all">All Years</option>
              {Array.from({ length: (new Date().getFullYear() + 3) - 2020 + 1 }, (_, i) => 2020 + i)
                .reverse()
                .map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top row: Call KPI Cards matching UV style */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8 print:gap-4 print:mb-6">
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2">
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner print:bg-gray-100 print:border-gray-300 print:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70 print:text-gray-700">Total Calls</p>
                <PhoneCall className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white print:text-black mb-2">{dashboardLogs.length}</p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-white/50 print:text-gray-600">All periods</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner print:bg-gray-100 print:border-gray-300 print:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70 print:text-gray-700">Answered</p>
                <CheckSquare className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white print:text-black mb-2">{dashboardAgg.yearlyAnswered}</p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${dashboardLogs.length ? ((dashboardAgg.yearlyAnswered / dashboardLogs.length) * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-white/50 print:text-gray-600">{dashboardLogs.length ? ((dashboardAgg.yearlyAnswered / dashboardLogs.length) * 100).toFixed(1) : '0.0'}% rate</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner print:bg-gray-100 print:border-gray-300 print:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70 print:text-gray-700">Unanswered</p>
                <AlertCircle className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white print:text-black mb-2">{dashboardAgg.yearlyUnanswered}</p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${dashboardLogs.length ? ((dashboardAgg.yearlyUnanswered / dashboardLogs.length) * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-white/50 print:text-gray-600">{dashboardLogs.length ? ((dashboardAgg.yearlyUnanswered / dashboardLogs.length) * 100).toFixed(1) : '0.0'}% rate</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner print:bg-gray-100 print:border-gray-300 print:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70 print:text-gray-700">Avg Calls/Day</p>
                <Calculator className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white print:text-black mb-2">
                {(() => {
                  // Count unique days when call entries were actually made
                  const uniqueDaysWithCalls = new Set(dashboardLogs.map(log => log.date)).size;
                  return uniqueDaysWithCalls > 0 ? (dashboardLogs.length / uniqueDaysWithCalls).toFixed(1) : '0.0';
                })()}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${(() => {
                      const uniqueDaysWithCalls = new Set(dashboardLogs.map(log => log.date)).size;
                      const avgCalls = uniqueDaysWithCalls > 0 ? (dashboardLogs.length / uniqueDaysWithCalls) : 0;
                      const maxExpected = 50; // Assume max 50 calls per day as 100%
                      return Math.min((avgCalls / maxExpected) * 100, 100);
                    })()}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-white/50 print:text-gray-600">Based on days with entries</p>
            </div>
          </div>
        </div>

        {/* Department breakdown matching UV style */}
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2">
            {dashboardAgg.dept.slice(0, 4).map((dept, index) => {
              const icons = [Building, Users, Award, Target];
              const IconComponent = icons[index % icons.length];
              
              return (
                <div key={dept.name} className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner print:bg-gray-100 print:border-gray-300 print:shadow-none">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white/70 print:text-gray-700">{dept.name}</p>
                    <IconComponent className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-3xl font-bold text-white print:text-black mb-2">{dept.total}</p>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${dept.total ? ((dept.answered / dept.total) * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/50 print:text-gray-600">{dept.total ? ((dept.answered / dept.total) * 100).toFixed(1) : '0.0'}% answered</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Section - Enhanced visualization matching UV layout */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8 print:gap-4 print:mb-6 print:grid-cols-1">
        {/* Daily Call Activity - Enhanced Vertical Bars */}
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10 h-[650px] flex flex-col print:bg-white print:border-gray-300 print:h-auto print:mb-6 print:page-break-inside-avoid">
          <div className="flex items-center justify-between mb-6 print:mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 print:text-black print:text-xl">Daily Call Activity</h2>
              <p className="text-xs text-white/50 print:text-gray-600">Last 10 days with call entries</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-sm print:bg-gray-800"></div>
                <span className="text-white/70 print:text-gray-700">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white/40 rounded-sm print:bg-gray-400"></div>
                <span className="text-white/70 print:text-gray-700">Unanswered</span>
              </div>
            </div>
          </div>
          
          {/* Print-friendly chart summary */}
          <div className="hidden print:block bg-gray-50 p-4 border border-gray-300 rounded">
            <h3 className="font-semibold text-black mb-3">Daily Call Summary (Last 10 Days)</h3>
            <div className="grid grid-cols-5 gap-2 text-xs">
              {dashboardAgg.daily.slice(-10).map((day, index) => (
                <div key={index} className="text-center p-2 border border-gray-200 rounded">
                  <div className="font-medium text-black">{day.date}</div>
                  <div className="text-green-600">✓ {day.answered}</div>
                  <div className="text-red-600">✗ {day.unanswered}</div>
                  <div className="font-bold text-black">Total: {day.total}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive chart (hidden in print) */}
          <div className="h-[450px] flex items-end justify-end gap-3 px-6 print:hidden">
            {dashboardAgg.daily.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <BarChart3 className="w-6 h-6 text-white/30" />
                  </div>
                  <span className="text-white/60 text-sm">No data for selected period</span>
                </div>
              </div>
            ) : (
              dashboardAgg.daily.slice(-10).map((day, index) => {
                const maxValue = Math.max(...dashboardAgg.daily.map(d => d.total), 1);
                const totalHeight = 320; // Reduced height to make room for total numbers
                const totalBarHeight = Math.max((day.total / maxValue) * totalHeight, day.total > 0 ? 24 : 0);
                const answeredRatio = day.total > 0 ? day.answered / day.total : 0;
                const unansweredRatio = day.total > 0 ? day.unanswered / day.total : 0;
                const answeredHeight = totalBarHeight * answeredRatio;
                const unansweredHeight = totalBarHeight * unansweredRatio;
                
                return (
                  <div key={day.date} className="flex flex-col items-center justify-end gap-2" style={{ width: '100%', maxWidth: '60px', height: '100%' }}>
                    
                    <div className="flex flex-col justify-end items-center relative" style={{ height: `${totalHeight + 30}px` }}>
                      {/* Total count above bar - positioned at fixed height */}
                      {day.total > 0 && (
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-full border border-white/20">
                          {day.total}
                        </div>
                      )}
                      
                      {/* Stacked bar with better proportions */}
                      <div className="w-full flex flex-col rounded-t-lg overflow-hidden shadow-lg border border-white/20" style={{ height: `${totalBarHeight}px`, minWidth: '48px' }}>
                        {/* Unanswered calls on top */}
                        {day.unanswered > 0 && (
                          <div 
                            className="bg-gradient-to-t from-white/30 to-white/50 w-full flex items-center justify-center text-xs font-bold text-white transition-all duration-300 hover:from-white/40 hover:to-white/60"
                            style={{ height: `${unansweredHeight}px`, minHeight: day.unanswered > 0 ? '20px' : '0px' }}
                          >
                            {day.unanswered > 0 && unansweredHeight > 24 ? day.unanswered : ''}
                          </div>
                        )}
                        {/* Answered calls on bottom */}
                        {day.answered > 0 && (
                          <div 
                            className="bg-gradient-to-t from-white to-white/90 w-full flex items-center justify-center text-xs font-bold text-black transition-all duration-300 hover:from-white/90 hover:to-white"
                            style={{ height: `${answeredHeight}px`, minHeight: day.answered > 0 ? '20px' : '0px' }}
                          >
                            {day.answered > 0 && answeredHeight > 24 ? day.answered : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced date label */}
                    <div className="text-center">
                      <div className="text-xs font-medium text-white/80">
                        {day.date.slice(-5)}
                      </div>
                      <div className="text-[10px] text-white/50">
                        {(() => {
                          try {
                            const [dayPart, monthPart] = day.date.slice(-5).split('/');
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return months[parseInt(monthPart) - 1] || '';
                          } catch {
                            return '';
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Staff Performance - Enhanced Vertical Bars with Full Names */}
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10 h-[650px] flex flex-col print:bg-white print:border-gray-300 print:h-auto print:mb-6 print:page-break-inside-avoid">
          <div className="flex items-center justify-between mb-6 print:mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 print:text-black print:text-xl">Staff Performance</h2>
              <p className="text-xs text-white/50 print:text-gray-600">Calls handled by team members</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-sm print:bg-gray-800"></div>
                <span className="text-white/70 print:text-gray-700">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white/40 rounded-sm print:bg-gray-400"></div>
                <span className="text-white/70 print:text-gray-700">Unanswered</span>
              </div>
            </div>
          </div>
          
          {/* Print-friendly staff summary */}
          <div className="hidden print:block bg-gray-50 p-4 border border-gray-300 rounded">
            <h3 className="font-semibold text-black mb-3">Staff Performance Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {dashboardAgg.staff.slice(0, 9).map((staff, index) => (
                <div key={index} className="text-center p-2 border border-gray-200 rounded">
                  <div className="font-medium text-black">{staff.name}</div>
                  <div className="text-green-600">✓ {staff.answered}</div>
                  <div className="text-red-600">✗ {staff.unanswered}</div>
                  <div className="font-bold text-black">Total: {staff.total}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive chart (hidden in print) */}
          <div className="h-[450px] flex items-end justify-end gap-3 px-6 pt-16 overflow-x-auto print:hidden">
            {dashboardAgg.staff.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <Users className="w-6 h-6 text-white/30" />
                  </div>
                  <span className="text-white/60 text-sm">No data for selected period</span>
                </div>
              </div>
            ) : (
              dashboardAgg.staff.map((staff, index) => {
                const maxValue = Math.max(...dashboardAgg.staff.map(s => s.total), 1);
                const totalHeight = 320; // Reduced height to make room for total numbers
                const totalBarHeight = Math.max((staff.total / maxValue) * totalHeight, staff.total > 0 ? 24 : 0);
                const answeredRatio = staff.total > 0 ? staff.answered / staff.total : 0;
                const unansweredRatio = staff.total > 0 ? staff.unanswered / staff.total : 0;
                const answeredHeight = totalBarHeight * answeredRatio;
                const unansweredHeight = totalBarHeight * unansweredRatio;
                
                // Get staff member info for department color
                const staffMember = staffMembers.find(s => s.name === staff.name);
                const departmentColor = staffMember?.department === 'Service' ? 'from-blue-500/20 to-blue-600/10' :
                                     staffMember?.department === 'Sales' ? 'from-green-500/20 to-green-600/10' :
                                     staffMember?.department === 'Leasing' ? 'from-purple-500/20 to-purple-600/10' :
                                     'from-gray-500/20 to-gray-600/10';
                
                return (
                  <div key={staff.name} className="flex flex-col items-center justify-end gap-2" style={{ minWidth: '80px', maxWidth: '100px', height: '100%' }}>
                    
                    <div className="flex flex-col justify-end items-center relative" style={{ height: `${totalHeight + 50}px` }}>
                      {/* Total count above bar */}
                      {staff.total > 0 && (
                        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-full border border-white/20">
                          {staff.total}
                        </div>
                      )}
                      
                      {/* Stacked bar with department-themed accent */}
                      <div className="w-full flex flex-col rounded-t-lg overflow-hidden shadow-lg border border-white/20 relative" style={{ height: `${totalBarHeight}px`, minWidth: '56px' }}>
                        {/* Department color accent on left */}
                        <div className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b ${departmentColor.replace('/20', '/60').replace('/10', '/40')} rounded-l-lg`}></div>
                        
                        {/* Unanswered calls on top */}
                        {staff.unanswered > 0 && (
                          <div 
                            className="bg-gradient-to-t from-white/30 to-white/50 w-full flex items-center justify-center text-xs font-bold text-white transition-all duration-300 hover:from-white/40 hover:to-white/60"
                            style={{ height: `${unansweredHeight}px`, minHeight: staff.unanswered > 0 ? '20px' : '0px' }}
                          >
                            {staff.unanswered > 0 && unansweredHeight > 24 ? staff.unanswered : ''}
                          </div>
                        )}
                        {/* Answered calls on bottom */}
                        {staff.answered > 0 && (
                          <div 
                            className="bg-gradient-to-t from-white to-white/90 w-full flex items-center justify-center text-xs font-bold text-black transition-all duration-300 hover:from-white/90 hover:to-white"
                            style={{ height: `${answeredHeight}px`, minHeight: staff.answered > 0 ? '20px' : '0px' }}
                          >
                            {staff.answered > 0 && answeredHeight > 24 ? staff.answered : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Full staff name with better formatting */}
                    <div className="text-center max-w-full">
                      <div className="text-xs font-medium text-white/90 truncate px-1" title={staff.name}>
                        {staff.name}
                      </div>
                      {/* Department badges removed as requested */}
                     </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom section with additional insights matching UV style */}
      <div className="grid gap-6 lg:grid-cols-3 mt-8">
        {/* Monthly Summary */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-3">Monthly Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Calls</span>
              <span className="text-white font-medium">{dashboardLogs.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Answered</span>
              <span className="text-white font-medium">{dashboardAgg.yearlyAnswered}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Answer Rate</span>
              <span className="text-white font-medium">{dashboardLogs.length ? ((dashboardAgg.yearlyAnswered / dashboardLogs.length) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-3">Top Performers</h3>
          <div className="space-y-2">
            {dashboardAgg.staff
              .sort((a, b) => b.answered - a.answered)
              .slice(0, 3)
              .map((staff, index) => (
              <div key={staff.name} className="flex justify-between text-sm">
                <span className="text-white/60">{staff.name}</span>
                <span className="text-white font-medium">{staff.answered} answered</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Summary */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-3">By Department</h3>
          <div className="space-y-2">
            {dashboardAgg.dept.map((dept, index) => (
              <div key={dept.name} className="flex justify-between text-sm">
                <span className="text-white/60">{dept.name}</span>
                <span className="text-white font-medium">{dept.total} calls</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Data Content
  const renderDataEntry = () => (
    <div className="px-6 py-8 h-full overflow-y-auto min-h-0">
      {/* Header with tabs and controls */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Internal Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeSubTab === 'dashboard'
                  ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveSubTab('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeSubTab === 'data'
                  ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <Database className="w-4 h-4" />
              Data Entry
            </button>
            <button
              onClick={() => setActiveSubTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeSubTab === 'staff'
                  ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Management
            </button>
          </div>
          

          
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg font-medium text-sm hover:bg-green-600/30 transition-all duration-200 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? `Importing${importProgress > 0 ? ` (${importProgress} entries)` : ''}...` : 'Import Data'}
            </button>
            <button 
              onClick={exportData}
              disabled={isExporting || safeCallLogs.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium text-sm hover:bg-blue-600/30 transition-all duration-200 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
            <button 
              onClick={downloadSampleExcel}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-lg font-medium text-sm hover:bg-purple-600/30 transition-all duration-200"
            >
              <FileDown className="w-4 h-4" />
              Download Sample
            </button>
                          <button 
                onClick={() => {
                  const newEntry = {
                    id: `new-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toTimeString().slice(0, 5),
                    customer_name: '',
                    phone_number: '',
                    reach_out_method: 'Call',
                    person_in_charge: '',
                    answered_yn: 'Yes',
                    action_taken: '',
                    person_in_charge_2: '',
                    answered_yn_2: '',
                    notes: ''
                  };
                  setCallLogs(prev => [newEntry, ...prev]);
                  setEditingRowId(newEntry.id);
                  setEditingRow(newEntry);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium text-sm hover:brightness-110 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                New Entry
              </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Months</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Years</option>
            {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>

          {/* Person Filter */}
          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Staff</option>
            {uniquePeople.map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>

          {/* Search Bar - Made shorter */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Search by customer, phone, person, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Call Log Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-white/10 border-b border-white/10 p-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-white/80 uppercase">
              <div className="col-span-1">Date</div>
              <div className="col-span-1">Time</div>
              <div className="col-span-1">Customer</div>
              <div className="col-span-1">Phone</div>
              <div className="col-span-1">Method</div>
              <div className="col-span-1">Staff 1</div>
              <div className="col-span-1">Answered</div>
              <div className="col-span-1">Action</div>
              <div className="col-span-1">Staff 2</div>
              <div className="col-span-1">Answered</div>
              <div className="col-span-1">Notes</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {paginatedCallLogs.map((log, index) => {
              const isEditing = editingRowId === log.id;
              const currentRow = isEditing ? editingRow : log;
              
              return (
                <div
                  key={log.id}
                  className={`grid grid-cols-12 gap-3 p-3 transition-colors duration-200 ${
                    isEditing ? 'bg-blue-500/10 border border-blue-500/30' : 
                    index % 2 === 0 ? 'bg-white/2 hover:bg-white/5' : 'bg-transparent hover:bg-white/5'
                  }`}
                >
                  {/* Date */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <input
                        type="date"
                        value={currentRow.date}
                        onChange={(e) => updateEditingRow({ date: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-white/90 font-medium">{log.date}</div>
                    )}
                  </div>
                  
                  {/* Time */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <input
                        type="time"
                        value={currentRow.time}
                        onChange={(e) => updateEditingRow({ time: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-white/70 font-mono">{log.time}</div>
                    )}
                  </div>
                  
                  {/* Customer Name */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <input
                        type="text"
                        value={currentRow.customer_name}
                        onChange={(e) => updateEditingRow({ customer_name: e.target.value })}
                        placeholder="Customer Name"
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-white font-medium truncate" title={log.customer_name}>
                        {log.customer_name}
                      </div>
                    )}
                  </div>
                  
                  {/* Phone Number */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <input
                        type="text"
                        value={currentRow.phone_number}
                        onChange={(e) => updateEditingRow({ phone_number: e.target.value })}
                        placeholder="Phone"
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-white/70 font-mono">
                        {log.phone_number === 'ANONYMOUS' ? (
                          <span className="text-orange-300 font-medium">ANON</span>
                        ) : (
                          log.phone_number
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Reach Out Method */}
                  <div className="col-span-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value="Call"
                        readOnly
                        className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/70 cursor-not-allowed"
                      />
                    ) : (
                      <div className="text-sm text-white/70">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {log.reach_out_method}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Person in Charge 1 */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <select
                        value={currentRow.person_in_charge}
                        onChange={(e) => updateEditingRow({ person_in_charge: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Person</option>
                        {staffMembers.filter(s => s.status === 'Active').map(staff => (
                          <option key={staff.id} value={staff.name}>{staff.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-blue-300 font-medium truncate" title={log.person_in_charge}>
                        {log.person_in_charge || '-'}
                      </div>
                    )}
                  </div>
                
                  {/* Answered 1 */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <select
                        value={currentRow.answered_yn}
                        onChange={(e) => updateEditingRow({ answered_yn: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <div className="flex items-center">
                        {getAnsweredBadge(log.answered_yn)}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Taken */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <input
                        type="text"
                        value={currentRow.action_taken}
                        onChange={(e) => updateEditingRow({ action_taken: e.target.value })}
                        placeholder="Action"
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      getActionBadge(log.action_taken)
                    )}
                  </div>
                  
                  {/* Person in Charge 2 */}
                  <div className="col-span-1">
                    {isEditing && currentRow ? (
                      <select
                        value={currentRow.person_in_charge_2}
                        onChange={(e) => updateEditingRow({ person_in_charge_2: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Person</option>
                        {staffMembers.filter(s => s.status === 'Active').map(staff => (
                          <option key={staff.id} value={staff.name}>{staff.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-purple-300 font-medium truncate" title={log.person_in_charge_2}>
                        {log.person_in_charge_2 || '-'}
                      </div>
                    )}
                  </div>
                  
                  {/* Answered 2 */}
                  <div className="col-span-1">
                    {isEditing ? (
                      <select
                        value={currentRow?.answered_yn_2 ?? ''}
                        onChange={(e) => updateEditingRow({ answered_yn_2: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <div className="flex items-center">
                        {getAnsweredBadge(log.answered_yn_2)}
                      </div>
                    )}
                  </div>
                  
                  {/* Notes */}
                  <div className="col-span-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentRow?.notes ?? ''}
                        onChange={(e) => updateEditingRow({ notes: e.target.value })}
                        placeholder="Notes..."
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div 
                        className="text-sm text-white/80 cursor-pointer hover:bg-white/5 p-1 rounded"
                        onClick={() => {
                          setEditingRowId(log.id);
                          setEditingRow(log);
                        }}
                      >
                        {log.notes ? (
                          <div className="truncate" title={log.notes}>
                            {log.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400">Click to edit...</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-1">
                    {isEditing ? (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={async () => {
                            if (!editingRow) return;
                            
                            try {
                              // Check if this is a new entry (starts with 'new-')
                              const isNewEntry = editingRow.id.startsWith('new-');
                              
                              if (isNewEntry) {
                                // Create new entry via API
                                const apiData = {
                                  call_date: editingRow.date,
                                  call_time: editingRow.time,
                                  customer_name: editingRow.customer_name,
                                  phone_number: editingRow.phone_number,
                                  reach_out_method: editingRow.reach_out_method,
                                  person_in_charge: editingRow.person_in_charge,
                                  answered_yn: editingRow.answered_yn,
                                  action_taken: editingRow.action_taken,
                                  person_in_charge_2: editingRow.person_in_charge_2 || null,
                                  answered_yn_2: editingRow.answered_yn_2 || null,
                                  notes: editingRow.notes || null
                                };

                                const response = await fetch('/api/call-logs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(apiData),
                                });

                                if (!response.ok) {
                                  throw new Error(`Failed to save: ${response.statusText}`);
                                }

                                const savedEntry = await response.json();
                                
                                // Replace the temporary entry with the saved one
                                setCallLogs(prev => prev.map((entry): CallLogEntry => 
                                  entry.id === editingRow.id ? savedEntry : entry
                                ));
                                
                                alert('Call log entry saved successfully!');
                              } else {
                                // Update existing entry via API
                                const apiData = {
                                  call_date: editingRow.date,
                                  call_time: editingRow.time,
                                  customer_name: editingRow.customer_name,
                                  phone_number: editingRow.phone_number,
                                  reach_out_method: editingRow.reach_out_method,
                                  person_in_charge: editingRow.person_in_charge,
                                  answered_yn: editingRow.answered_yn,
                                  action_taken: editingRow.action_taken,
                                  person_in_charge_2: editingRow.person_in_charge_2 || null,
                                  answered_yn_2: editingRow.answered_yn_2 || null,
                                  notes: editingRow.notes || null
                                };

                                const response = await fetch(`/api/call-logs/${editingRow.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(apiData),
                                });

                                if (!response.ok) {
                                  throw new Error(`Failed to update: ${response.statusText}`);
                                }

                                const updatedEntry = await response.json();
                                
                                // Update the entry in local state
                                setCallLogs(prev => prev.map((entry): CallLogEntry => 
                                  entry.id === editingRow.id ? updatedEntry : entry
                                ));
                                
                                alert('Call log entry updated successfully!');
                              }
                              
                              setEditingRowId(null);
                              setEditingRow(null);
                              
                            } catch (error) {
                              alert(`Failed to save call log entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (log.id.startsWith('new-')) {
                              // Cancel new entry - remove it
                              setCallLogs(prev => prev.filter(entry => entry.id !== log.id));
                            }
                            setEditingRowId(null);
                            setEditingRow(null);
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => {
                            setEditingRowId(log.id);
                            setEditingRow(log);
                          }}
                          className="px-2 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-xs hover:bg-blue-600/30"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this call log entry?')) {
                              try {
                                // Only try to delete from database if it's not a mock/local entry
                                if (!log.id.startsWith('new-') && !mockCallLogEntries.some(mock => mock.id === log.id)) {
                                  const response = await fetch(`/api/call-logs/${log.id}`, {
                                    method: 'DELETE',
                                  });
                                  
                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || 'Failed to delete from database');
                                  }
                                }
                                
                                // Remove from local state
                                setCallLogs(prev => prev.filter(entry => entry.id !== log.id));
                              } catch (error) {
                                alert('Failed to delete entry from database. Please try again.');
                              }
                            }
                          }}
                          className="px-2 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-xs hover:bg-red-600/30"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Footer for Data Entry */}
          {paginatedCallLogs.length > 0 && (
            <div className="bg-white/5 border-t border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-sm">
                  Showing {paginatedCallLogs.length} of {filteredCallLogs.length} entries
                  {filteredCallLogs.length !== safeCallLogs.length && (
                    <span className="text-white/50"> (filtered from {safeCallLogs.length} total)</span>
                  )}
                </div>
                {displayedEntries < filteredCallLogs.length && (
                  <button
                    onClick={loadMoreEntries}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium text-sm hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Load More ({Math.min(ENTRIES_PER_PAGE, filteredCallLogs.length - displayedEntries)} more)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredCallLogs.length === 0 && (
          <div className="text-center py-12">
            <Phone className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white/70 mb-2">No call log entries found</h3>
            <p className="text-white/50">
              {searchTerm || filterPerson !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Import your existing call log data to get started'}
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{filteredCallLogs.length}</div>
            <div className="text-white/60 text-sm">Total Entries</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-300">
              {filteredCallLogs.filter(log => log.answered_yn.toLowerCase() === 'yes' || (log.answered_yn_2 && log.answered_yn_2.toLowerCase() === 'yes')).length}
            </div>
            <div className="text-white/60 text-sm">Answered Calls</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-300">
              {filteredCallLogs.filter(log => log.action_taken.toLowerCase().includes('transferred')).length}
            </div>
            <div className="text-white/60 text-sm">Transferred</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-300">
              {filteredCallLogs.filter(log => log.action_taken.toLowerCase().includes('closed')).length}
            </div>
            <div className="text-white/60 text-sm">Closed</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Staff Management Content
  const renderStaffManagement = () => {
    // Filter staff members based on search and filters
    const filteredStaff = staffMembers.filter(staff => {
      const matchesSearch = 
        staff.name.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
        staff.department.toLowerCase().includes(staffSearchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || staff.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });

    // Calculate working days stats based on selected date range
          // Use current month for working days calculation
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const rangeWorkingDays = getWorkingDaysForMonth(currentYear, currentMonth);
    
    // Filter calls for current month only to get accurate calls per working day
    const filteredCallsForRange = callLogs.filter(call => {
      const callDate = new Date(call.date);
      return callDate.getFullYear() === currentYear && callDate.getMonth() + 1 === currentMonth;
    });
    
    // Current month stats
    const currentDate = new Date();
    const currentMonthWorkingDays = getWorkingDaysForMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
    const currentMonthConfig = monthlyWorkingDays.find(wd => 
      wd.year === currentDate.getFullYear() && wd.month === currentDate.getMonth() + 1
    );

    return (
      <div className="px-6 py-8 h-full overflow-y-auto min-h-0">
        {/* Header with tabs and controls */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {/* Internal Tab Navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeSubTab === 'dashboard'
                    ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveSubTab('data')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeSubTab === 'data'
                    ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
                }`}
              >
                <Database className="w-4 h-4" />
                Data Entry
              </button>
              <button
                onClick={() => setActiveSubTab('staff')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeSubTab === 'staff'
                    ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
                }`}
              >
                <Users className="w-4 h-4" />
                Staff Management
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const newStaff: StaffMember = {
                    id: `new-staff-${Date.now()}`,
                    name: '',
                    department: 'Service',
                    status: 'Active',
                    joinDate: new Date().toISOString().split('T')[0],
                    leaveDate: '',
                    email: '',
                    phone: ''
                  };
                  setStaffMembers(prev => [newStaff, ...prev]);
                  setEditingStaffId(newStaff.id);
                  setEditingStaff(newStaff);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg font-medium text-sm hover:bg-green-600/30 transition-all duration-200"
              >
                <UserPlus className="w-4 h-4" />
                Add Staff
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium text-sm hover:bg-blue-600/30 transition-all duration-200">
                <CalendarDays className="w-4 h-4" />
                Working Calendar
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search staff by name, email, or department..."
                value={staffSearchTerm}
                onChange={(e) => setStaffSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Departments</option>
              <option value="Service">Service</option>
              <option value="Sales">Sales</option>
              <option value="Leasing">Leasing</option>
              <option value="Admin">Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Staff Directory */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg h-full overflow-hidden">
              <div className="bg-white/10 border-b border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Staff Directory
                </h3>
              </div>
              
              <div className="overflow-y-auto h-[calc(100%-60px)]">
                <div className="divide-y divide-white/5">
                  {filteredStaff.map((staff) => {
                    const isEditingStaff = editingStaffId === staff.id;
                    const currentStaff: StaffMember = (isEditingStaff && editingStaff) ? editingStaff : staff;
                    
                    return (
                      <div 
                        key={staff.id} 
                        className={`p-4 transition-colors ${
                          isEditingStaff ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-300" />
                            </div>
                            
                            <div className="flex-1">
                              {isEditingStaff ? (
                                <input
                                  type="text"
                                  value={currentStaff.name}
                                  onChange={(e) => updateEditingStaff({ name: e.target.value })}
                                  placeholder="Staff Name"
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <h4 
                                  className="font-semibold text-white cursor-pointer hover:text-blue-300"
                                  onClick={() => {
                                    setEditingStaffId(staff.id);
                                    setEditingStaff(staff);
                                  }}
                                >
                                  {staff.name || 'Click to edit name...'}
                                </h4>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {isEditingStaff ? (
                              <select
                                value={currentStaff.department as StaffMember["department"]}
                                onChange={(e) => updateEditingStaff({ department: e.target.value as StaffMember["department"] })}
                                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="Service">Service</option>
                                <option value="Sales">Sales</option>
                                <option value="Leasing">Leasing</option>
                                <option value="Admin">Admin</option>
                              </select>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                staff.department === 'Service' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                staff.department === 'Sales' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                staff.department === 'Leasing' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                              }`}>
                                {staff.department}
                              </span>
                            )}
                            
                            {isEditingStaff ? (
                              <select
                                value={currentStaff?.status || 'Active'}
                                onChange={(e) => updateEditingStaff({ status: e.target.value as 'Active' | 'Inactive' })}
                                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                staff.status === 'Active' 
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {staff.status}
                              </span>
                            )}
                            
                            {isEditingStaff ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!editingStaff) return;
                                    await saveStaffMember(editingStaff);
                                  }}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (staff.id.startsWith('new-staff-')) {
                                      // Cancel new staff - remove it
                                      setStaffMembers(prev => prev.filter(member => member.id !== staff.id));
                                    }
                                    setEditingStaffId(null);
                                    setEditingStaff(null);
                                  }}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingStaffId(staff.id);
                                  setEditingStaff(staff);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4 text-white/60 hover:text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Working Calendar & Stats */}
          <div className="space-y-6">
            {/* Working Days Stats */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Data Entry Schedule
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-white">{rangeWorkingDays}</div>
                  <div className="text-white/60 text-sm">Working Days (Current Month)</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-green-300">{currentMonthConfig ? ((currentMonthWorkingDays / currentMonthConfig.totalDays) * 100).toFixed(1) : '0.0'}%</div>
                  <div className="text-white/60 text-sm">Monthly Efficiency Rate</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-purple-300">{filteredCallsForRange.length}</div>
                  <div className="text-white/60 text-sm">Total Calls in Range</div>
                </div>
              </div>
            </div>

            {/* Working Days Configuration */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Monthly Config
              </h3>
              
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {monthlyWorkingDays.slice(-6).map((config) => (
                  <div key={`${config.year}-${config.month}`} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">
                      {new Date(config.year, config.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-white font-medium">{config.workingDays} days</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 space-y-2">
                <button 
                  onClick={() => {
                    // Ensure we have at least the next 2 years of data
                    const currentYear = new Date().getFullYear();
                    const maxYear = Math.max(...monthlyWorkingDays.map(wd => wd.year));
                    if (maxYear < currentYear + 2) {
                      const newYears = generateMonthlyWorkingDays(maxYear + 1, currentYear + 2);
                      const updatedData = [...monthlyWorkingDays, ...newYears].sort((a, b) => 
                        a.year === b.year ? a.month - b.month : a.year - b.year
                      );
                      setMonthlyWorkingDays(updatedData);
                      setEditingWorkingDaysData([...updatedData]);
                    } else {
                      setEditingWorkingDaysData([...monthlyWorkingDays]);
                    }
                    setEditingWorkingDays(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium text-sm hover:bg-blue-600/30 transition-all duration-200"
                >
                  <Calendar className="w-4 h-4" />
                  Edit Working Days
                </button>
              </div>
            </div>

            {/* Department Stats */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Department Overview</h3>
              
              <div className="space-y-3">
                {['Service', 'Sales', 'Leasing'].map(dept => {
                  const deptCount = staffMembers.filter(s => s.department === dept && s.status === 'Active').length;
                  return (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-white/70">{dept}</span>
                      <span className="text-white font-medium">{deptCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaff) {
      // Edit existing staff
      setStaffMembers(prev => prev.map(staff => 
        staff.id === selectedStaff.id 
          ? { ...staff, ...staffForm }
          : staff
      ));
    } else {
      // Add new staff
      const newStaff = {
        id: Date.now().toString(),
        ...staffForm
      };
      setStaffMembers(prev => [...prev, newStaff]);
    }
    
    // Reset form and close modals
    setStaffForm({
      name: '',
      department: 'Service',
      status: 'Active',
      joinDate: '',
      leaveDate: '',
      email: '',
      phone: ''
    });
    setSelectedStaff(null);
    setIsEditStaffModalOpen(false);
    setIsNewStaffModalOpen(false);
  };

  return (
    <div className="h-full overflow-hidden relative">

      {/* Content based on active sub-tab */}
      <div className="h-full">
        {activeSubTab === 'dashboard' ? renderDashboard() : 
         activeSubTab === 'data' ? renderDataEntry() : 
         renderStaffManagement()}
      </div>

      {/* Staff Modal (for both new and edit) */}
      {(isNewStaffModalOpen || isEditStaffModalOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => {
                  setIsNewStaffModalOpen(false);
                  setIsEditStaffModalOpen(false);
                  setSelectedStaff(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Department</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm(prev => ({ ...prev, department: e.target.value as 'Service' | 'Sales' | 'Leasing' | 'Admin' }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="Service">Service</option>
                    <option value="Sales">Sales</option>
                    <option value="Leasing">Leasing</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Status</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) => setStaffForm(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {selectedStaff ? 'Update' : 'Add'} Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewStaffModalOpen(false);
                    setIsEditStaffModalOpen(false);
                    setSelectedStaff(null);
                  }}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Working Days Edit Modal */}
      {editingWorkingDays && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Working Days Configuration</h3>
              <button
                onClick={() => {
                  setEditingWorkingDays(false);
                  setEditingWorkingDaysData([]);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm">Configure working days for each month. This affects average call calculations.</p>
                <button
                  onClick={() => {
                    const maxYear = Math.max(...editingWorkingDaysData.map(wd => wd.year));
                    const newYearData = generateMonthlyWorkingDays(maxYear + 1, maxYear + 1);
                    const updatedData = [...editingWorkingDaysData, ...newYearData].sort((a, b) => 
                      a.year === b.year ? a.month - b.month : a.year - b.year
                    );
                    setEditingWorkingDaysData(updatedData);
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Next Year
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {editingWorkingDaysData.map((config, index) => (
                  <div key={`${config.year}-${config.month}`} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">
                        {new Date(config.year, config.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <span className="text-xs text-white/50">Total: {config.totalDays} days</span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Working Days</label>
                      <input
                        type="number"
                        min="0"
                        max={config.totalDays}
                        value={config.workingDays}
                        onChange={(e) => {
                          const newData = [...editingWorkingDaysData];
                          newData[index].workingDays = parseInt(e.target.value) || 0;
                          setEditingWorkingDaysData(newData);
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => saveWorkingDaysConfig(editingWorkingDaysData)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditingWorkingDays(false);
                    setEditingWorkingDaysData([]);
                  }}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}