import React, { useState } from 'react';
import { 
  Search, BookOpen, HelpCircle, Server, CreditCard, 
  MessageSquare, Globe, Mail, FileText, ChevronRight,
  ChevronDown, ExternalLink, ArrowRight, ShieldCheck,
  Cpu, Zap, Sparkles, User, Sun, Moon, Bell, Megaphone, 
  ShoppingCart, FolderGit, CheckSquare, Key
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SECTIONS = [
  {
    id: 'dashboard-controls',
    title: 'Dashboard & Interface',
    description: 'Learn how to customize your portal view, search, and toggle theme settings.',
    icon: Sparkles,
    color: '#eab308',
    subcategories: [
      {
        id: 'theme-settings',
        title: 'Dark / Light Mode & Theme Toggle',
        articles: [
          {
            title: 'How to switch between Dark and Light mode',
            content: `
To toggle between Dark and Light color themes:
1. Locate the **Sun icon** (if in Dark mode) or **Moon icon** (if in Light mode) in the top-right header section of your dashboard.
2. Click the icon to instantly switch themes.
3. Your selection will be saved in your browser storage so that it remains persistent every time you log back in.
            `
          },
          {
            title: 'How to collapse or expand the Sidebar',
            content: `
For more screen space:
1. In the sidebar header (next to the NEXTIOM brand logo), click the **Left/Right Chevron Arrow** button.
2. The sidebar will collapse into a compact icon-only view.
3. Hovering over icons will show their labels. Click the arrow button again to expand the sidebar back to full width.
            `
          }
        ]
      },
      {
        id: 'search-shortcut',
        title: 'Global Dashboard Search',
        articles: [
          {
            title: 'How to search across the entire dashboard',
            content: `
To quickly locate your hosting, domains, tickets, or invoices:
1. Press the shortcut keys **⌘K** (Mac) or **Ctrl + K** (Windows/Linux), or click the search box at the top header that says "Search products, domains, hosting...".
2. Type your search query (e.g., domain extension, invoice number, or package status).
3. Select any item from the popup search results to navigate straight to it.
            `
          },
          {
            title: 'How to check System Status',
            content: `
In the top-right header, click the **Status** button with the pulsing green indicator. This opens the Nextiom network and server status page in a new window, displaying real-time uptime status.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'profile-security',
    title: 'Profile & Security',
    description: 'Manage personal profile details, change passwords, and view system alerts.',
    icon: User,
    color: '#ec4899',
    subcategories: [
      {
        id: 'account-mgmt',
        title: 'Account Settings',
        articles: [
          {
            title: 'How to update profile details',
            content: `
To view or update your contact information:
1. Click **Account Details** in the left sidebar, or click your profile avatar letter in the top-right corner.
2. Review your personal profile information (e.g., Name, Phone, Address, Corporate Email).
3. If updates are needed, modify the fields and click the **Save Changes** button.
            `
          },
          {
            title: 'How to change or reset your password',
            content: `
To update your password from within the dashboard:
1. Go to **Account Details** in the left sidebar.
2. Scroll to the **Change Password** section.
3. Enter your current password.
4. Input your new password, then confirm it in the field below. Ensure it is strong (e.g., numbers, symbols, uppercase letters).
5. Click **Update Password**.

*If you forgot your password and cannot log in:*
1. Visit the portal login page and click **Forgot Password?**.
2. Enter your email address and request a reset.
3. Follow the instructions sent to your inbox to reset it.
            `
          }
        ]
      },
      {
        id: 'notifications-announcements',
        title: 'Notifications & Announcements',
        articles: [
          {
            title: 'How to view notifications and mark them as read',
            content: `
To view system alerts and notices:
1. Click the **Notification Bell** in the top-right corner.
2. A dropdown will show your latest notifications.
3. Click **Mark all as read** to clear all alert dots, or click **View All Notifications** to open the dedicated alerts list.
            `
          },
          {
            title: 'How to read Nextiom announcements',
            content: `
We post news and updates under the announcements section:
1. Navigate to **Announcements** in the left sidebar.
2. Browse the posted titles, dates, and contents.
3. Unread notices will show a colored counter badge next to the Announcements menu icon.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'hosting',
    title: 'Hosting & cPanel',
    description: 'Learn how to order, manage, and configure your website hosting.',
    icon: Server,
    color: '#e87b35',
    subcategories: [
      {
        id: 'hosting-order',
        title: 'Ordering Hosting',
        articles: [
          {
            title: 'How to order a new hosting plan',
            content: `
To order a new hosting plan:
1. Navigate to **Hosting** in the left sidebar menu.
2. Select **Order Hosting** from the sub-menu.
3. Browse the available hosting packages (e.g., Shared, Cloud, Dedicated).
4. Enter your preferred Domain name for this package (you can use an existing domain or request a new one).
5. Add any custom notes/requirements for your hosting setup in the description box.
6. Click the **Submit Request** or **Request Hosting** button.
7. Once submitted, our admins will review your request and generate an invoice. You will receive a notification when the invoice is ready.
            `
          },
          {
            title: 'Understanding active hosting packages',
            content: `
Once your hosting request is approved and paid:
- You will find your active packages under **Hosting** -> **My Hosting**.
- Click on any hosting card to open the **Hosting Package Details** modal.
- Here you can view your server details, status, billing cycle, IP address, and nameservers.
            `
          }
        ]
      },
      {
        id: 'hosting-mgmt',
        title: 'Managing cPanel & FTP',
        articles: [
          {
            title: 'How to access your cPanel details',
            content: `
To view cPanel details:
1. Go to **Hosting** -> **My Hosting**.
2. Click on the package you want details for.
3. If cPanel has been provisioned, your username, temporary password, and hosting server IP will be displayed securely in the details modal.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'domains',
    title: 'Domain Management',
    description: 'Registering, renewing, and updating nameservers for your domains.',
    icon: Globe,
    color: '#3b82f6',
    subcategories: [
      {
        id: 'domain-reg',
        title: 'Registration & Transfers',
        articles: [
          {
            title: 'How to register a new domain name',
            content: `
To request domain registration:
1. Click on **Domains** in the left sidebar.
2. Choose **Register Domain** from the options.
3. Fill in the requested domain name (e.g., \`mybusiness.com\`) and select your desired extension.
4. Select the registration period (e.g., 1 Year, 2 Years, 5 Years).
5. Specify if you require WHOIS Privacy Protection.
6. Add nameserver notes if you want custom DNS records pre-configured.
7. Submit the request. An invoice will be generated upon admin review.
            `
          },
          {
            title: 'How to transfer a domain to Nextiom',
            content: `
To transfer an existing domain to Nextiom:
1. Open a support ticket under **Ticket** -> **Create Ticket**.
2. Set the category to **Domain Services**.
3. Provide the domain name and your EPP/Auth authorization code obtained from your current registrar.
4. Ensure the domain is unlocked and the administrative contact email is accessible.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'emails',
    title: 'Business Emails',
    description: 'Setting up and configuring custom business mailboxes.',
    icon: Mail,
    color: '#10b981',
    subcategories: [
      {
        id: 'email-setup',
        title: 'Email Configuration',
        articles: [
          {
            title: 'How to request custom email addresses',
            content: `
To request corporate emails (e.g., \`info@yourcompany.com\`):
1. Navigate to **Emails** -> **Email Registration** in the sidebar.
2. Select your active domain from the dropdown.
3. Enter the prefix of your desired mailbox (e.g., \`contact\` or \`sales\`).
4. Set a strong password or let the system generate one.
5. Set the storage quota limit (if applicable).
6. Submit the request. You can check the creation status in **Emails** -> **My Emails**.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'billing',
    title: 'Billing Center',
    description: 'Managing invoices, payments, quotes, and service agreements.',
    icon: CreditCard,
    color: '#8b5cf6',
    subcategories: [
      {
        id: 'invoices',
        title: 'Paying Invoices',
        articles: [
          {
            title: 'How to submit a bank receipt / payment slip',
            content: `
To pay an invoice and submit proof:
1. Go to **Billing Center** -> **Invoices**.
2. Locate the invoice marked as **Unpaid** and click **View/Pay**.
3. Review the bank account details shown under Nextiom Bank Info.
4. Make the bank transfer, and screenshot or download the receipt.
5. In the invoice details, click **Submit Bank Receipt**.
6. Upload the slip image/PDF and click submit.
7. The status will immediately flip to **Payment Submitted**. Admins will verify it shortly and mark it as **Paid**.
            `
          },
          {
            title: 'How to pay using Online Payment / Card / LankaQR (LKR Invoices)',
            content: `
For instant payment and automatic invoice clearance on LKR invoices:
1. Navigate to **Billing Center** -> **Invoices**.
2. Select the invoice and click **View/Pay**.
3. In the payment dialog, choose **Online payment** from the dropdown menu (if enabled by system administrators).
4. Enter the amount you wish to pay (usually pre-filled with the remaining balance).
5. Click the pay button to be redirected to our secure payment gateway (iPay).
6. Enter your credit/debit card details (Visa, Mastercard, or LANKAPAY) or scan the LankaQR code to complete the transaction.
7. Once successfully authorized, you will be redirected back, and the invoice will immediately change to **Paid**.
            `
          },
          {
            title: 'How to pay using PayPal (USD Invoices)',
            content: `
For invoices billed in USD, you can pay instantly via PayPal:
1. Navigate to **Billing Center** -> **Invoices**.
2. Select your unpaid USD invoice and click **View/Pay**.
3. The payment method will default to **PayPal** for USD transactions.
4. Verify the payment amount and click the PayPal button.
5. You will be redirected to the secure PayPal checkout page.
6. Log in to your PayPal account or select **Pay with Debit or Credit Card** to pay as a guest.
7. After the transaction is completed, you will be redirected back, and the payment status will update. Our administrative team will verify and activate your service shortly.
            `
          },
          {
            title: 'How to pay by Cheque (LKR & USD Invoices)',
            content: `
To pay an invoice using a bank cheque:
1. Issue the cheque in favor of **Nextiom (Pvt) Ltd**.
2. Go to **Billing Center** -> **Invoices** and click **View/Pay** on the invoice.
3. Select **Cheque** from the payment method dropdown.
4. Enter the **Cheque Number**, **Cheque Date**, and the **Paid Amount**.
5. Optionally, upload a clear photo or scanned PDF of the cheque for verification.
6. Click submit to record your payment details in the portal.
7. Hand over or mail the physical cheque to the Nextiom office. The invoice will be marked as **Paid** once the cheque clears.
            `
          },
          {
            title: 'How to pay by Cash (LKR & USD Invoices)',
            content: `
To pay your invoice in cash:
1. Go to **Billing Center** -> **Invoices** and click **View/Pay** on your invoice.
2. Select **Cash** as the payment method.
3. Enter the **Payment Date** and the **Paid Amount**.
4. Click submit to register your cash payment intent.
5. Visit the Nextiom office to pay the cash directly to our billing department. We will issue an official printed receipt and mark your invoice as **Paid** immediately.
            `
          }
        ]
      },
      {
        id: 'quotations',
        title: 'Quotations & Agreements',
        articles: [
          {
            title: 'How to accept or decline a quotation',
            content: `
For custom development projects, we send quotations:
1. Go to **Billing Center** -> **Quotations**.
2. Click on a quotation.
3. Review the line items, terms, and cost breakdown.
4. Click **Accept Quotation** (which automatically converts it to a payable invoice) or click **Decline Quotation**.
            `
          },
          {
            title: 'How to sign and review Service Agreements',
            content: `
Legal terms or project contracts can be viewed under:
1. Go to **Billing Center** -> **Agreements**.
2. Select the contract you wish to review.
3. Read the conditions, check dates, and sign the document digitally if pending signature.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'orders-licenses',
    title: 'Orders & Licenses',
    description: 'Track digital product downloads, licenses, and sub subscriptions.',
    icon: ShoppingCart,
    color: '#f97316',
    subcategories: [
      {
        id: 'orders-mgmt',
        title: 'Purchases & Subscriptions',
        articles: [
          {
            title: 'How to view your order history',
            content: `
To review past transactions:
1. Go to **Orders** -> **Order History**.
2. View dates, total pricing, and items.
3. Click on any past order to download the PDF invoice or inspect active items.
            `
          },
          {
            title: 'How to view my software licenses and activation keys',
            content: `
For downloadable digital software or products:
1. Navigate to **My Products** in the left sidebar.
2. Here, you will see a list of products you own.
3. Click on the product card to view the **Activation Key** and license status (Active, Lifetime, Expired).
4. If a download file is attached, click the **Download** button to retrieve the product installer directly.
            `
          }
        ]
      }
    ]
  },
  {
    id: 'job-center',
    title: 'Job Center',
    description: 'Track development progress, timelines, and checklists.',
    icon: FolderGit,
    color: '#06b6d4',
    subcategories: [
      {
        id: 'jobs-mgmt',
        title: 'Project Tracking & Checklists',
        articles: [
          {
            title: 'How to track ongoing work progress',
            content: `
To see what tasks developers are working on for your project:
1. Click on **Jobs** in the left sidebar.
2. You will see a list of projects or milestones with status indicators (**Active** or **Waiting**).
3. Open a job to view its detailed project log, step-by-step progress, timeline milestones, and task checklists.
            `
          },
          {
            title: 'Understanding the Jobs view layout and metrics',
            content: `
When you click on an active or waiting job, you will see a detailed dashboard panel with several key metrics and sections:
- **Radial Progress Chart**: Displays the overall project completion percentage (e.g. 25% complete).
- **Your Position**: Displays your queue number (e.g., #2) in our current system pipeline.
- **Projects Ahead**: Displays the number of other client projects currently in the pipeline queue ahead of your start.
- **Active Workload**: Displays the total count of active tasks currently being managed by the dev team (e.g., 22 Jobs).
- **Estimated Start**: An approximate timeframe for when work on your job commences (e.g. 3-5 Business Days).
- **Timeline Milestones**: Displays the 9 critical phases of a project:
  1. **Request Submitted**
  2. **Under Review**
  3. **Waiting for Customer** (Orange indicator if details are needed from your end)
  4. **Job Created**
  5. **Design Phase**
  6. **Development**
  7. **Testing**
  8. **Client Review**
  9. **Completed**
            `
          },
          {
            title: 'How to submit checklist info and files',
            content: `
If your project milestone is paused with the status **Waiting for Customer**, you need to provide information to resume development:
1. Navigate to the **Information Required From You** section inside the Job.
2. Review the checklist of tasks (e.g. "link ek dpn", "logos", "site text").
3. For items marked with a pending status, click **Upload / Provide Information** to input requested text or upload files.
4. Once submitted, the item turns to a green **Submitted** status badge.
5. If you need to make changes to a submitted checklist item, click **Re-submit / Edit** on that item.
            `
          },
          {
            title: 'Where to find notices and update logs from developers',
            content: `
Under the **Notes from Development Team / Admin Notice** card on the right-hand side of the Job view:
- You will see chronological logs, system warnings, and direct updates posted by the development team regarding your project.
- If there are no notices yet, it will display the message *"No messages posted for this project yet. Check back later for updates."*
            `
          }
        ]
      }
    ]
  },
  {
    id: 'support',
    title: 'Support & Tickets',
    description: 'Resolving issues and communicating with the technical support team.',
    icon: MessageSquare,
    color: '#ef4444',
    subcategories: [
      {
        id: 'tickets',
        title: 'Ticket Management',
        articles: [
          {
            title: 'How to create a support ticket',
            content: `
If you encounter any server issue, bug, or have custom requests:
1. Navigate to **Ticket** -> **Create Ticket**.
2. Select a Department (e.g., Technical Support, Billing, Sales).
3. Set the Priority (Low, Medium, High, Critical).
4. Select the related service (e.g. your active hosting package or domain, if applicable).
5. Type a descriptive Subject and outline your issue in detail in the message editor. You can use markdown formatting.
6. Submit the ticket. A unique ticket number (e.g., #TKT-XXXX) will be generated.
            `
          },
          {
            title: 'How to reply and format messages inside tickets',
            content: `
To reply or read updates:
1. Go to **Ticket** -> **My Tickets**.
2. Click on the ticket you wish to open.
3. Scroll to the bottom to write a new message.
4. You can use formatting buttons (e.g., **Bold**, *Italic*, Code blocks) at the top of the reply box to style your message.
5. Click **Submit Reply** to post.
            `
          }
        ]
      }
    ]
  }
];

export default function KnowledgebasePage({ isDark = false, c = {} }) {
  const { toast } = useToast();
  const [feedbackMap, setFeedbackMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState({});

  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || 'var(--brand-color)';
  const brandLight = c.brandLight || 'var(--brand-color-light)';
  const cardBg = isDark ? 'rgba(28, 30, 36, 0.85)' : 'rgba(255, 255, 255, 0.9)';

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 20,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
  };

  // Find matching articles based on search query
  const searchResults = [];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    SECTIONS.forEach(sec => {
      sec.subcategories.forEach(sub => {
        sub.articles.forEach(art => {
          if (
            art.title.toLowerCase().includes(q) ||
            art.content.toLowerCase().includes(q) ||
            sec.title.toLowerCase().includes(q)
          ) {
            searchResults.push({ section: sec, subcategory: sub, article: art });
          }
        });
      });
    });
  }

  const handleArticleClick = (section, subcategory, article) => {
    setSelectedSection(section);
    setSelectedSubcategory(subcategory);
    setSelectedArticle(article);
  };

  const handleFeedbackClick = (option) => {
    if (!selectedArticle) return;
    setFeedbackMap(prev => ({
      ...prev,
      [selectedArticle.title]: option
    }));
    toast({
      title: "Feedback Recorded",
      description: option === 'yes' 
        ? "Thank you! We're glad this article was helpful." 
        : "Thank you! We've noted your feedback to improve this article.",
      duration: 3000,
    });
  };

  const handleBackToSection = () => {
    setSelectedArticle(null);
  };

  const handleBackToHome = () => {
    setSelectedSection(null);
    setSelectedSubcategory(null);
    setSelectedArticle(null);
    setSearchQuery('');
  };

  const toggleSubcategoryExpand = (subId) => {
    setExpandedSubcategory(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  // Get all popular articles for the home view
  const recentArticles = [
    { section: SECTIONS[0], subcategory: SECTIONS[0].subcategories[0], article: SECTIONS[0].subcategories[0].articles[0] },
    { section: SECTIONS[3], subcategory: SECTIONS[3].subcategories[0], article: SECTIONS[3].subcategories[0].articles[0] },
    { section: SECTIONS[4], subcategory: SECTIONS[4].subcategories[0], article: SECTIONS[4].subcategories[0].articles[0] }
  ];

  return (
    <div className="w-full flex flex-col gap-6 pb-20 select-text">
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: brand }}>
          <BookOpen className="w-4 h-4" />
          <span>Support Desk</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: text }}>Knowledgebase</h1>
        <p className="text-sm" style={{ color: subText }}>Find step-by-step guides, walkthroughs, and answers to common hosting and billing questions.</p>
      </div>

      {/* Search Header Container */}
      <div 
        className="w-full relative overflow-hidden flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl border"
        style={{ 
          background: isDark ? 'radial-gradient(circle at top right, rgba(232, 123, 53, 0.08), transparent 60%)' : 'radial-gradient(circle at top right, rgba(232, 123, 53, 0.05), transparent 60%)',
          borderColor: border,
          backgroundColor: isDark ? 'rgba(20,22,26,0.5)' : '#ffffff'
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: text }}>How can we help you today?</h2>
        <div className="w-full max-w-xl relative flex items-center">
          <Search className="absolute left-4 w-5 h-5" style={{ color: subText }} />
          <input
            type="text"
            placeholder="Search the knowledgebase (e.g. 'order hosting', 'invoice')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-24 py-3 rounded-xl border text-sm font-medium focus:outline-none transition-all"
            style={{
              borderColor: border,
              background: isDark ? '#1a1d24' : '#f9f9fa',
              color: text,
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-4 text-xs font-semibold hover:opacity-80"
              style={{ color: brand }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side Navigation Directory (Show on sections or article views) */}
        {(selectedSection || searchQuery) && (
          <div className="lg:col-span-1 flex flex-col gap-4">
            <button
              onClick={handleBackToHome}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all hover:opacity-90"
              style={{ 
                borderColor: border, 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                color: text
              }}
            >
              ← Back to Categories
            </button>

            {/* List of categories */}
            <div className="hidden lg:flex rounded-xl border p-4 flex-col gap-2" style={{ backgroundColor: cardBg, borderColor: border }}>
              <span className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: subText }}>Categories</span>
              {SECTIONS.map(sec => {
                const isCurrent = selectedSection?.id === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedSection(sec);
                      setSelectedSubcategory(sec.subcategories[0]);
                      setSelectedArticle(null);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all"
                    style={{
                      color: isCurrent ? brand : text,
                      backgroundColor: isCurrent ? brandLight : 'transparent'
                    }}
                  >
                    <sec.icon className="w-4 h-4 flex-shrink-0" style={{ color: isCurrent ? brand : sec.color }} />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Side Content Display */}
        <div className={(selectedSection || searchQuery) ? "lg:col-span-3 flex flex-col gap-6" : "lg:col-span-4 flex flex-col gap-6"}>
          
          {selectedArticle ? (
            
            // ARTICLE VIEW
            <div style={cardStyle} className="p-4 md:p-6 flex flex-col gap-6">
              {/* Back to section subcategories list or search results */}
              <button 
                onClick={handleBackToSection} 
                className="w-fit text-xs font-bold flex items-center gap-1 hover:opacity-80"
                style={{ color: brand }}
              >
                {searchQuery.trim() ? '← Back to Search Results' : `← Back to ${selectedSection.title}`}
              </button>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: brand }}>
                  <span>{selectedSection.title}</span>
                  <span>/</span>
                  <span>{selectedSubcategory.title}</span>
                </div>
                <h2 className="text-xl font-bold" style={{ color: text }}>{selectedArticle.title}</h2>
              </div>

              {/* Article Content */}
              <div 
                className="text-sm leading-relaxed border-t pt-6 whitespace-pre-line"
                style={{ color: text, borderColor: border }}
              >
                {selectedArticle.content.trim().split('\n').map((line, lineIdx) => {
                  // Function to render text with bold formatting
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <div key={lineIdx}>
                      {parts.map((part, partIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={partIdx} className="font-extrabold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Call to action (Helpful check) */}
              <div 
                className="mt-6 flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border gap-4"
                style={{ borderColor: border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f9f9fa' }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-semibold" style={{ color: text }}>Was this article helpful to you?</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleFeedbackClick('yes')}
                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                    style={{ 
                      borderColor: feedbackMap[selectedArticle.title] === 'yes' ? 'rgb(16, 185, 129)' : border, 
                      backgroundColor: feedbackMap[selectedArticle.title] === 'yes' ? 'rgb(16, 185, 129)' : 'transparent',
                      color: feedbackMap[selectedArticle.title] === 'yes' ? '#ffffff' : text 
                    }}
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => handleFeedbackClick('no')}
                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all hover:bg-red-500 hover:text-white hover:border-red-500"
                    style={{ 
                      borderColor: feedbackMap[selectedArticle.title] === 'no' ? 'rgb(239, 68, 68)' : border, 
                      backgroundColor: feedbackMap[selectedArticle.title] === 'no' ? 'rgb(239, 68, 68)' : 'transparent',
                      color: feedbackMap[selectedArticle.title] === 'no' ? '#ffffff' : text 
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

          ) : searchQuery.trim() ? (
            
            // SEARCH RESULTS VIEW
            <div style={cardStyle} className="p-4 md:p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: text }}>
                Search Results ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center gap-3">
                  <HelpCircle className="w-12 h-12" style={{ color: subText }} />
                  <span className="text-sm font-medium" style={{ color: subText }}>No articles match your search. Try different keywords.</span>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: border }}>
                  {searchResults.map((res, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleArticleClick(res.section, res.subcategory, res.article)}
                      className="py-3 flex flex-col gap-1 cursor-pointer transition-all hover:pl-2"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: brand }}>
                        <span>{res.section.title}</span>
                        <span>/</span>
                        <span>{res.subcategory.title}</span>
                      </div>
                      <span className="text-sm font-semibold hover:underline" style={{ color: text }}>
                        {res.article.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          ) : !selectedSection ? (
            
            // KNOWLEDGEBASE HOME VIEW
            <>
              {/* Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SECTIONS.map((sec) => (
                  <div 
                    key={sec.id}
                    style={cardStyle}
                    className="p-4 md:p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedSection(sec);
                      setSelectedSubcategory(sec.subcategories[0]);
                      setSelectedArticle(null);
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${sec.color}15` }}
                        >
                          <sec.icon className="w-5 h-5" style={{ color: sec.color }} />
                        </div>
                        <h3 className="font-bold text-sm" style={{ color: text }}>{sec.title}</h3>
                      </div>
                      <p className="text-xs mb-4 line-clamp-2" style={{ color: subText }}>{sec.description}</p>
                    </div>
                    <div className="flex items-center text-xs font-semibold transition-all hover:opacity-85 mt-2" style={{ color: brand }}>
                      <span>View details</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent & Frequently Asked Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                
                {/* Recent Articles */}
                <div style={cardStyle} className="p-4 md:p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: border }}>
                    <BookOpen className="w-4 h-4" style={{ color: brand }} />
                    <h3 className="font-bold text-sm" style={{ color: text }}>Recent Articles</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {recentArticles.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleArticleClick(item.section, item.subcategory, item.article)}
                        className="flex items-center justify-between gap-4 cursor-pointer group py-1"
                      >
                        <span className="text-xs font-medium group-hover:underline line-clamp-2 flex-1 text-left" style={{ color: text }}>
                          📄 {item.article.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0" style={{ backgroundColor: brandLight, color: brand }}>
                          {item.section.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frequently Asked */}
                <div style={cardStyle} className="p-4 md:p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: border }}>
                    <HelpCircle className="w-4 h-4" style={{ color: brand }} />
                    <h3 className="font-bold text-sm" style={{ color: text }}>Frequently Asked Questions</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div 
                      onClick={() => handleArticleClick(SECTIONS[5], SECTIONS[5].subcategories[0], SECTIONS[5].subcategories[0].articles[0])}
                      className="flex items-center justify-between gap-4 cursor-pointer group py-1"
                    >
                      <span className="text-xs font-medium group-hover:underline line-clamp-2 flex-1 text-left" style={{ color: text }}>
                        ❓ How do I submit a bank receipt / payment slip?
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0" style={{ backgroundColor: brandLight, color: brand }}>
                        Billing
                      </span>
                    </div>
                    <div 
                      onClick={() => handleArticleClick(SECTIONS[2], SECTIONS[2].subcategories[0], SECTIONS[2].subcategories[0].articles[0])}
                      className="flex items-center justify-between gap-4 cursor-pointer group py-1"
                    >
                      <span className="text-xs font-medium group-hover:underline line-clamp-2 flex-1 text-left" style={{ color: text }}>
                        ❓ How to order a new hosting plan?
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0" style={{ backgroundColor: brandLight, color: brand }}>
                        Hosting
                      </span>
                    </div>
                    <div 
                      onClick={() => handleArticleClick(SECTIONS[8], SECTIONS[8].subcategories[0], SECTIONS[8].subcategories[0].articles[0])}
                      className="flex items-center justify-between gap-4 cursor-pointer group py-1"
                    >
                      <span className="text-xs font-medium group-hover:underline line-clamp-2 flex-1 text-left" style={{ color: text }}>
                        ❓ How to create a support ticket?
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0" style={{ backgroundColor: brandLight, color: brand }}>
                        Support
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </>

          ) : (
            
            // SECTION VIEW WITH SUBCATEGORIES
            <div style={cardStyle} className="p-4 md:p-6 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedSection.color}15` }}
                >
                  <selectedSection.icon className="w-5 h-5" style={{ color: selectedSection.color }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: text }}>{selectedSection.title}</h2>
                  <p className="text-xs" style={{ color: subText }}>{selectedSection.description}</p>
                </div>
              </div>

              {/* Subcategories list and their articles */}
              <div className="flex flex-col gap-4 mt-2">
                {selectedSection.subcategories.map(sub => (
                  <div key={sub.id} className="rounded-xl border p-4" style={{ borderColor: border, backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : '#fcfcfd' }}>
                    <button
                      onClick={() => toggleSubcategoryExpand(sub.id)}
                      className="w-full flex items-center justify-between text-left font-bold text-sm pb-2 border-b mb-3"
                      style={{ color: text, borderColor: border }}
                    >
                      <span>{sub.title}</span>
                      {expandedSubcategory[sub.id] === false ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {expandedSubcategory[sub.id] !== false && (
                      <div className="flex flex-col gap-2.5">
                        {sub.articles.map((art, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleArticleClick(selectedSection, sub, art)}
                            className="flex items-center gap-2 text-xs font-medium cursor-pointer transition-all hover:pl-1"
                            style={{ color: text }}
                          >
                            <span style={{ color: brand }}>📄</span>
                            <span className="hover:underline">{art.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
