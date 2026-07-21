import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Save, Loader2, Calendar, FileText, ChevronDown, DollarSign, Trash2, Plus, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { createAgreement, openAgreementSecurely, updateAgreement } from '@/lib/agreements';
import { addNotification } from '@/lib/storage';
import { resolveLogoUrl } from '@/lib/invoices';
import { useToast } from '@/components/ui/use-toast';

// Format address lines helpers
function formatAddressLines(address) {
  if (!address) return ['NIWANDAMA', 'JA -ELA', 'SRI LANKA -11000'];
  const normalized = address.toLowerCase().replace(/\s+/g, ' ');
  if (normalized.includes('niwandama') && normalized.includes('ja ela')) {
    return ['NIWANDAMA', 'JA -ELA', 'SRI LANKA -11000'];
  }
  if (address.includes('\n')) {
    return address.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean);
  }
  return address.split(/[,–-]/).map(l => l.trim().toUpperCase()).filter(Boolean);
}

function getDisplayPhone(phone) {
  const displayPhone = phone ?? '+94 70 203 2323';
  if (displayPhone.trim() === '+94 70 203 2323') {
    return '+94 70 203 2323 / +94 11 224 5666';
  }
  return displayPhone;
}

function getDisplayEmail(website) {
  let displayEmail = 'info@nextiom.com';
  if (website) {
    try {
      const domain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      if (domain) {
        displayEmail = `info@${domain}`;
      }
    } catch {}
  }
  return displayEmail;
}

// Convert image url to base64 helper
const loadBase64Image = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    // Safety check: skip if the response is not a format supported by jsPDF
    // jsPDF natively supports JPEG, PNG, and WebP (in modern engines).
    // SVG logo formats will hang/crash standard image decoders in jsPDF.
    const contentType = res.headers.get('content-type') || '';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const isAllowed = allowedTypes.some(type => contentType.startsWith(type));
    if (!isAllowed) {
      console.warn(`[loadBase64Image] Skipping unsupported image resource from ${url}: Content-Type is ${contentType}`);
      return null;
    }

    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error loading image base64:', err);
    return null;
  }
};

// Detect image format from base64 string
const getImageFormat = (base64) => {
  if (!base64) return 'PNG';
  const match = base64.match(/^data:image\/([a-zA-Z+]+);base64,/);
  if (match && match[1]) {
    const ext = match[1].toLowerCase();
    if (ext === 'jpeg' || ext === 'jpg') return 'JPEG';
    if (ext === 'png') return 'PNG';
    if (ext === 'webp') return 'WEBP';
  }
  return 'PNG';
};

const getTemplates = (cust, fee, curr) => {
  const companyName = cust?.company || cust?.name || '[Client Company]';
  const feeVal = parseFloat(fee) || 55000;
  const feeText = curr === 'USD' 
    ? `Annual Hosting Package Fee: USD ${feeVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (United States Dollars)`
    : `Annual Hosting Package Fee: LKR ${feeVal.toLocaleString('en-LK', { minimumFractionDigits: 2 })} (Sri Lankan Rupees)`;

  return [
    {
      title: '1. Scope of Services',
      content: `NEXTIOM will provide the following hosting and value-added services to the ${companyName.toUpperCase()}:\n\n` +
               `Cloud Hosting Package\n` +
               `• Hosting Platform: Hostinger Cloud (via NEXTIOM’s reseller plan)\n` +
               `• Storage: 50 GB SSD\n` +
               `• Bandwidth: Unmetered\n` +
               `• SSL Certificate: Included\n` +
               `• Email Hosting: Titan Email integration, Office Mail Server compatibility, Mozilla Thunderbird access (via IMAP/POP3)\n` +
               `• Control Panel Access: FTP and File Manager, Domain and DNS Management, Email Account Setup and Configuration\n` +
               `• Advanced Security Features: Real-time firewall and brute-force protection, Daily malware scanning, AI-powered 24/7 monitoring\n` +
               `• Daily Backups (30-day retention)\n` +
               `• Uptime Guarantee: 99.9%\n` +
               `• Support via ticket, phone, and email`
    },
    {
      title: '2. Value-Added Services (VAS) via SLWordPress.com',
      content: `SLWordPress.com is a sub-company operated by NEXTIOM (PVT) LTD.\n` +
               `Through SL WordPress, the following services are offered:\n` +
               `• Access to regularly licensed WordPress themes and plugins\n` +
               `• Automatic and manual updates delivered via cloud\n` +
               `• Technical support for selected themes/plugins licensed under SLWordPress\n` +
               `• All VAS are compliant with the latest web security, privacy, and plugin development standards`
    },
    {
      title: '3. Technical Guidelines for the Client',
      content: `• Use only secure and licensed software, plugins, and scripts\n` +
               `• Keep all CMS, plugins, and themes updated (if website maintenance is not covered under NEXTIOM)\n` +
               `• Maintain secure passwords and avoid sharing admin credentials\n` +
               `• Monitor email usage and clean up regularly to avoid over-quota issues\n` +
               `• Avoid hosting or distributing copyrighted or malicious files\n` +
               `• Contact NEXTIOM before making advanced changes (e.g., core config, file permissions)\n\n` +
               `Important Note:\n` +
               `Hosting Only Plans: NEXTIOM monitors and maintains server-level services only. The Client assumes full responsibility for managing the website's content, updates, and security.\n\n` +
               `Full Website Maintenance Plans: NEXTIOM will manage plugin/theme updates, CMS health, backups, and restoration if needed. Any client-made changes without coordination may void support for those modifications.`
    },
    {
      title: '4. Term and Renewal',
      content: `• Duration: 1 year from activation\n` +
               `• Renewal: Annually, with advance payment\n` +
               `• Renewal notice sent 15 days prior to expiry`
    },
    {
      title: '5. Payment Terms',
      content: `• ${feeText}\n` +
               `• Full payment is required in advance to activate hosting and related services\n` +
               `• Clients may upgrade or downgrade their hosting package at any time during the agreement period. Pricing adjustments will be calculated based on the selected plan and prorated accordingly\n` +
               `• Dedicated email server pricing will be based on required storage capacity and usage. Separate quotations will be provided upon request\n` +
               `• Invoices for hosting, maintenance, and third-party services (including plugin/theme purchases or custom work) will be issued separately and subject to standard payment timelines\n` +
               `• All prices are exclusive of VAT. If applicable, VAT will be added to the invoice and must be paid by the Client in accordance with Sri Lankan tax regulations`
    },
    {
      title: '6. Support Hours & Service Scope',
      content: `NEXTIOM Support:\n` +
               `Available every day from 9:00 AM to 10:00 PM Sri Lanka Time, excluding government holidays and Poya days. You can reach us via phone, email, or support ticket during these hours.\n\n` +
               `Hostinger Hosting Support:\n` +
               `Hosting is provided via Hostinger’s cloud platform, which offers 24/7 global support for urgent server-level issues outside NEXTIOM’s working hours.\n\n` +
               `NEXTIOM Handles:\n` +
               `• Website and email setup\n` +
               `• WordPress plugins, themes, and core updates (if under maintenance plan)\n` +
               `• Advanced hosting configuration such as DNS adjustments, domain linking, daily backup setup, and technical optimizations (e.g., caching, security, performance)\n` +
               `• WordPress-specific tasks like troubleshooting plugin conflicts, fixing layout errors, and minor content updates\n` +
               `• Monitoring uptime and providing alerts for website issues\n` +
               `• General technical support related to our services\n\n` +
               `Hostinger Handles:\n` +
               `• Server status and performance\n` +
               `• Cloud hosting issues\n` +
               `• Control panel errors and backups\n\n` +
               `Note: If you’re unsure how to contact Hostinger, NEXTIOM can raise a support request on your behalf.`
    },
    {
      title: '7. Termination & Refund Policy',
      content: `• Either party may terminate this agreement with 30 days' written notice.\n` +
               `• We understand that things can change. That’s why we offer refunds based on our terms and refund policy,\n` +
               `• Clients may be eligible for a full, partial, or no refund depending on:\n` +
               `  – The services delivered and usage period\n` +
               `  – Time remaining in the agreement term\n` +
               `  – Any third-party costs already incurred\n` +
               `• No refunds will be issued for early termination by the Client unless explicitly allowed under our Refund Policy.\n` +
               `• Upon termination:\n` +
               `  – Hosting and email services will be deactivated\n` +
               `  – A backup of website data will be provided if requested within 15 days`
    },
    {
      title: '8. Entire Agreement',
      content: `• This document constitutes the entire agreement between the parties.\n` +
               `• Amendments are valid only if agreed in writing by both parties.`
    },
    {
      title: '9. Legal Terms',
      content: `9.1 Governing Law\n` +
               `This Agreement shall be governed by and construed in accordance with the laws of the Democratic Socialist Republic of Sri Lanka, without reference to its conflict of law rules. Any dispute arising out of or related to this Agreement shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.\n\n` +
               `9.2 Dispute Resolution\n` +
               `In the event of a dispute, controversy, or claim related to this Agreement, both parties agree to attempt to resolve the issue through good-faith negotiations. If the matter remains unresolved within thirty (30) days of written notice, either party may refer the matter to the relevant court in Sri Lanka.\n\n` +
               `9.3 Termination for Breach\n` +
               `Either party may terminate this Agreement with thirty (30) days’ written notice if the other party materially breaches any term and fails to fix the issue within the notice period. Upon termination, all rights and obligations shall cease, except those explicitly stated to survive termination.`
    }
  ];
};

function AdminAgreementCreator({ isDark = true, customers = [], onBack, agreement }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [agreementName, setAgreementName] = useState('Service Agreement');
  
  // Auto-generate a unique ID
  const [agreementId, setAgreementId] = useState(() => `#H${Math.floor(1000 + Math.random() * 9000)}`);
  const [agreementDate, setAgreementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [durationLabel, setDurationLabel] = useState('1 Year');
  const [packageFee, setPackageFee] = useState('55000');
  const [currency, setCurrency] = useState('LKR');
  
  // Client details
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  

  
  // Sections data
  const [sections, setSections] = useState([]);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState(0);
  
  // Settings & images bases
  const [settings, setSettings] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [sigBase64, setSigBase64] = useState(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', input: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', input: '#f5f5f5' };

  // Fetch settings & base64 resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const { data } = await supabase.from('invoice_settings').select('*').maybeSingle();
        if (data) {
          setSettings(data);
          if (data.logo_url) {
            const url = await resolveLogoUrl(data.logo_url);
            if (url) {
              const base = await loadBase64Image(url);
              setLogoBase64(base);
            }
          }
        }
        
        // Fetch signature
        const sig = await loadBase64Image('/signature.png');
        if (sig) {
          setSigBase64(sig);
        }
      } catch (err) {
        console.error('Failed to pre-load settings resources:', err);
      }
    };
    fetchResources();
  }, []);

  // Initialize from existing agreement (Edit Mode)
  useEffect(() => {
    if (agreement) {
      const state = agreement.editor_state || {};
      
      const matchName = (agreement.name || '').match(/^(.*?)\s*\(#H\d+\)$/);
      const nameVal = matchName ? matchName[1] : (agreement.name || 'Service Agreement');
      
      const matchId = (agreement.name || '').match(/\((#H\d+)\)$/);
      const idVal = matchId ? matchId[1] : `#H${Math.floor(1000 + Math.random() * 9000)}`;

      setSelectedCustomerId(agreement.customer_id || '');
      setAgreementName(state.agreementName || nameVal);
      setAgreementId(state.agreementId || idVal);
      setAgreementDate(state.agreementDate || (agreement.created_at ? agreement.created_at.split('T')[0] : new Date().toISOString().split('T')[0]));
      setDurationLabel(state.durationLabel || '1 Year');
      setPackageFee(state.packageFee || '55000');
      setCurrency(state.currency || 'LKR');
      
      setClientName(state.clientName || agreement.customers?.name || '');
      setClientCompany(state.clientCompany || agreement.customers?.company || '');
      setClientPhone(state.clientPhone || agreement.customers?.phone || '');
      setClientEmail(state.clientEmail || agreement.customers?.email || '');
      setClientAddress(state.clientAddress || agreement.customers?.address || '');
      
      if (state.sections) {
        setSections(state.sections);
      } else {
        const cust = customers.find(cu => cu.id === agreement.customer_id);
        if (cust) {
          const freshTemplates = getTemplates(cust, state.packageFee || '55000', state.currency || 'LKR');
          setSections(freshTemplates);
        }
      }
    }
  }, [agreement, customers]);

  // Initialize/Update templates when customer changes
  const handleCustomerChange = async (customerId) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(cu => cu.id === customerId);
    if (!cust) return;

    let address = cust.address || '';
    let company = cust.company || '';
    let phone = cust.phone || '';

    // If address is missing on local object, fetch full customer record directly from DB
    if (!address) {
      try {
        const { data: fullCust } = await supabase
          .from('customers')
          .select('address, company, phone')
          .eq('id', customerId)
          .maybeSingle();
        if (fullCust) {
          if (fullCust.address) address = fullCust.address;
          if (fullCust.company) company = fullCust.company;
          if (fullCust.phone) phone = fullCust.phone;
        }
      } catch (err) {
        console.error('[AdminAgreementCreator] Error fetching customer address:', err);
      }
    }

    setClientName(cust.name || '');
    setClientCompany(company);
    setClientPhone(phone);
    setClientEmail(cust.email || '');
    setClientAddress(address);

    // Reset templates to selected customer
    const freshTemplates = getTemplates({ ...cust, address, company, phone }, packageFee, currency);
    setSections(freshTemplates);
  };

  // Sync payment terms automatically when pricing changes, if user hasn't edited it manually
  useEffect(() => {
    if (!selectedCustomerId) return;
    
    setSections(prev => {
      return prev.map(sec => {
        if (sec.title && sec.title.includes('5. Payment Terms')) {
          const feeVal = parseFloat(packageFee) || 0;
          const feeText = currency === 'USD' 
            ? `Annual Hosting Package Fee: USD ${feeVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (United States Dollars)`
            : `Annual Hosting Package Fee: LKR ${feeVal.toLocaleString('en-LK', { minimumFractionDigits: 2 })} (Sri Lankan Rupees)`;
          
          let content = sec.content || '';
          const lines = content.split('\n');
          const updatedLines = lines.map(line => {
            if (line.includes('Hosting Package Fee:')) {
              return `• ${feeText}`;
            }
            return line;
          });
          return { ...sec, content: updatedLines.join('\n') };
        }
        return sec;
      });
    });
  }, [packageFee, currency, selectedCustomerId]);

  // Add Custom Section
  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      {
        title: `${prev.length + 1}. Custom Term`,
        content: ''
      }
    ]);
    setExpandedSectionIndex(sections.length);
  };

  // Delete Section
  const handleDeleteSection = (index, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete section "${sections[index]?.title}"?`)) {
      setSections(prev => prev.filter((_, idx) => idx !== index));
      if (expandedSectionIndex === index) {
        setExpandedSectionIndex(-1);
      } else if (expandedSectionIndex > index) {
        setExpandedSectionIndex(prev => prev - 1);
      }
    }
  };

  // Update Section Title
  const handleSectionTitleChange = (index, newTitle) => {
    setSections(prev => prev.map((sec, idx) => idx === index ? { ...sec, title: newTitle } : sec));
  };

  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setSections(prev => {
      const list = [...prev];
      const draggedItem = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, draggedItem);
      return list;
    });
    setDraggedIndex(index);

    if (expandedSectionIndex === draggedIndex) {
      setExpandedSectionIndex(index);
    } else if (expandedSectionIndex > draggedIndex && expandedSectionIndex <= index) {
      setExpandedSectionIndex(prev => prev - 1);
    } else if (expandedSectionIndex < draggedIndex && expandedSectionIndex >= index) {
      setExpandedSectionIndex(prev => prev + 1);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveAgreement = async () => {
    if (!selectedCustomerId) {
      toast({ title: 'Validation Error', description: 'Please select a customer first.', variant: 'destructive' });
      return;
    }
    if (!agreementName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter agreement name.', variant: 'destructive' });
      return;
    }

    try {
      setIsSaving(true);

      // 1. Generate jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const margin = 15;
      const printableWidth = 180;
      let y = 15;
      let pageCount = 1;

      // Header company variables
      const companyName = settings?.company_name || 'NEXTIOM (PVT) LTD';
      const addressLines = formatAddressLines(settings?.address);
      const phone = getDisplayPhone(settings?.phone);
      const email = getDisplayEmail(settings?.website);
      const website = settings?.website || 'https://nextiom.com/';

      // Pre-formatting date
      let formattedDate = agreementDate;
      try {
        const dateObj = new Date(agreementDate);
        if (!isNaN(dateObj.getTime())) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          formattedDate = `${dateObj.getDate()}-${monthNames[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
        }
      } catch {}

      // Draw header and footer helper
      const drawHeaderAndFooter = (pageNum) => {
        // Draw top line & logo / details
        if (pageNum === 1) {
          // Left side company details
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(17, 17, 17);
          doc.text(companyName.toUpperCase(), margin, 15);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 51, 51);
          let addrY = 20;
          for (const line of addressLines) {
            doc.text(line, margin, addrY);
            addrY += 4;
          }
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`PHONE: ${phone}`, margin, addrY);
          doc.text(`E-MAIL: ${email}`, margin, addrY + 3.5);
          doc.text(`WEB: ${website}`, margin, addrY + 7);

          // Top orange bar
          doc.setFillColor(232, 123, 53);
          doc.rect(0, 0, 8, 297, 'F');
          doc.rect(8, 0, 202, 3, 'F');

          // Logo on top right (scaled preserving aspect ratio)
          if (logoBase64) {
            try {
              const imgProps = doc.getImageProperties(logoBase64);
              const aspectRatio = imgProps.width / imgProps.height;
              const maxWidth = 42;
              const maxHeight = 14;
              let logoWidth = maxWidth;
              let logoHeight = maxHeight;
              if (aspectRatio > maxWidth / maxHeight) {
                logoWidth = maxWidth;
                logoHeight = maxWidth / aspectRatio;
              } else {
                logoHeight = maxHeight;
                logoWidth = maxHeight * aspectRatio;
              }
              const logoX = 195 - logoWidth;
              const logoY = 10 + (maxHeight - logoHeight) / 2;
              const format = getImageFormat(logoBase64);
              doc.addImage(logoBase64, format, logoX, logoY, logoWidth, logoHeight);
            } catch (err) {
              console.error('[PDF Gen] Logo embed failed:', err);
            }
          }

          // Divider Line
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.4);
          doc.line(margin, 46, 195, 46);
        } else {
          // Standard header for later pages
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(17, 17, 17);
          doc.text('SERVICE AGREEMENT', margin, 14);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`Agreement ID: ${agreementId} – (${durationLabel})`, margin, 19);

          if (logoBase64) {
            try {
              const imgProps = doc.getImageProperties(logoBase64);
              const aspectRatio = imgProps.width / imgProps.height;
              const maxWidth2 = 30;
              const maxHeight2 = 9;
              let logoWidth2 = maxWidth2;
              let logoHeight2 = maxHeight2;
              if (aspectRatio > maxWidth2 / maxHeight2) {
                logoWidth2 = maxWidth2;
                logoHeight2 = maxWidth2 / aspectRatio;
              } else {
                logoHeight2 = maxHeight2;
                logoWidth2 = maxHeight2 * aspectRatio;
              }
              const logoX2 = 195 - logoWidth2;
              const logoY2 = 8 + (maxHeight2 - logoHeight2) / 2;
              const format = getImageFormat(logoBase64);
              doc.addImage(logoBase64, format, logoX2, logoY2, logoWidth2, logoHeight2);
            } catch (err) {
              console.error('[PDF Gen] Logo page-2 embed failed:', err);
            }
          }

          // Left orange bar
          doc.setFillColor(232, 123, 53);
          doc.rect(0, 0, 8, 297, 'F');

          // Divider Line
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.4);
          doc.line(margin, 23, 195, 23);
        }

        // Draw footer
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.4);
        doc.line(margin, 280, 195, 280);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(156, 163, 175);
        doc.text(`${companyName} - Niwandama, Ja Ela - 11350   +94 70 203 2323   ${website}`, margin, 285);
        doc.text(`Page: ${pageNum}`, 182, 285);

        // Center aligned business thank you note
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(232, 123, 53);
        doc.text('Thank You For Your Business With Us!', 80, 291);
      };

      const addNewPage = () => {
        doc.addPage();
        pageCount++;
        drawHeaderAndFooter(pageCount);
        y = 30; // resets coordinate starting position on page 2+
      };

      // Set up page 1
      drawHeaderAndFooter(pageCount);
      
      // Print Agreement ID info
      y = 52;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 51, 51);
      doc.text(`Agreement ID: ${agreementId} – (${durationLabel})`, margin, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 17, 17);
      doc.text(agreementName.toUpperCase(), 195 - doc.getTextWidth(agreementName), y + 1);
      
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(formattedDate, margin, y);
      
      // Client information box (TO)
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 17, 17);
      doc.text('TO', margin, y);
      y += 4;
      
      const clientFields = [
        { label: 'Name', value: clientName },
        { label: 'Company', value: clientCompany },
        { label: 'Phone', value: clientPhone },
        { label: 'E-mail', value: clientEmail },
        { label: 'Address', value: clientAddress }
      ];
      
      doc.setFontSize(9.5);
      for (const field of clientFields) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(field.label, margin + 4, y);
        
        doc.text('#', margin + 28, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        
        const valText = field.value || '';
        const lines = doc.splitTextToSize(valText, 74);
        let valY = y;
        for (let i = 0; i < lines.length; i++) {
          doc.text(lines[i], margin + 36, valY);
          if (i < lines.length - 1) valY += 4.2;
        }
        
        y = Math.max(y, valY) + 2;
        doc.setDrawColor(243, 244, 246);
        doc.line(margin + 4, y, margin + 110, y);
        y += 5.5;
      }

      // Print helpers
      const printParagraph = (text, fontSize = 9.5, isBold = false, color = { r: 51, g: 51, b: 51 }) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(color.r, color.g, color.b);
        
        const lines = doc.splitTextToSize(text, printableWidth);
        for (const line of lines) {
          if (y > 270) {
            addNewPage();
          }
          doc.text(line, margin, y);
          y += fontSize * 0.45 + 1.2;
        }
        y += 1.5;
      };

      const printListItem = (bullet, text, fontSize = 9.5, isBold = false, color = { r: 51, g: 51, b: 51 }) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(color.r, color.g, color.b);
        
        const indent = 6;
        const itemWidth = printableWidth - indent;
        const lines = doc.splitTextToSize(text, itemWidth);
        
        if (y > 268) {
          addNewPage();
        }
        
        doc.text(bullet, margin, y);
        
        for (let i = 0; i < lines.length; i++) {
          if (y > 270) {
            addNewPage();
          }
          doc.text(lines[i], margin + indent, y);
          y += fontSize * 0.45 + 1.2;
        }
        y += 1.5;
      };

      const printSectionContent = (content) => {
        const paragraphs = content.split('\n');
        for (const para of paragraphs) {
          const trimmed = para.trim();
          if (!trimmed) {
            y += 2.5;
            continue;
          }
          
          if (trimmed.startsWith('•')) {
            printListItem('•', trimmed.substring(1).trim(), 9.5, false, { r: 51, g: 51, b: 51 });
          } else if (trimmed.startsWith('-')) {
            printListItem('•', trimmed.substring(1).trim(), 9.5, false, { r: 51, g: 51, b: 51 });
          } else if (trimmed.startsWith('–')) {
            printListItem('•', trimmed.substring(1).trim(), 9.5, false, { r: 51, g: 51, b: 51 });
          } else {
            printParagraph(para, 9.5, false, { r: 51, g: 51, b: 51 });
          }
        }
      };

      // Loop sections
      y += 4;
      for (const sec of sections) {
        if (y > 255) {
          addNewPage();
        }
        
        // Print Section Title
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(232, 123, 53); // orange brand
        doc.text(sec.title || '', margin, y);
        y += 5.5;

        // Print Section content
        if (sec.content) {
          printSectionContent(sec.content);
        }
      }

      // Print Signature Section
      if (y > 200) {
        addNewPage();
      }
      
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(17, 17, 17);
      doc.text('10. Authorized Signatures', margin, y);
      y += 8;
      
      const col1X = margin;
      const col2X = 110;
      
      // For Nextiom
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      doc.text('For NEXTIOM (PVT) LTD', col1X, y);
      
      // For Client
      doc.text(`For ${clientCompany || clientName || 'Client'}`, col2X, y);
      
      // Draw Nextiom Seal/Signature
      if (sigBase64) {
        try {
          const format = getImageFormat(sigBase64);
          doc.addImage(sigBase64, format, col1X, y + 2, 45, 14);
        } catch (err) {
          console.error('[PDF Gen] Seal image embed failed:', err);
        }
      }

      // Draw Client details & signature lines
      let clientY = y + 6.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text('Name: ...........................................', col2X, clientY);
      
      clientY += 6.5;
      doc.text('Title: ...........................................', col2X, clientY);
      
      clientY += 7.5;
      doc.text('Signature: ...................................', col2X, clientY);
      
      clientY += 8.5;
      doc.text('Date: ...........................................', col2X, clientY);

      // Print Nextiom Date aligned with Client Date
      doc.text(`Date: ${formattedDate}`, col1X, clientY);

      // Update vertical cursor position
      y = clientY;

      // Save PDF Blob
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `${agreementName.replace(/[^a-zA-Z0-9]/g, '_')}_${agreementId}.pdf`, { type: 'application/pdf' });

      const editorState = {
        agreementName,
        agreementId,
        agreementDate,
        durationLabel,
        packageFee,
        currency,
        clientName,
        clientCompany,
        clientPhone,
        clientEmail,
        clientAddress,
        sections
      };

      if (agreement) {
        // Edit Mode: update existing agreement and replace template PDF
        await updateAgreement(agreement.id, {
          name: `${agreementName} (${agreementId})`,
          customerId: selectedCustomerId,
          status: agreement.status,
          newTemplateFile: pdfFile,
          editorState
        });

        toast({ title: 'Success', description: 'Agreement updated successfully.' });
      } else {
        // Create Mode: save new agreement template
        await createAgreement(selectedCustomerId, `${agreementName} (${agreementId})`, pdfFile, editorState);

        // Add notification to client
        await addNotification({
          customer_id: selectedCustomerId,
          type: 'agreement',
          title: `New Service Agreement ${agreementId}`,
          message: `A new service agreement template "${agreementName} (${agreementId})" is ready. Please download and upload the signed copy.`,
        });

        toast({ title: 'Success', description: 'Agreement generated and assigned successfully.' });
      }

      onBack();
    } catch (err) {
      console.error(err);
      toast({ title: 'Generation Failed', description: err.message || 'Could not generate agreement PDF.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: `1.5px solid ${c.border}`,
            color: c.text,
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: c.text }}>
          {agreement ? 'Edit Agreement Builder' : 'Create Agreement Builder'}
        </h1>

        <button
          onClick={handleSaveAgreement}
          disabled={isSaving}
          style={{
            background: c.brand,
            color: '#fff',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.75 : 1
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={15} />
              {agreement ? 'Save Changes' : 'Generate & Assign'}
            </>
          )}
        </button>
      </div>

      {/* Editor Body */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Left Side: General Info & Metadata */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, alignSelf: 'start' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: c.text, borderBottom: `1px solid ${c.border}`, paddingBottom: 10, marginBottom: 16 }}>General Details</h2>
          
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Customer *</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.input,
                  color: c.text,
                  fontSize: 13,
                  outline: 'none',
                  appearance: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Select Customer --</option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>{cust.name} ({cust.email})</option>
                ))}
              </select>
              <ChevronDown size={14} color={c.subText} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Agreement ID</label>
              <input
                type="text"
                value={agreementId}
                onChange={(e) => setAgreementId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.input,
                  color: c.text,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Agreement Title</label>
              <input
                type="text"
                value={agreementName}
                onChange={(e) => setAgreementName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.input,
                  color: c.text,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Date</label>
              <input
                type="date"
                value={agreementDate}
                onChange={(e) => setAgreementDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.input,
                  color: c.text,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Period / Duration</label>
              <input
                type="text"
                value={durationLabel}
                onChange={(e) => setDurationLabel(e.target.value)}
                placeholder="e.g. 1 Year"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.input,
                  color: c.text,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Pricing Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Currency</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: `1.5px solid ${c.border}`,
                    borderRadius: 8,
                    background: c.input,
                    color: c.text,
                    fontSize: 13,
                    outline: 'none',
                    appearance: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="LKR">LKR (Rs)</option>
                  <option value="USD">USD ($)</option>
                </select>
                <ChevronDown size={14} color={c.subText} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Annual Package Fee</label>
              <input
                type="number"
                value={packageFee}
                onChange={(e) => setPackageFee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.input,
                  color: c.text,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Client Details Card (Pre-populated with editable details) */}
          <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 8, padding: 12, background: isDark ? 'rgba(255,255,255,0.01)' : '#fdfdfd', marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: c.subText, letterSpacing: 0.5, margin: '0 0 10px' }}>Assigned Customer Info</h3>
            {selectedCustomerId ? (
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 10, color: c.text }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: c.subText, marginBottom: 4 }}>Name:</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter customer name..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 6,
                      background: c.input,
                      color: c.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: c.subText, marginBottom: 4 }}>Company:</label>
                  <input
                    type="text"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    placeholder="Enter company name..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 6,
                      background: c.input,
                      color: c.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: c.subText, marginBottom: 4 }}>Phone:</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Enter phone number..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 6,
                      background: c.input,
                      color: c.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: c.subText, marginBottom: 4 }}>E-mail:</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Enter email address..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 6,
                      background: c.input,
                      color: c.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: c.subText, marginBottom: 4 }}>Address (Included in PDF):</label>
                  <textarea
                    rows={2}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Enter customer address..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 6,
                      background: c.input,
                      color: c.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: c.subText, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Select customer to populate details</div>
            )}
          </div>


        </div>

        {/* Right Side: Section Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${c.border}`, paddingBottom: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>Agreement Sections Content</h2>
              
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={handleAddSection}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                    border: `1px solid ${c.border}`,
                    color: c.brand,
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Plus size={13} />
                  Add Section
                </button>
              )}
            </div>
            
            {!selectedCustomerId ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: c.subText }}>
                <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3, color: c.brand }} />
                <p style={{ fontSize: 13, fontStyle: 'italic' }}>Please select a customer first to view and edit agreement terms.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sections.map((sec, idx) => {
                  const isExpanded = expandedSectionIndex === idx;
                  return (
                    <div
                      key={idx}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        border: `1px solid ${isExpanded ? c.brand : c.border}`,
                        borderRadius: 8,
                        overflow: 'hidden',
                        opacity: draggedIndex === idx ? 0.4 : 1,
                        background: draggedIndex === idx ? (isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb') : c.card,
                        transition: 'opacity 0.15s, background-color 0.15s'
                      }}
                    >
                      <div
                        onClick={() => setExpandedSectionIndex(isExpanded ? -1 : idx)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isExpanded ? (isDark ? 'rgba(232,123,53,0.06)' : '#fff7ed') : 'transparent',
                          color: isExpanded ? c.brand : c.text,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '80%' }}>
                          <div 
                            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: c.subText }}
                            title="Drag to reorder"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical size={14} />
                          </div>
                          
                          {/* Editable Section Title Input */}
                          <input
                            type="text"
                            value={sec.title || ''}
                            onClick={(e) => e.stopPropagation()} // prevent toggle collapse
                            onChange={(e) => handleSectionTitleChange(idx, e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isExpanded ? c.brand : c.text,
                              fontWeight: 600,
                              fontSize: 13.5,
                              outline: 'none',
                              width: '100%',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Delete Section Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSection(idx, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.8
                            }}
                            title="Delete this section"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <ChevronDown
                            size={16}
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                              color: c.subText
                            }}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '12px 16px', borderTop: `1px solid ${c.border}` }}>
                          <textarea
                            value={sec.content}
                            onChange={(e) => {
                              const newText = e.target.value;
                              setSections(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], content: newText };
                                return copy;
                              });
                            }}
                            rows={12}
                            style={{
                              width: '100%',
                              padding: 10,
                              background: c.input,
                              border: `1px solid ${c.border}`,
                              borderRadius: 6,
                              color: c.text,
                              fontSize: 13,
                              lineHeight: 1.6,
                              fontFamily: 'monospace',
                              resize: 'vertical',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAgreementCreator;
