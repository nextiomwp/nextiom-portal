import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Download, Upload, AlertTriangle, FileSpreadsheet, Check,
  RefreshCw, FileText, ChevronRight, Settings, Info, Play, Trash,
  ShieldAlert, ListFilter, PlayCircle, Loader2, ArrowRight, CheckCircle2,
  XCircle, CheckSquare, Square
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

// ── Database Table Dependency Orders ──────────────────────────────────────────
const TABLES = [
  'portal_settings',
  'invoice_settings',
  'appointment_settings',
  'sms_settings',
  'job_settings',
  'hosting_plans',
  'products',
  'customers',
  'customer_notes',
  'licenses',
  'domains',
  'domain_requests',
  'hosting_packages',
  'hosting_requests',
  'email_requests',
  'appointments',
  'tickets',
  'ticket_messages',
  'invoices',
  'invoice_items',
  'invoice_payments',
  'quotations',
  'quotation_items',
  'agreements',
  'jobs',
  'sms_logs',
  'email_logs',
  'notifications'
];

const TABLE_LABELS = {
  portal_settings: 'Portal Settings',
  invoice_settings: 'Invoice Settings',
  appointment_settings: 'Appointment Settings',
  sms_settings: 'SMS Settings',
  job_settings: 'Job Settings',
  hosting_plans: 'Hosting Plans Catalog',
  products: 'Digital Products',
  customers: 'Customer Profiles',
  customer_notes: 'Customer Admin Notes',
  licenses: 'Product Licenses',
  domains: 'Domain Names',
  domain_requests: 'Domain Requests',
  hosting_packages: 'Hosting Accounts',
  hosting_requests: 'Hosting Requests',
  email_requests: 'Email Account Requests',
  appointments: 'Calendar Appointments',
  tickets: 'Support Tickets',
  ticket_messages: 'Ticket Message History',
  invoices: 'Invoices',
  invoice_items: 'Invoice Line Items',
  invoice_payments: 'Invoice Payment Receipts',
  quotations: 'Quotations',
  quotation_items: 'Quotation Line Items',
  agreements: 'Signed Customer Agreements',
  jobs: 'Active Work Jobs',
  sms_logs: 'SMS Delivery Logs',
  email_logs: 'Email Delivery Logs',
  notifications: 'System Notifications'
};

const TABLE_COLUMNS = {
  customers: ['id', 'user_id', 'name', 'email', 'phone', 'company', 'address', 'status', 'membership_type', 'notes', 'created_at', 'updated_at'],
  products: ['id', 'name', 'price', 'currency', 'type', 'description', 'download_url', 'license_type', 'license_registration', 'manual_updates', 'automatic_updates', 'category', 'image_url', 'renewal_enabled', 'renewal_price', 'renewal_date', 'renewal_period_days', 'license_key', 'version', 'note', 'documentation', 'created_at', 'updated_at'],
  hosting_packages: ['id', 'customer_id', 'domain', 'hosting_type', 'plan_name', 'status', 'price', 'currency', 'billing_period', 'start_date', 'expiry_date', 'username', 'password', 'server_ip', 'ns1', 'ns2', 'disk_limit', 'bandwidth_limit', 'auto_renew', 'created_at', 'updated_at'],
  domains: ['id', 'customer_id', 'domain_name', 'status', 'price', 'currency', 'billing_period', 'start_date', 'expiry_date', 'registrar', 'auto_renew', 'created_at', 'updated_at'],
  email_requests: ['id', 'customer_id', 'email_address', 'password', 'quota_mb', 'status', 'created_at', 'updated_at'],
  tickets: ['id', 'customer_id', 'subject', 'description', 'status', 'priority', 'category', 'assigned_to', 'created_at', 'updated_at'],
  appointments: ['id', 'customer_id', 'customer_name', 'customer_email', 'customer_phone', 'appointment_date', 'start_time', 'end_time', 'status', 'subject', 'notes', 'created_at', 'updated_at'],
  invoices: ['id', 'user_id', 'customer_id', 'invoice_no', 'issue_date', 'due_date', 'client_name', 'client_company', 'client_phone', 'client_email', 'client_address', 'notes', 'subtotal', 'tax', 'discount', 'total', 'currency', 'status', 'is_refunded', 'refund_amount', 'refund_date', 'refund_reason', 'is_recycled', 'recycled_at', 'created_at', 'updated_at'],
  quotations: ['id', 'user_id', 'customer_id', 'quotation_no', 'quotation_date', 'valid_until', 'client_name', 'client_company', 'client_phone', 'client_email', 'client_address', 'notes', 'total', 'currency', 'project_timeline', 'status', 'created_at', 'updated_at'],
  licenses: ['id', 'customer_id', 'product_id', 'license_key', 'status', 'activated_count', 'max_activations', 'expiry_date', 'created_at', 'updated_at'],
  customer_notes: ['id', 'customer_id', 'note_type', 'note_content', 'created_by', 'created_at', 'updated_at'],
  domain_requests: ['id', 'customer_id', 'domain_name', 'years', 'status', 'price', 'currency', 'auto_renew', 'created_at', 'updated_at'],
  hosting_requests: ['id', 'customer_id', 'hosting_type', 'plan_name', 'billing_period', 'domain_name', 'status', 'price', 'currency', 'auto_renew', 'created_at', 'updated_at'],
  ticket_messages: ['id', 'ticket_id', 'sender_id', 'message', 'is_admin', 'created_at'],
  invoice_items: ['id', 'invoice_id', 'description', 'qty', 'unit_price', 'amount', 'sort_order'],
  invoice_payments: ['id', 'invoice_id', 'customer_id', 'amount', 'payment_date', 'payment_method', 'status', 'receipt_url', 'admin_reason', 'created_at', 'updated_at'],
  quotation_items: ['id', 'quotation_id', 'description', 'qty', 'unit_price', 'amount', 'sort_order'],
  agreements: ['id', 'customer_id', 'name', 'status', 'file_path', 'signed_file_path', 'created_at', 'updated_at'],
  jobs: ['id', 'customer_id', 'title', 'category', 'service_package', 'priority', 'estimated_start', 'created_date', 'queue_position', 'status', 'assign_to', 'description', 'send_email_notification', 'customer_requirements', 'internal_notes', 'customer_view_notes', 'progress_step', 'timeline_steps', 'created_at', 'updated_at'],
  sms_logs: ['id', 'customer_id', 'phone', 'message', 'type', 'status', 'provider_ref', 'error_msg', 'sent_at'],
  email_logs: ['id', 'customer_id', 'email_type', 'subject', 'status', 'error_msg', 'sent_at'],
  notifications: ['id', 'customer_id', 'title', 'message', 'type', 'is_read', 'created_at'],
  portal_settings: ['id', 'customer_actions_enabled', 'customer_actions_start_date', 'customer_actions_end_date', 'customer_actions_note', 'maintenance_mode', 'maintenance_message', 'maintenance_expected_downtime', 'maintenance_start_date', 'maintenance_end_date', 'created_at', 'updated_at'],
  invoice_settings: ['id', 'user_id', 'company_name', 'company_email', 'company_phone', 'company_address', 'bank_name', 'bank_branch', 'bank_account_no', 'bank_account_name', 'bank_swift', 'logo_url', 'created_at', 'updated_at'],
  appointment_settings: ['id', 'booking_start_time', 'booking_end_time', 'allowed_days', 'slot_duration_minutes', 'customer_sms_reminders', 'admin_sms_reminder_minutes', 'admin_sms_numbers', 'show_fake_to_customers', 'show_real_to_customers', 'appointment_sms_enabled', 'appointment_email_enabled', 'created_at', 'updated_at'],
  sms_settings: ['id', 'api_token', 'sender_id', 'sms_enabled', 'login_otp', 'always_otp', 'renewal_reminder', 'purchase_sms', 'reminder_days', 'created_at', 'updated_at'],
  job_settings: ['id', 'show_custom_active_jobs', 'custom_active_jobs_count', 'max_concurrent_jobs', 'display_queue_to_customers', 'display_active_job_count', 'display_queue_position', 'auto_sort_jobs_in_queue', 'queue_position_mode', 'created_at', 'updated_at']
};

export default function AdminBackupPage({ isDark }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
  const [dbStats, setDbStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedTables, setSelectedTables] = useState(
    TABLES.reduce((acc, t) => ({ ...acc, [t]: true }), {})
  );

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLogs, setExportLogs] = useState([]);

  // Import State
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Map/Configure, 3: Execute
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null); // JSON object or CSV row array
  const [fileType, setFileType] = useState(''); // 'json' | 'csv'
  const [targetTable, setTargetTable] = useState('customers'); // For CSV import
  const [csvMappings, setCsvMappings] = useState({}); // CSV Header -> DB Column mapping
  const [cleanRestore, setCleanRestore] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [importLogs, setImportLogs] = useState([]);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef(null);
  const logTerminalEndRef = useRef(null);

  // Theme configuration matching portal guidelines
  const c = isDark
    ? {
        bg: '#15161A', card: '#1C1E24', panel2: '#22252C',
        border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)',
        text: '#fff', subText: '#a0a0a0', brand: 'var(--brand-color)',
        hover: 'rgba(255,255,255,0.04)', inputBg: '#1C1E24', inputBorder: 'rgba(255,255,255,0.10)',
        danger: '#ef4444', dangerBg: 'rgba(239, 68, 68, 0.15)',
        success: '#10b981', successBg: 'rgba(16, 185, 129, 0.15)',
      }
    : {
        bg: '#f8f8f7', card: '#fff', panel2: '#f5f5f5',
        border: '#ebebeb', borderStrong: '#d0d0d0',
        text: '#1a1a1a', subText: '#888', brand: 'var(--brand-color)',
        hover: '#f5f5f5', inputBg: '#fff', inputBorder: '#e2e8f0',
        danger: '#dc2626', dangerBg: 'rgba(220, 38, 38, 0.1)',
        success: '#059669', successBg: 'rgba(5, 150, 105, 0.1)',
      };

  const cardStyle = {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: 24,
    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden'
  };

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [exportLogs, importLogs]);

  const loadDatabaseStats = async () => {
    setLoadingStats(true);
    const stats = {};
    try {
      await Promise.all(
        TABLES.map(async (table) => {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            // Table doesn't exist or is not queryable
            stats[table] = 'N/A';
          } else {
            stats[table] = count || 0;
          }
        })
      );
      setDbStats(stats);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch table sizes.', variant: 'destructive' });
    } finally {
      setLoadingStats(false);
    }
  };

  // ── Helper to write logs in execution panels ──────────────────────────────
  const addLog = (msg, type = 'info', setter) => {
    const time = new Date().toLocaleTimeString();
    setter(prev => [...prev, { time, msg, type }]);
  };

  // ── Fetch paginated rows from Supabase ─────────────────────────────────────
  const fetchAllRows = async (tableName) => {
    let allRows = [];
    let from = 0;
    let to = 999;
    let keepFetching = true;

    while (keepFetching) {
      // Try ordering by id
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, to)
        .order('id', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation does not exist')) {
          return null; // Skip table
        }
        // Fallback without order
        const { data: dataNoOrder, error: errorNoOrder } = await supabase
          .from(tableName)
          .select('*')
          .range(from, to);

        if (errorNoOrder) throw errorNoOrder;

        allRows = [...allRows, ...dataNoOrder];
        if (dataNoOrder.length < 1000) {
          keepFetching = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        allRows = [...allRows, ...data];
        if (data.length < 1000) {
          keepFetching = false;
        } else {
          from += 1000;
          to += 1000;
        }
      }
    }
    return allRows;
  };

  // ── EXPORT ENGINE ──────────────────────────────────────────────────────────
  const handleExport = async (format) => {
    const selectedList = Object.keys(selectedTables).filter(t => selectedTables[t]);
    if (selectedList.length === 0) {
      toast({ title: 'Export Failed', description: 'Please select at least one table to export.', variant: 'destructive' });
      return;
    }

    setExporting(true);
    setExportProgress(0);
    setExportLogs([]);
    addLog(`Starting backup in ${format.toUpperCase()} format...`, 'info', setExportLogs);

    const backupData = {};
    let successCount = 0;

    for (let i = 0; i < selectedList.length; i++) {
      const tableName = selectedList[i];
      addLog(`Querying table: "${tableName}"...`, 'info', setExportLogs);

      try {
        const rows = await fetchAllRows(tableName);
        if (rows === null) {
          addLog(`Skipped: Table "${tableName}" does not exist in schema.`, 'warning', setExportLogs);
        } else {
          backupData[tableName] = rows;
          addLog(`Successfully loaded ${rows.length} rows from "${tableName}".`, 'success', setExportLogs);
          successCount++;
        }
      } catch (err) {
        addLog(`Error querying table "${tableName}": ${err?.message || String(err)}`, 'error', setExportLogs);
      }

      setExportProgress(Math.round(((i + 1) / selectedList.length) * 100));
    }

    if (successCount === 0) {
      addLog('Backup failed: No tables were exported successfully.', 'error', setExportLogs);
      setExporting(false);
      return;
    }

    addLog('Compiling files for download...', 'info', setExportLogs);

    try {
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      
      if (format === 'json') {
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        triggerDownload(blob, `nextiom_backup_${dateStr}.json`);
        addLog('Backup JSON file downloaded successfully!', 'success', setExportLogs);
      } 
      else if (format === 'excel') {
        const xmlContent = buildExcelWorkbookXml(backupData);
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        triggerDownload(blob, `nextiom_backup_${dateStr}.xls`);
        addLog('Multi-sheet Excel Workbook (.xls) downloaded successfully!', 'success', setExportLogs);
      } 
      else if (format === 'csv') {
        // Since we are downloading multiple files natively in standard JS without a zip package:
        // We trigger downloads sequentially.
        addLog('Initiating sequential CSV downloads for all tables...', 'info', setExportLogs);
        for (const [tableName, rows] of Object.entries(backupData)) {
          if (rows.length === 0) continue;
          const csvText = convertToCsv(rows);
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, `${tableName}_export_${dateStr}.csv`);
          addLog(`Downloaded CSV for ${tableName} (${rows.length} records)`, 'success', setExportLogs);
        }
      }
      toast({ title: 'Export Complete', description: `Backup file(s) saved to your local PC.`, variant: 'default' });
    } catch (err) {
      addLog(`Failed to compile backup files: ${err?.message || String(err)}`, 'error', setExportLogs);
    } finally {
      setExporting(false);
    }
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.target = '_blank';
    
    // Prevent React Router or global link interceptors from capturing this click and navigating/reloading
    const stopPropagation = (e) => {
      e.stopPropagation();
    };
    link.addEventListener('click', stopPropagation, { capture: true });
    link.addEventListener('click', stopPropagation, { once: true });
    
    document.body.appendChild(link);
    link.click();
    
    // Keep link in DOM and URL active briefly so asynchronous browser downloads can initialize
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
  };

  const buildExcelWorkbookXml = (tablesData) => {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Nextiom Admin Portal</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
`;

    for (const [tableName, rows] of Object.entries(tablesData)) {
      if (!rows || rows.length === 0) continue;
      const headers = Object.keys(rows[0]);
      const sheetName = (TABLE_LABELS[tableName] || tableName).slice(0, 30).replace(/[:\\\?\*\/\[\]]/g, '');

      xml += ` <Worksheet ss:Name="${sheetName}">\n  <Table>\n`;
      
      // Header Row
      xml += `   <Row>\n`;
      for (const header of headers) {
        xml += `    <Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
      }
      xml += `   </Row>\n`;

      // Data Rows
      for (const row of rows) {
        xml += `   <Row>\n`;
        for (const header of headers) {
          const val = row[header];
          let type = "String";
          let valStr = "";

          if (val === null || val === undefined) {
            valStr = "";
          } else if (typeof val === 'number') {
            type = "Number";
            valStr = String(val);
          } else if (typeof val === 'boolean') {
            type = "Boolean";
            valStr = val ? "1" : "0";
          } else if (typeof val === 'object') {
            valStr = JSON.stringify(val);
          } else {
            valStr = String(val);
          }

          xml += `    <Cell><Data ss:Type="${type}">${escapeXml(valStr)}</Data></Cell>\n`;
        }
        xml += `   </Row>\n`;
      }

      xml += `  </Table>\n </Worksheet>\n`;
    }

    xml += `</Workbook>`;
    return xml;
  };

  const escapeXml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const convertToCsv = (rows) => {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map(header => {
        const val = row[header];
        let valStr = '';
        if (val === null || val === undefined) {
          valStr = '';
        } else if (typeof val === 'object') {
          valStr = JSON.stringify(val);
        } else {
          valStr = String(val);
        }
        const escaped = valStr.replace(/"/g, '""');
        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
          return `"${escaped}"`;
        }
        return escaped;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  // ── CSV PARSER ─────────────────────────────────────────────────────────────
  const parseCsv = (csvText) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const c = csvText[i];
      const next = csvText[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push("");
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }

    if (lines.length < 2) return [];
    const headers = lines[0].map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      if (values.length !== headers.length) {
        if (values.length === 1 && values[0] === "") continue; // skip empty line
      }
      const obj = {};
      headers.forEach((header, idx) => {
        let val = values[idx] || '';
        if (val.toLowerCase() === 'true') val = true;
        else if (val.toLowerCase() === 'false') val = false;
        else if (val === 'null' || val === '') val = null;
        else if (!isNaN(val) && val.trim() !== '') val = Number(val);
        else {
          try {
            if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
              val = JSON.parse(val);
            }
          } catch (e) {}
        }
        obj[header] = val;
      });
      data.push(obj);
    }
    return data;
  };

  // ── FILE UPLOAD / PARSE ───────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      setFileType('json');
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          setParsedData(parsed);
          setImportStep(2);
        } catch (err) {
          toast({ title: 'Invalid JSON', description: 'Failed to parse JSON file.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    } 
    else if (file.name.endsWith('.csv')) {
      setFileType('csv');
      reader.onload = (event) => {
        try {
          const parsedRows = parseCsv(event.target.result);
          if (parsedRows.length === 0) {
            toast({ title: 'Empty CSV', description: 'CSV file contains no rows.', variant: 'destructive' });
            return;
          }
          setParsedData(parsedRows);
          
          // Auto map columns
          const csvHeaders = Object.keys(parsedRows[0]);
          const initialMapping = {};
          const targetCols = TABLE_COLUMNS[targetTable] || [];
          
          csvHeaders.forEach(header => {
            const hClean = header.toLowerCase().replace(/[\s_-]/g, '');
            const matchingCol = targetCols.find(col => {
              const cClean = col.toLowerCase().replace(/[\s_-]/g, '');
              return cClean === hClean || hClean.includes(cClean) || cClean.includes(hClean);
            });
            initialMapping[header] = matchingCol || '';
          });
          
          setCsvMappings(initialMapping);
          setImportStep(2);
        } catch (err) {
          toast({ title: 'Invalid CSV', description: 'Failed to parse CSV file.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    } 
    else {
      toast({ title: 'Unsupported format', description: 'Please upload a .json or .csv backup file.', variant: 'destructive' });
    }
  };

  // Update mappings when target table changes for CSV
  useEffect(() => {
    if (fileType === 'csv' && parsedData && parsedData.length > 0) {
      const csvHeaders = Object.keys(parsedData[0]);
      const initialMapping = {};
      const targetCols = TABLE_COLUMNS[targetTable] || [];

      csvHeaders.forEach(header => {
        const hClean = header.toLowerCase().replace(/[\s_-]/g, '');
        const matchingCol = targetCols.find(col => {
          const cClean = col.toLowerCase().replace(/[\s_-]/g, '');
          return cClean === hClean || hClean.includes(cClean) || cClean.includes(hClean);
        });
        initialMapping[header] = matchingCol || '';
      });
      setCsvMappings(initialMapping);
    }
  }, [targetTable, fileType]);

  // ── IMPORT EXECUTION ──────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    setImportStep(3);
    setImportProgress(0);
    setImportLogs([]);
    addLog('Starting import session...', 'info', setImportLogs);

    if (fileType === 'json') {
      const tablesToImport = Object.keys(parsedData).filter(t => TABLES.includes(t));
      if (tablesToImport.length === 0) {
        addLog('Failed: No valid Nextiom database tables found in JSON file.', 'error', setImportLogs);
        setImporting(false);
        return;
      }

      // Order tables by dependency order
      const orderedTables = TABLES.filter(t => tablesToImport.includes(t));

      // ── Step A: Wipe database if Clean Mode enabled ──
      if (cleanRestore) {
        addLog('WIPING database records in reverse dependency order...', 'warning', setImportLogs);
        const reversedTables = [...orderedTables].reverse();
        
        for (let i = 0; i < reversedTables.length; i++) {
          const t = reversedTables[i];
          addLog(`Cleaning table: "${t}"...`, 'info', setImportLogs);
          try {
            // Wipes all data securely by targeting all records whose id is not null
            const { error } = await supabase.from(t).delete().not('id', 'is', null);
            if (error) throw error;
            addLog(`Successfully wiped "${t}".`, 'success', setImportLogs);
          } catch (err) {
            addLog(`Error cleaning table "${t}": ${err?.message || String(err)}`, 'error', setImportLogs);
            addLog('Halting import for database safety.', 'error', setImportLogs);
            setImporting(false);
            return;
          }
        }
      }

      // ── Step B: Insert records in forward dependency order ──
      let totalImported = 0;
      for (let i = 0; i < orderedTables.length; i++) {
        const t = orderedTables[i];
        const rows = parsedData[t];
        if (!rows || rows.length === 0) {
          addLog(`Table "${t}" has no records to import. Skipping.`, 'info', setImportLogs);
          continue;
        }

        addLog(`Importing ${rows.length} records into table "${t}"...`, 'info', setImportLogs);
        try {
          // Break into chunks of 100 for safety
          const chunkSize = 100;
          for (let cIdx = 0; cIdx < rows.length; cIdx += chunkSize) {
            const chunk = rows.slice(cIdx, cIdx + chunkSize);
            const { error } = await supabase.from(t).upsert(chunk);
            if (error) throw error;
          }
          addLog(`Successfully imported ${rows.length} rows into "${t}".`, 'success', setImportLogs);
          totalImported += rows.length;
        } catch (err) {
          addLog(`Error importing into "${t}": ${err?.message || String(err)}`, 'error', setImportLogs);
          addLog(`Continuing with other tables...`, 'warning', setImportLogs);
        }
        setImportProgress(Math.round(((i + 1) / orderedTables.length) * 100));
      }

      addLog(`Full JSON Restore completed. Total records restored: ${totalImported}.`, 'success', setImportLogs);
    } 
    else if (fileType === 'csv') {
      // Map CSV keys to DB keys
      const mappedRows = parsedData.map(row => {
        const obj = {};
        Object.keys(row).forEach(csvKey => {
          const dbKey = csvMappings[csvKey];
          if (dbKey) {
            obj[dbKey] = row[csvKey];
          }
        });
        return obj;
      });

      addLog(`Prepared ${mappedRows.length} mapped records for "${targetTable}".`, 'info', setImportLogs);

      if (cleanRestore) {
        addLog(`Wiping existing data from "${targetTable}" first...`, 'warning', setImportLogs);
        try {
          const { error } = await supabase.from(targetTable).delete().not('id', 'is', null);
          if (error) throw error;
          addLog(`Table "${targetTable}" cleaned.`, 'success', setImportLogs);
        } catch (err) {
          addLog(`Error cleaning table "${targetTable}": ${err?.message || String(err)}`, 'error', setImportLogs);
          setImporting(false);
          return;
        }
      }

      try {
        addLog(`Inserting records into "${targetTable}"...`, 'info', setImportLogs);
        const chunkSize = 100;
        let successCount = 0;
        for (let i = 0; i < mappedRows.length; i += chunkSize) {
          const chunk = mappedRows.slice(i, i + chunkSize);
          const { error } = await supabase.from(targetTable).upsert(chunk);
          if (error) throw error;
          successCount += chunk.length;
          setImportProgress(Math.round((successCount / mappedRows.length) * 100));
        }
        addLog(`Successfully imported ${successCount} records into "${targetTable}"!`, 'success', setImportLogs);
      } catch (err) {
        addLog(`Error during CSV insertion: ${err?.message || String(err)}`, 'error', setImportLogs);
      }
    }

    setImporting(false);
    loadDatabaseStats();
    toast({ title: 'Import Finished', description: 'Data import completed. Review logs.', variant: 'default' });
  };

  const handleResetImport = () => {
    setUploadedFile(null);
    setParsedData(null);
    setFileType('');
    setImportStep(1);
    setConfirmClean(false);
    setImportLogs([]);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ padding: '30px 40px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      
      {/* ── Title Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={24} style={{ color: 'var(--brand-color)' }} />
            Database Backup & Restore
          </h1>
          <p style={{ fontSize: 13, color: c.subText, margin: '6px 0 0 0' }}>
            Safeguard your system. Backup and restore all customers, hostings, domains, products, invoices, tickets, appointments, and configs.
          </p>
        </div>
        <button
          onClick={loadDatabaseStats}
          disabled={loadingStats}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: c.hover, border: `1px solid ${c.border}`, color: c.text,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={14} className={loadingStats ? 'animate-spin' : ''} />
          {loadingStats ? 'Loading sizes...' : 'Refresh Database'}
        </button>
      </div>

      {/* ── Tabs Selector ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 25, borderBottom: `1px solid ${c.border}`, paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: activeTab === 'export' ? 700 : 500,
            background: activeTab === 'export' ? 'var(--brand-color)' : 'transparent',
            color: activeTab === 'export' ? '#fff' : c.subText,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <Download size={15} />
          Export Local Backup
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: activeTab === 'import' ? 700 : 500,
            background: activeTab === 'import' ? 'var(--brand-color)' : 'transparent',
            color: activeTab === 'import' ? '#fff' : c.subText,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <Upload size={15} />
          Import / Restore Data
        </button>
      </div>

      {/* ── Tab 1: Export Backup Page ────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 30, alignItems: 'start' }}>
          
          {/* Table select options list */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: c.text }}>Select Database Tables to Export</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setSelectedTables(TABLES.reduce((acc, t) => ({ ...acc, [t]: true }), {}))}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-color)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Check All
                </button>
                <span style={{ color: c.borderStrong }}>|</span>
                <button
                  onClick={() => setSelectedTables(TABLES.reduce((acc, t) => ({ ...acc, [t]: false }), {}))}
                  style={{ background: 'none', border: 'none', color: c.subText, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Uncheck All
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '60dvh', overflowY: 'auto', paddingRight: 10 }}>
              {TABLES.map(table => {
                const count = dbStats[table];
                return (
                  <label
                    key={table}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: selectedTables[table] ? `${c.brand}05` : 'transparent',
                      borderBottom: `1px solid ${c.border}`,
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedTables[table]}
                        onChange={(e) => setSelectedTables(prev => ({ ...prev, [table]: e.target.checked }))}
                        style={{ cursor: 'pointer', accentColor: 'var(--brand-color)', width: 16, height: 16 }}
                      />
                      <div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: c.text }}>{TABLE_LABELS[table] || table}</span>
                        <span style={{ fontSize: 11, color: c.subText, fontFamily: 'monospace', marginLeft: 8 }}>({table})</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
                      background: count > 0 ? c.successBg : c.panel2,
                      color: count > 0 ? c.success : c.subText,
                      padding: '2px 8px', borderRadius: 6
                    }}>
                      {loadingStats ? '...' : count === 'N/A' ? 'Not Found' : `${count} rows`}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Export configuration options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 15px 0', color: c.text }}>Export Local Backup Files</h3>
              <p style={{ fontSize: 12.5, color: c.subText, lineHeight: 1.5, margin: '0 0 20px 0' }}>
                Download your system records onto your computer. We support format-specific options:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* JSON export */}
                <button
                  disabled={exporting}
                  onClick={() => handleExport('json')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 10, border: `1.5px solid ${c.border}`,
                    background: c.hover, color: c.text, textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s', outline: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ padding: 8, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: 8 }}>
                      <Database size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>JSON Format (.json)</div>
                      <div style={{ fontSize: 11.5, color: c.subText, marginTop: 2 }}>Recommended: backups full schema, clean restores</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: c.subText }} />
                </button>

                {/* Excel export */}
                <button
                  disabled={exporting}
                  onClick={() => handleExport('excel')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 10, border: `1.5px solid ${c.border}`,
                    background: c.hover, color: c.text, textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s', outline: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ padding: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 8 }}>
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Excel Workbook (.xls)</div>
                      <div style={{ fontSize: 11.5, color: c.subText, marginTop: 2 }}>Export all tables into sheets of a single workbook</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: c.subText }} />
                </button>

                {/* CSV export */}
                <button
                  disabled={exporting}
                  onClick={() => handleExport('csv')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 10, border: `1.5px solid ${c.border}`,
                    background: c.hover, color: c.text, textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s', outline: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ padding: 8, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: 8 }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Individual CSV Sheets (.csv)</div>
                      <div style={{ fontSize: 11.5, color: c.subText, marginTop: 2 }}>Download separate CSV tables for custom tools</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: c.subText }} />
                </button>
              </div>
            </div>

            {/* Live Terminal Log */}
            {(exporting || exportLogs.length > 0) && (
              <div style={{ ...cardStyle, background: '#0e1116', border: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Export Monitor</div>
                  {exporting && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--brand-color)' }} />}
                </div>

                {exporting && (
                  <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', background: 'var(--brand-color)', width: `${exportProgress}%`, transition: 'width 0.2s' }} />
                  </div>
                )}

                <div style={{
                  height: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11.5,
                  lineHeight: 1.6, color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: 4
                }}>
                  {exportLogs.map((log, index) => (
                    <div key={index} style={{ color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#10b981' : log.type === 'warning' ? '#f59e0b' : '#d1d5db' }}>
                      <span style={{ color: '#6b7280', marginRight: 8 }}>[{log.time}]</span>
                      {log.msg}
                    </div>
                  ))}
                  <div ref={logTerminalEndRef} />
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ── Tab 2: Import Backup Page ────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Import Wizard steps header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: importStep >= 1 ? 'var(--brand-color)' : c.borderStrong,
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center'
              }}>1</span>
              <span style={{ fontSize: 13, fontWeight: importStep === 1 ? 700 : 500, color: importStep === 1 ? c.text : c.subText }}>Upload File</span>
            </div>
            <ArrowRight size={16} style={{ color: c.subText }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: importStep >= 2 ? 'var(--brand-color)' : c.borderStrong,
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center'
              }}>2</span>
              <span style={{ fontSize: 13, fontWeight: importStep === 2 ? 700 : 500, color: importStep === 2 ? c.text : c.subText }}>Configure & Map</span>
            </div>
            <ArrowRight size={16} style={{ color: c.subText }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: importStep >= 3 ? 'var(--brand-color)' : c.borderStrong,
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center'
              }}>3</span>
              <span style={{ fontSize: 13, fontWeight: importStep === 3 ? 700 : 500, color: importStep === 3 ? c.text : c.subText }}>Execution Log</span>
            </div>
          </div>

          {/* Wizard step 1: File selection drag and drop */}
          {importStep === 1 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const syntheticEvent = { target: { files: [file] } };
                  handleFileUpload(syntheticEvent);
                }
              }}
              style={{
                ...cardStyle,
                border: `2px dashed ${c.borderStrong}`,
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                background: `${c.brand}02`,
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.csv"
                style={{ display: 'none' }}
              />
              <div style={{ padding: 16, background: `${c.brand}10`, color: 'var(--brand-color)', borderRadius: '50%' }}>
                <Upload size={32} />
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 6px 0' }}>Drag & Drop local backup file here</h4>
                <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>Supports .json (full DB backups) or .csv (individual sheets) files</p>
              </div>
            </div>
          )}

          {/* Wizard step 2: Configuration and mapping options */}
          {importStep === 2 && parsedData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30, alignItems: 'start' }}>
              
              {/* Left Column: Import settings details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: c.text }}>Uploaded Backup File Details</h3>
                  <div style={{ background: c.panel2, padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: c.subText }}>File Name:</span>
                      <span style={{ fontWeight: 600, color: c.text }}>{uploadedFile?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: c.subText }}>File Type:</span>
                      <span style={{ fontWeight: 700, color: 'var(--brand-color)', textTransform: 'uppercase' }}>{fileType}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: c.subText }}>File Size:</span>
                      <span style={{ fontWeight: 600, color: c.text }}>{(uploadedFile?.size / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>

                  {/* JSON summary */}
                  {fileType === 'json' && (
                    <div style={{ marginTop: 20 }}>
                      <h4 style={{ fontSize: 13.5, fontWeight: 700, color: c.text, marginBottom: 10 }}>Tables Found in Backup File:</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.keys(parsedData).map(t => (
                          <span key={t} style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 6,
                            background: c.border, border: `1px solid ${c.borderStrong}`,
                            color: c.text, display: 'inline-flex', alignItems: 'center', gap: 6
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: TABLES.includes(t) ? '#10b981' : '#f59e0b' }} />
                            {TABLE_LABELS[t] || t} ({parsedData[t]?.length} rows)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CSV configuration */}
                  {fileType === 'csv' && (
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: c.text, display: 'block', marginBottom: 6 }}>Target Database Table:</label>
                        <select
                          value={targetTable}
                          onChange={(e) => setTargetTable(e.target.value)}
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.borderStrong}`,
                            background: c.inputBg, color: c.text, fontSize: 13.5, outline: 'none'
                          }}
                        >
                          {TABLES.map(t => (
                            <option key={t} value={t}>{TABLE_LABELS[t] || t} ({t})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ fontSize: 12.5, color: c.subText }}>
                        Detected <strong>{parsedData.length} records</strong>. Please align CSV headers to matching database fields on the right.
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview of first records */}
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: c.text }}>Data Preview (First 3 Rows)</h3>
                  <div style={{ overflowX: 'auto', maxHeight: 200, fontSize: 12, border: `1px solid ${c.border}`, borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: c.panel2 }}>
                          {fileType === 'json' ? (
                            <>
                              <th style={{ padding: 8, borderBottom: `1px solid ${c.borderStrong}`, color: c.text }}>Table</th>
                              <th style={{ padding: 8, borderBottom: `1px solid ${c.borderStrong}`, color: c.text }}>Sample Row Data</th>
                            </>
                          ) : (
                            Object.keys(parsedData[0]).map(h => (
                              <th key={h} style={{ padding: 8, borderBottom: `1px solid ${c.borderStrong}`, color: c.text }}>{h}</th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {fileType === 'json' ? (
                          Object.keys(parsedData).slice(0, 3).map(t => (
                            <tr key={t} style={{ borderBottom: `1px solid ${c.border}` }}>
                              <td style={{ padding: 8, fontWeight: 600, color: c.text }}>{t}</td>
                              <td style={{ padding: 8, color: c.subText, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
                                {JSON.stringify(parsedData[t]?.[0] || {})}
                              </td>
                            </tr>
                          ))
                        ) : (
                          parsedData.slice(0, 3).map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${c.border}` }}>
                              {Object.keys(parsedData[0]).map(h => (
                                <td key={h} style={{ padding: 8, color: c.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                                  {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h] || '')}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Execution settings and mapping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Column mapping for CSV */}
                {fileType === 'csv' && (
                  <div style={cardStyle}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 15px 0', color: c.text }}>CSV Column Mappings</h3>
                    <p style={{ fontSize: 11.5, color: c.subText, lineHeight: 1.5, margin: '0 0 15px 0' }}>
                      Map the columns in your CSV file to database fields. Unmapped columns will be skipped during import.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto', paddingRight: 5 }}>
                      {Object.keys(parsedData[0]).map(csvHeader => (
                        <div key={csvHeader} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'center', borderBottom: `1px solid ${c.border}`, paddingBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={csvHeader}>
                            {csvHeader}
                          </span>
                          <select
                            value={csvMappings[csvHeader] || ''}
                            onChange={(e) => setCsvMappings(prev => ({ ...prev, [csvHeader]: e.target.value }))}
                            style={{
                              padding: '6px 10px', borderRadius: 6, border: `1px solid ${c.border}`,
                              background: c.inputBg, color: c.text, fontSize: 12
                            }}
                          >
                            <option value="">-- Ignore Field --</option>
                            {(TABLE_COLUMNS[targetTable] || []).map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import actions / danger zone */}
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 15px 0', color: c.text }}>Import Configurations</h3>

                  {/* Clean Restore Toggle */}
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: 14, borderRadius: 8, border: `1px solid ${cleanRestore ? c.danger : c.border}`,
                    background: cleanRestore ? c.dangerBg : 'transparent',
                    marginBottom: 20, transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      id="cleanRestore"
                      checked={cleanRestore}
                      onChange={(e) => {
                        setCleanRestore(e.target.checked);
                        if (!e.target.checked) setConfirmClean(false);
                      }}
                      style={{ cursor: 'pointer', marginTop: 3, accentColor: c.danger }}
                    />
                    <label htmlFor="cleanRestore" style={{ cursor: 'pointer', flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: cleanRestore ? c.danger : c.text }}>Clean Restore (DANGER)</div>
                      <div style={{ fontSize: 11.5, color: cleanRestore ? c.danger : c.subText, marginTop: 4, lineHeight: 1.4 }}>
                        Wipe existing data from the database tables before importing the new records. Prevents duplicates but deletes data permanently.
                      </div>
                    </label>
                  </div>

                  {cleanRestore && (
                    <div style={{
                      display: 'flex', gap: 10, alignItems: 'center',
                      padding: 12, borderRadius: 6, background: '#ef444420',
                      border: '1px solid #ef444450', marginBottom: 20
                    }}>
                      <input
                        type="checkbox"
                        id="confirmClean"
                        checked={confirmClean}
                        onChange={(e) => setConfirmClean(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: '#ef4444' }}
                      />
                      <label htmlFor="confirmClean" style={{ fontSize: 12, color: c.text, cursor: 'pointer', fontWeight: 600 }}>
                        I confirm that this will permanently DELETE records from active portal tables.
                      </label>
                    </div>
                  )}

                  {/* Trigger Buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleResetImport}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: 'transparent', border: `1px solid ${c.border}`, color: c.text,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      Cancel / Reset
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={cleanRestore && !confirmClean}
                      style={{
                        flex: 1.5, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        background: cleanRestore ? c.danger : 'var(--brand-color)', border: 'none', color: '#fff',
                        cursor: (cleanRestore && !confirmClean) ? 'not-allowed' : 'pointer',
                        opacity: (cleanRestore && !confirmClean) ? 0.6 : 1, transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <PlayCircle size={15} />
                      Start Data Import
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* Wizard step 3: Execution Output logs */}
          {importStep === 3 && (
            <div style={{ ...cardStyle, background: '#0e1116', border: '1px solid #1f2937', padding: '30px 40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {importing ? (
                    <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand-color)' }} />
                  ) : (
                    <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                  )}
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                    {importing ? 'Importing Backup Database...' : 'Import Task Completed'}
                  </h3>
                </div>
                {!importing && (
                  <button
                    onClick={handleResetImport}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: '#1f2937', border: 'none', color: '#d1d5db', cursor: 'pointer'
                    }}
                  >
                    Finish & Exit
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: '100%', background: 'var(--brand-color)', width: `${importProgress}%`, transition: 'width 0.2s' }} />
              </div>

              {/* Logs terminal */}
              <div style={{
                height: 300, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12,
                lineHeight: 1.7, color: '#d1d5db', background: '#0a0c10', padding: 20,
                borderRadius: 8, border: '1px solid #111827', display: 'flex', flexDirection: 'column', gap: 4
              }}>
                {importLogs.map((log, index) => (
                  <div key={index} style={{ color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#10b981' : log.type === 'warning' ? '#f59e0b' : '#d1d5db' }}>
                    <span style={{ color: '#4b5563', marginRight: 10 }}>[{log.time}]</span>
                    {log.msg}
                  </div>
                ))}
                <div ref={logTerminalEndRef} />
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
