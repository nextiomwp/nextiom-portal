import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Eye, Pencil, Trash2, MoreVertical, Check, X, 
  ArrowUp, ArrowDown, Settings, ChevronRight, AlertCircle, 
  Calendar, User, FileText, CheckCircle2, ChevronDown, 
  Briefcase, ArrowUpDown, HelpCircle, RefreshCw, Send, ListTodo, MessageSquare, Clock
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  getJobs, createJob, updateJob, deleteJob, 
  getJobSettings, updateJobSettings 
} from '@/lib/jobs';

export default function AdminJobsPage({ c, isDark, isMobile }) {
  const { toast } = useToast();
  
  // Data State
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({
    id: 1,
    show_custom_active_jobs: false,
    custom_active_jobs_count: 15,
    max_concurrent_jobs: 10,
    display_queue_to_customers: true,
    display_active_job_count: true,
    display_queue_position: true,
    auto_sort_jobs_in_queue: true,
    queue_position_mode: 'automatic',
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // All | Active | Waiting | On Hold | Completed
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [editingTimelineJobId, setEditingTimelineJobId] = useState(null);
  const [tempTimelineSteps, setTempTimelineSteps] = useState([]);
  const [tempProgressStep, setTempProgressStep] = useState(0);
  
  // Sidebar State (Create/Edit Panel)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // null means creating
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  
  // Settings Panel state
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    category: 'Web Design',
    service_package: '',
    priority: 'Medium',
    estimated_start: '3–5 Business Days',
    created_date: new Date().toISOString().split('T')[0],
    queue_position: '',
    status: 'Waiting',
    assign_to: '',
    description: '',
    send_email_notification: false,
  });

  // Selected Job Details edits
  const [internalNotesText, setInternalNotesText] = useState('');
  const [customerViewNotesText, setCustomerViewNotesText] = useState('');
  const [newRequirementText, setNewRequirementText] = useState('');
  const [newRequirementType, setNewRequirementType] = useState('text');

  const isQueuePositionDirty = useRef(false);

  // Sync edit form's queue position if the job's queue position is changed in the background (e.g., via table shift)
  useEffect(() => {
    if (sidebarOpen && editingJob && !isQueuePositionDirty.current) {
      const currentDbJob = jobs.find(j => j.id === editingJob.id);
      if (currentDbJob) {
        // Calculate its new position in the waiting list
        let currentPos = '';
        if (currentDbJob.status === 'Waiting') {
          const waitingJobs = jobs.filter(j => j.status === 'Waiting');
          if (settings.queue_position_mode === 'automatic') {
            waitingJobs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          } else {
            waitingJobs.sort((a, b) => {
              const posA = a.queue_position ?? 999999;
              const posB = b.queue_position ?? 999999;
              if (posA !== posB) return posA - posB;
              return new Date(a.created_date) - new Date(b.created_date);
            });
          }
          const wIdx = waitingJobs.findIndex(wj => wj.id === currentDbJob.id);
          currentPos = wIdx !== -1 ? (wIdx + 1).toString() : '';
        }
        
        if (formData.queue_position !== currentPos) {
          setFormData(prev => ({
            ...prev,
            queue_position: currentPos
          }));
        }
      }
    }
  }, [jobs, editingJob, sidebarOpen, settings.queue_position_mode, formData.queue_position]);

  // Predefined lists
  const categories = ['Web Design', 'SEO', 'Branding', 'UI/UX', 'Mobile App', 'Marketing', 'Consulting'];
  const assignees = ['None', 'Web Team', 'SEO Team', 'Design Team', 'Lead Developer', 'Alex (Fullstack)', 'Sarah (UI/UX)', 'Emily (Branding)'];
  const priorities = ['High', 'Medium', 'Low'];
  const statuses = ['Active', 'Waiting', 'On Hold', 'Completed'];

  const progressSteps = [
    'Request Submitted',
    'Under Review',
    'Waiting for Customer',
    'Job Created',
    'Design Phase',
    'Development',
    'Testing',
    'Client Review',
    'Completed'
  ];

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime updates for jobs and job settings
    const channel = supabase
      .channel('admin-jobs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_settings'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch jobs
      const jobsData = await getJobs();
      setJobs(jobsData);
      
      // Fetch settings
      const settingsData = await getJobSettings();
      setSettings(settingsData);

      // Fetch customers for the dropdown
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('id, name, email, company')
        .order('name');
      
      if (custError) throw custError;
      setCustomers(custData || []);

      if (custData && custData.length > 0 && !formData.customer_id) {
        setFormData(prev => ({ ...prev, customer_id: custData[0].id }));
      }
    } catch (error) {
      toast({
        title: 'Error loading page data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Open sidebar for creating
  const handleOpenCreate = () => {
    setEditingJob(null);
    setIsCustomCategory(false);
    setCustomCategoryText('');
    isQueuePositionDirty.current = false;
    setFormData({
      customer_id: customers[0]?.id || '',
      title: '',
      category: 'Web Design',
      service_package: '',
      priority: 'Medium',
      estimated_start: '3–5 Business Days',
      created_date: new Date().toISOString().split('T')[0],
      queue_position: '',
      status: 'Waiting',
      assign_to: '',
      description: '',
      send_email_notification: false,
    });
    setSidebarOpen(true);
  };

  // Open sidebar for editing
  const handleOpenEdit = (job) => {
    setEditingJob(job);
    const isCustom = !categories.includes(job.category);
    setIsCustomCategory(isCustom);
    setCustomCategoryText(isCustom ? job.category : '');
    
    // Calculate current position in the waiting list
    let currentPos = '';
    if (job.status === 'Waiting') {
      const waitingJobs = jobs.filter(j => j.status === 'Waiting');
      if (settings.queue_position_mode === 'automatic') {
        waitingJobs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      } else {
        waitingJobs.sort((a, b) => {
          const posA = a.queue_position ?? 999999;
          const posB = b.queue_position ?? 999999;
          if (posA !== posB) return posA - posB;
          return new Date(a.created_date) - new Date(b.created_date);
        });
      }
      const wIdx = waitingJobs.findIndex(wj => wj.id === job.id);
      currentPos = wIdx !== -1 ? (wIdx + 1).toString() : '';
    }

    isQueuePositionDirty.current = false;

    setFormData({
      customer_id: job.customer_id,
      title: job.title,
      category: job.category,
      service_package: job.service_package || '',
      priority: job.priority,
      estimated_start: job.estimated_start || '3–5 Business Days',
      created_date: new Date(job.created_date).toISOString().split('T')[0],
      queue_position: currentPos,
      status: job.status,
      assign_to: job.assign_to || '',
      description: job.description || '',
      send_email_notification: job.send_email_notification || false,
    });
    setSidebarOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'queue_position') {
      isQueuePositionDirty.current = true;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Helper to reorder queue sequentially to remove gaps and duplicates
  const reorderQueue = async () => {
    try {
      const { data: waitingJobs, error } = await supabase
        .from('jobs')
        .select('id, queue_position, created_date')
        .eq('status', 'Waiting');
        
      if (error) throw error;
      
      waitingJobs.sort((a, b) => {
        const posA = a.queue_position ?? 999999;
        const posB = b.queue_position ?? 999999;
        if (posA !== posB) return posA - posB;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      
      const updates = [];
      for (let i = 0; i < waitingJobs.length; i++) {
        const job = waitingJobs[i];
        const assignedPos = i + 1;
        if (job.queue_position !== assignedPos) {
          updates.push(
            supabase
              .from('jobs')
              .update({ queue_position: assignedPos })
              .eq('id', job.id)
          );
        }
      }
      
      if (updates.length > 0) {
        await Promise.all(updates);
      }
    } catch (e) {
      console.error('Error reordering queue:', e);
    }
  };

  // Sync all queue positions when a specific job's position is manually set
  const syncQueuePositions = async (targetJobId, newPos) => {
    try {
      // Get all waiting jobs from database
      const { data: waitingJobs, error } = await supabase
        .from('jobs')
        .select('id, queue_position, created_date')
        .eq('status', 'Waiting');
        
      if (error) throw error;
      
      // Sort them according to manual mode sorting rules
      waitingJobs.sort((a, b) => {
        const posA = a.queue_position ?? 999999;
        const posB = b.queue_position ?? 999999;
        if (posA !== posB) return posA - posB;
        return new Date(a.created_date) - new Date(b.created_date);
      });
      
      // Find the target job in the list
      const targetJob = waitingJobs.find(j => j.id === targetJobId);
      if (!targetJob) return;
      
      // Filter out the target job
      const otherWaitingJobs = waitingJobs.filter(j => j.id !== targetJobId);
      
      // Insert target job at target index (newPos - 1)
      const targetIdx = Math.max(0, Math.min(newPos - 1, otherWaitingJobs.length));
      const reordered = [...otherWaitingJobs];
      reordered.splice(targetIdx, 0, targetJob);
      
      // Prepare updates for any jobs whose position is out of sync with its new index
      const otherUpdates = [];
      for (let i = 0; i < reordered.length; i++) {
        const job = reordered[i];
        const assignedPos = i + 1;
        if (job.queue_position !== assignedPos) {
          otherUpdates.push(
            supabase
              .from('jobs')
              .update({ queue_position: assignedPos })
              .eq('id', job.id)
          );
        }
      }
      
      if (otherUpdates.length > 0) {
        await Promise.all(otherUpdates);
      }
    } catch (e) {
      console.error('Error syncing queue positions:', e);
      toast({ title: 'Error syncing queue', description: e.message, variant: 'destructive' });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Validation error', description: 'Job title is required', variant: 'destructive' });
      return;
    }

    try {
      const newPos = formData.queue_position !== '' ? parseInt(formData.queue_position) : null;
      const payload = {
        ...formData,
        queue_position: newPos,
        created_date: new Date(formData.created_date).toISOString(),
      };

      // If they assigned a manual queue position and the setting mode is automatic, auto-switch to manual
      if (formData.status === 'Waiting' && newPos !== null && newPos > 0 && settings.queue_position_mode === 'automatic') {
        await updateJobSettings({ ...settings, queue_position_mode: 'manual' });
        setSettings(prev => ({ ...prev, queue_position_mode: 'manual' }));
      }

      if (editingJob) {
        // Update
        await updateJob(editingJob.id, payload);
        if (formData.status === 'Waiting' && newPos !== null && newPos > 0) {
          await syncQueuePositions(editingJob.id, newPos);
        } else {
          await reorderQueue();
        }
        toast({ title: 'Success', description: 'Job updated successfully' });
      } else {
        // Create new
        const newJob = await createJob({
          ...payload,
          customer_requirements: [],
          internal_notes: '',
          customer_view_notes: '',
          progress_step: 0,
        });
        
        if (formData.status === 'Waiting' && newPos !== null && newPos > 0) {
          await syncQueuePositions(newJob.id, newPos);
        } else {
          await reorderQueue();
        }
        
        // Log activity or notifications
        await supabase.from('notifications').insert([{
          customer_id: newJob.customer_id,
          type: 'admin_activity',
          title: 'Job Created',
          message: `Your project "${newJob.title}" has been added to the queue.`,
        }]);

        toast({ title: 'Success', description: 'Job created successfully' });
      }

      setSidebarOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error saving job', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await deleteJob(jobId);
      await reorderQueue();
      toast({ title: 'Success', description: 'Job deleted successfully' });
      if (expandedJobId === jobId) setExpandedJobId(null);
      fetchData();
    } catch (error) {
      toast({ title: 'Error deleting job', description: error.message, variant: 'destructive' });
    }
  };

  // Toggle Settings Panel
  const handleUpdateSetting = async (key, val) => {
    try {
      const updated = { ...settings, [key]: val };
      setSettings(updated);
      await updateJobSettings(updated);
      toast({ title: 'Settings saved', description: 'Queue configuration updated.' });
    } catch (error) {
      toast({ title: 'Error updating settings', description: error.message, variant: 'destructive' });
    }
  };

  // Quick update status
  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      await updateJob(jobId, { status: newStatus });
      await reorderQueue();
      toast({ title: 'Status updated', description: `Job status set to ${newStatus}` });
      fetchData();
    } catch (error) {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    }
  };

  // Click step in progress timeline
  const handleUpdateProgressStep = async (jobId, stepIndex) => {
    try {
      await updateJob(jobId, { progress_step: stepIndex });
      const targetJob = jobs.find(j => j.id === jobId);
      const steps = targetJob && Array.isArray(targetJob.timeline_steps) ? targetJob.timeline_steps : progressSteps;
      toast({ title: 'Progress updated', description: `Job stage updated to: ${steps[stepIndex] || ('Stage ' + (stepIndex + 1))}` });
      
      // Load details again
      const updatedJobs = jobs.map(j => j.id === jobId ? { ...j, progress_step: stepIndex } : j);
      setJobs(updatedJobs);
    } catch (error) {
      toast({ title: 'Error updating progress', description: error.message, variant: 'destructive' });
    }
  };

  // Save notes
  const handleSaveInternalNotes = async (jobId) => {
    try {
      await updateJob(jobId, { internal_notes: internalNotesText });
      toast({ title: 'Notes saved', description: 'Internal notes updated successfully' });
      
      const updatedJobs = jobs.map(j => j.id === jobId ? { ...j, internal_notes: internalNotesText } : j);
      setJobs(updatedJobs);
    } catch (error) {
      toast({ title: 'Error saving notes', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveCustomerNotes = async (jobId) => {
    try {
      await updateJob(jobId, { customer_view_notes: customerViewNotesText });
      toast({ title: 'Customer view saved', description: 'Customer-facing queue notes updated' });
      
      const updatedJobs = jobs.map(j => j.id === jobId ? { ...j, customer_view_notes: customerViewNotesText } : j);
      setJobs(updatedJobs);
    } catch (error) {
      toast({ title: 'Error saving customer notes', description: error.message, variant: 'destructive' });
    }
  };

  // Requirements checklist management
  const handleAddRequirement = async (job) => {
    if (!newRequirementText.trim()) return;
    try {
      const requirements = Array.isArray(job.customer_requirements) ? [...job.customer_requirements] : [];
      const newItem = {
        id: `req-${Date.now()}`,
        title: newRequirementText,
        status: 'pending',
        type: newRequirementType,
        value: ''
      };
      
      const updatedRequirements = [...requirements, newItem];
      await updateJob(job.id, { customer_requirements: updatedRequirements });
      
      const updatedJobs = jobs.map(j => j.id === job.id ? { ...j, customer_requirements: updatedRequirements } : j);
      setJobs(updatedJobs);
      setNewRequirementText('');
      toast({ title: 'Requirement added', description: 'Required action added for customer' });
    } catch (error) {
      toast({ title: 'Error adding requirement', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleRequirementStatus = async (job, reqId) => {
    try {
      const requirements = Array.isArray(job.customer_requirements) ? [...job.customer_requirements] : [];
      const updated = requirements.map(r => {
        if (r.id === reqId) {
          return { ...r, status: r.status === 'completed' ? 'pending' : 'completed' };
        }
        return r;
      });
      
      await updateJob(job.id, { customer_requirements: updated });
      const updatedJobs = jobs.map(j => j.id === job.id ? { ...j, customer_requirements: updated } : j);
      setJobs(updatedJobs);
      toast({ title: 'Status toggled', description: 'Requirement status updated' });
    } catch (error) {
      toast({ title: 'Error updating checklist', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteRequirement = async (job, reqId) => {
    try {
      const requirements = Array.isArray(job.customer_requirements) ? [...job.customer_requirements] : [];
      const filtered = requirements.filter(r => r.id !== reqId);
      
      await updateJob(job.id, { customer_requirements: filtered });
      const updatedJobs = jobs.map(j => j.id === job.id ? { ...j, customer_requirements: filtered } : j);
      setJobs(updatedJobs);
      toast({ title: 'Requirement deleted', description: 'Item removed from checklist' });
    } catch (error) {
      toast({ title: 'Error deleting item', description: error.message, variant: 'destructive' });
    }
  };

  // Reorder queue position manually
  const handleShiftPosition = async (job, direction) => {
    const waitingJobs = jobs.filter(j => j.status === 'Waiting');
    waitingJobs.sort((a, b) => {
      const posA = a.queue_position ?? 999999;
      const posB = b.queue_position ?? 999999;
      if (posA !== posB) return posA - posB;
      return new Date(a.created_date) - new Date(b.created_date);
    });

    const index = waitingJobs.findIndex(j => j.id === job.id);
    if (index === -1) return;

    let targetIndex = index;
    if (direction === 'up' && index > 0) targetIndex = index - 1;
    else if (direction === 'down' && index < waitingJobs.length - 1) targetIndex = index + 1;

    if (targetIndex === index) return;

    // Swap the position values
    const itemA = waitingJobs[index];
    const itemB = waitingJobs[targetIndex];
    
    // Assign position numbers if missing
    const posA = itemA.queue_position ?? (index + 1);
    const posB = itemB.queue_position ?? (targetIndex + 1);

    try {
      await updateJob(itemA.id, { queue_position: posB });
      await updateJob(itemB.id, { queue_position: posA });
      toast({ title: 'Reordered', description: 'Manual queue positions swapped' });
      fetchData();
    } catch (e) {
      toast({ title: 'Error reordering queue', description: e.message, variant: 'destructive' });
    }
  };

  // Process sorting and partitioning
  const realActiveJobs = jobs.filter(j => j.status === 'Active');
  const realWaitingJobs = jobs.filter(j => j.status === 'Waiting');
  
  // Sort waiting jobs
  const sortedWaitingJobs = [...realWaitingJobs];
  if (settings.queue_position_mode === 'automatic') {
    sortedWaitingJobs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  } else {
    sortedWaitingJobs.sort((a, b) => {
      const posA = a.queue_position ?? 999999;
      const posB = b.queue_position ?? 999999;
      if (posA !== posB) return posA - posB;
      return new Date(a.created_date) - new Date(b.created_date);
    });
  }

  const otherStatusJobs = jobs.filter(j => j.status !== 'Active' && j.status !== 'Waiting');
  
  // Combine all based on groupings: Active first, then divider, then Waiting, then others
  // If activeTab is filtered, we apply that filter.
  const getFilteredJobsList = () => {
    if (activeTab === 'Active') return realActiveJobs;
    if (activeTab === 'Waiting') return sortedWaitingJobs;
    if (activeTab === 'On Hold') return jobs.filter(j => j.status === 'On Hold');
    if (activeTab === 'Completed') return jobs.filter(j => j.status === 'Completed');
    
    // 'All' - displays all
    return [...realActiveJobs, ...sortedWaitingJobs, ...otherStatusJobs];
  };

  const filteredJobs = getFilteredJobsList();

  // Active Count override
  const activeCountDisplay = settings.show_custom_active_jobs 
    ? settings.custom_active_jobs_count 
    : realActiveJobs.length;

  const totalCountDisplay = activeCountDisplay + realWaitingJobs.length;

  // Handle setting active job expanded details
  const handleToggleExpand = (job) => {
    if (expandedJobId === job.id) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(job.id);
      setInternalNotesText(job.internal_notes || '');
      setCustomerViewNotesText(job.customer_view_notes || '');
    }
  };

  return (
    <div style={{ paddingBottom: 60, position: 'relative' }}>
      {/* Title & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 24,
              height: 24,
              backgroundColor: c.brand || '#E87B35',
              WebkitMaskImage: "url('/on-progress.png')",
              maskImage: "url('/on-progress.png')",
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              flexShrink: 0
            }} /> Jobs & Project Queue
          </h1>
          <p style={{ fontSize: 14, color: c.subText }}>Manage customer deliverables, estimated start times, and queue sequencing.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            style={{ 
              background: showSettingsPanel ? c.hover : 'none', 
              color: c.text, 
              border: `1px solid ${c.border}`, 
              padding: '8px 12px', 
              borderRadius: 8, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <Settings size={16} className={showSettingsPanel ? 'animate-spin' : ''} />
            Queue Settings
          </button>
          
          <button 
            onClick={handleOpenCreate}
            style={{ 
              background: c.brand, 
              color: '#fff', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: 8, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <Plus size={16} />
            Create Job
          </button>
        </div>
      </div>

      {/* 5. Queue Management Settings Panel (Collapsible) */}
      {showSettingsPanel && (
        <div style={{ 
          background: c.card, 
          border: `1px solid ${c.borderStrong}`, 
          borderRadius: 12, 
          padding: 20, 
          marginBottom: 24,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} className="text-orange-500" /> Queue Management Settings
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Column 1: Overrides & Limits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                  Active Jobs Count Mode
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => handleUpdateSetting('show_custom_active_jobs', false)}
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: 'none',
                      background: !settings.show_custom_active_jobs ? c.brand : c.hover,
                      color: !settings.show_custom_active_jobs ? '#fff' : c.text,
                      fontWeight: 500
                    }}
                  >
                    System Real Count
                  </button>
                  <button 
                    onClick={() => handleUpdateSetting('show_custom_active_jobs', true)}
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: 'none',
                      background: settings.show_custom_active_jobs ? c.brand : c.hover,
                      color: settings.show_custom_active_jobs ? '#fff' : c.text,
                      fontWeight: 500
                    }}
                  >
                    Manual Override
                  </button>
                </div>
              </div>

              {settings.show_custom_active_jobs && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 4 }}>
                    Custom Display Active Count
                  </label>
                  <input 
                    type="number"
                    value={settings.custom_active_jobs_count}
                    onChange={(e) => handleUpdateSetting('custom_active_jobs_count', parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%', padding: '8px 12px', background: c.bg, border: `1px solid ${c.border}`, 
                      borderRadius: 6, color: c.text, fontSize: 14
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 4 }}>
                  Maximum Concurrent Jobs
                </label>
                <input 
                  type="number"
                  value={settings.max_concurrent_jobs}
                  onChange={(e) => handleUpdateSetting('max_concurrent_jobs', parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%', padding: '8px 12px', background: c.bg, border: `1px solid ${c.border}`, 
                    borderRadius: 6, color: c.text, fontSize: 14
                  }}
                />
              </div>
            </div>

            {/* Column 2: Visibilities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Display Queue To Customers</div>
                  <div style={{ fontSize: 11, color: c.subText }}>Show widget in customer dashboard</div>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.display_queue_to_customers}
                  onChange={(e) => handleUpdateSetting('display_queue_to_customers', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: c.brand }}
                />
              </div>

              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Display Active Job Count</div>
                  <div style={{ fontSize: 11, color: c.subText }}>Show number of running jobs</div>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.display_active_job_count}
                  onChange={(e) => handleUpdateSetting('display_active_job_count', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: c.brand }}
                />
              </div>

              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Display Queue Position</div>
                  <div style={{ fontSize: 11, color: c.subText }}>Show numeric queue spot (e.g. #3)</div>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.display_queue_position}
                  onChange={(e) => handleUpdateSetting('display_queue_position', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: c.brand }}
                />
              </div>
            </div>

            {/* Column 3: Sorting & Position Modes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Auto Sort Jobs In Queue</div>
                  <div style={{ fontSize: 11, color: c.subText }}>Keep jobs ordered by date or index</div>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.auto_sort_jobs_in_queue}
                  onChange={(e) => handleUpdateSetting('auto_sort_jobs_in_queue', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: c.brand }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                  Queue Position Mode
                </label>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="queue_position_mode" 
                      value="automatic"
                      checked={settings.queue_position_mode === 'automatic'}
                      onChange={() => handleUpdateSetting('queue_position_mode', 'automatic')}
                      style={{ accentColor: c.brand }}
                    />
                    Automatic (FIFO by Created Date)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="queue_position_mode" 
                      value="manual"
                      checked={settings.queue_position_mode === 'manual'}
                      onChange={() => handleUpdateSetting('queue_position_mode', 'manual')}
                      style={{ accentColor: c.brand }}
                    />
                    Manual (Set positions & Drag/Shift)
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Stats Bar (Top) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
        gap: 16, 
        marginBottom: 24 
      }}>
        {/* Stat 1: Current Active Jobs */}
        <div style={{ 
          background: isDark ? 'rgba(232, 123, 53, 0.08)' : '#fff5ee', 
          border: `1px solid ${isDark ? 'rgba(232, 123, 53, 0.2)' : 'rgba(232, 123, 53, 0.15)'}`, 
          borderRadius: 12, 
          padding: 20,
          position: 'relative'
        }}>
          <div style={{ fontSize: 12, color: c.subText, fontWeight: 500 }}>CURRENT ACTIVE JOBS</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: c.brand }}>{activeCountDisplay}</span>
            {settings.show_custom_active_jobs && (
              <span style={{ fontSize: 11, background: 'rgba(232, 123, 53, 0.2)', color: c.brand, padding: '2px 6px', borderRadius: 4 }}>Manual</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: c.subText, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Real system count: {realActiveJobs.length}</span>
          </div>
        </div>

        {/* Stat 2: Jobs Waiting in Queue */}
        <div style={{ 
          background: isDark ? 'rgba(55, 138, 221, 0.08)' : '#e6f1fb', 
          border: `1px solid ${isDark ? 'rgba(55, 138, 221, 0.2)' : 'rgba(55, 138, 221, 0.15)'}`, 
          borderRadius: 12, 
          padding: 20 
        }}>
          <div style={{ fontSize: 12, color: c.subText, fontWeight: 500 }}>WAITING IN QUEUE</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#378ADD', marginTop: 8 }}>{realWaitingJobs.length}</div>
          <div style={{ fontSize: 11, color: c.subText, marginTop: 6 }}>Projects waiting for resource slot</div>
        </div>

        {/* Stat 3: Total Jobs in System */}
        <div style={{ 
          background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#f0f0ff', 
          border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)'}`, 
          borderRadius: 12, 
          padding: 20 
        }}>
          <div style={{ fontSize: 12, color: c.subText, fontWeight: 500 }}>TOTAL JOBS IN SYSTEM</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: isDark ? '#818cf8' : '#4f46e5', marginTop: 8 }}>{totalCountDisplay}</div>
          <div style={{ fontSize: 11, color: c.subText, marginTop: 6 }}>Active ({activeCountDisplay}) + Waiting ({realWaitingJobs.length})</div>
        </div>

        {/* Stat 4: Average Start Time */}
        <div style={{ 
          background: isDark ? 'rgba(99, 153, 34, 0.08)' : '#eaf3de', 
          border: `1px solid ${isDark ? 'rgba(99, 153, 34, 0.2)' : 'rgba(99, 153, 34, 0.15)'}`, 
          borderRadius: 12, 
          padding: 20 
        }}>
          <div style={{ fontSize: 12, color: c.subText, fontWeight: 500 }}>AVERAGE START TIME</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#639922', marginTop: 8, height: 42, display: 'flex', alignItems: 'center' }}>
            3–5 Days
          </div>
          <div style={{ fontSize: 11, color: c.subText, marginTop: 6 }}>Consistent delivery metrics</div>
        </div>
      </div>

      {/* 2. Jobs Queue Table */}
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
        
        {/* Table Filter Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${c.border}`, padding: '0 16px', background: isDark ? '#1a1c22' : '#fafafa' }}>
          {['All', 'Active', 'Waiting', 'On Hold', 'Completed'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                color: activeTab === tab ? c.brand : c.subText,
                borderBottom: activeTab === tab ? `2px solid ${c.brand}` : '2px solid transparent',
                fontWeight: activeTab === tab ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Element */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.subText }}>
              <RefreshCw className="animate-spin" style={{ margin: '0 auto 10px', color: c.brand }} />
              Loading jobs...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.subText }}>No jobs found matching this status.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fdfdfd', borderBottom: `1px solid ${c.border}` }}>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>#</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Job ID</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Job Title</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Priority</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600 }}>Queue Pos</th>
                  <th style={{ padding: '12px 16px', color: c.subText, fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let activeRendered = false;
                  let waitingRendered = false;
                  let renderIndex = 0;

                  return filteredJobs.map((job, idx) => {
                    // Inject Divider in "All" tab between Active and Waiting
                    const showWaitingDivider = activeTab === 'All' && 
                                              job.status === 'Waiting' && 
                                              !waitingRendered;
                    
                    if (job.status === 'Waiting') waitingRendered = true;
                    if (job.status === 'Active') activeRendered = true;

                    // Calculate position in queue for displaying
                    let calculatedPosition = '-';
                    if (job.status === 'Waiting') {
                      const wIdx = sortedWaitingJobs.findIndex(wj => wj.id === job.id);
                      calculatedPosition = wIdx !== -1 ? `#${wIdx + 1}` : '-';
                    }

                    renderIndex++;

                    // Color badges
                    let statusColor = '#888';
                    let statusBg = 'rgba(128,128,128,0.1)';
                    if (job.status === 'Active') { statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.1)'; }
                    else if (job.status === 'Waiting') { statusColor = '#3b82f6'; statusBg = 'rgba(59,130,246,0.1)'; }
                    else if (job.status === 'On Hold') { statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.1)'; }
                    else if (job.status === 'Completed') { statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.1)'; }

                    let priorityColor = '#888';
                    if (job.priority === 'High') priorityColor = '#ef4444';
                    else if (job.priority === 'Medium') priorityColor = '#f59e0b';
                    else if (job.priority === 'Low') priorityColor = '#10b981';

                    const isExpanded = expandedJobId === job.id;

                    return (
                      <React.Fragment key={job.id}>
                        {showWaitingDivider && (
                          <tr style={{ background: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)' }}>
                            <td colSpan={10} style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, borderTop: `1px solid ${c.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${c.borderStrong}, transparent)` }} />
                                <span style={{ 
                                  fontSize: 11, 
                                  fontWeight: 700, 
                                  color: '#3b82f6', 
                                  letterSpacing: 1, 
                                  background: 'rgba(59,130,246,0.15)', 
                                  padding: '2px 8px', 
                                  borderRadius: 4,
                                  textTransform: 'uppercase'
                                }}>
                                  Waiting Queue ({realWaitingJobs.length} Jobs)
                                </span>
                                <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${c.borderStrong}, transparent)` }} />
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr 
                          style={{ 
                            borderBottom: `1px solid ${c.border}`,
                            background: isExpanded 
                              ? (isDark ? 'rgba(232,123,53,0.03)' : 'rgba(232,123,53,0.01)') 
                              : 'transparent',
                            transition: 'all 0.15s'
                          }}
                          className="hover:bg-slate-50/5 cursor-pointer"
                          onClick={() => handleToggleExpand(job)}
                        >
                          <td style={{ padding: '14px 16px', color: c.subText }}>{renderIndex}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                            #{job.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: c.text }}>{job.title}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div>{job.customers?.name || 'Unknown'}</div>
                            {job.customers?.company && (
                              <div style={{ fontSize: 11, color: c.subText }}>{job.customers?.company}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', color: c.text }}>{job.category}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ 
                              color: statusColor, 
                              background: statusBg, 
                              padding: '2px 8px', 
                              borderRadius: 12, 
                              fontSize: 11, 
                              fontWeight: 600,
                              border: `1px solid ${statusColor}15`
                            }}>
                              {job.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor }} />
                              {job.priority}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: c.subText }}>
                            {new Date(job.created_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                            {job.status === 'Waiting' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{calculatedPosition}</span>
                                {settings.queue_position_mode === 'manual' && (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                                    <button 
                                      onClick={() => handleShiftPosition(job, 'up')}
                                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, height: 10, display: 'flex', color: c.subText }}
                                    >
                                      <ArrowUp size={12} className="hover:text-orange-500" />
                                    </button>
                                    <button 
                                      onClick={() => handleShiftPosition(job, 'down')}
                                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, height: 10, display: 'flex', color: c.subText }}
                                    >
                                      <ArrowDown size={12} className="hover:text-orange-500" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button 
                                onClick={() => handleToggleExpand(job)}
                                style={{ background: 'none', border: 'none', color: isExpanded ? c.brand : c.subText, cursor: 'pointer', padding: 4 }}
                                title="View details"
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                onClick={() => handleOpenEdit(job)}
                                style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}
                                title="Edit job"
                              >
                                <Pencil size={16} />
                              </button>
                              
                              {/* Quick status toggle dropdown (native select style) */}
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select 
                                  value={job.status} 
                                  onChange={(e) => handleUpdateStatus(job.id, e.target.value)}
                                  style={{
                                    opacity: 0, width: 20, height: 20, position: 'absolute', right: 0, cursor: 'pointer', zIndex: 2
                                  }}
                                >
                                  {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                                <button style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4, pointerEvents: 'none' }}>
                                  <MoreVertical size={16} />
                                </button>
                              </div>

                              <button 
                                onClick={() => handleDeleteJob(job.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                                title="Delete job"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* 4. Job Details View (Expanded content below row) */}
                        {isExpanded && (
                          <tr style={{ background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.01)' }}>
                            <td colSpan={10} style={{ padding: '24px 32px', borderBottom: `1px solid ${c.border}` }}>
                              
                              {/* Job Details Header Summary */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>{job.title}</h4>
                                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: c.subText }}>
                                    <span>Customer: <strong>{job.customers?.name}</strong></span>
                                    <span>Category: <strong>{job.category}</strong></span>
                                    <span>Priority: <strong style={{ color: priorityColor }}>{job.priority}</strong></span>
                                    <span>Created: <strong>{new Date(job.created_date).toLocaleDateString()}</strong></span>
                                    <span>Queue Position: <strong>{job.status === 'Waiting' ? calculatedPosition : 'N/A'}</strong></span>
                                    <span>Est. Start: <strong>{job.estimated_start || 'N/A'}</strong></span>
                                  </div>
                                </div>
                                
                                <span style={{ 
                                  color: statusColor, 
                                  background: statusBg, 
                                  padding: '4px 12px', 
                                  borderRadius: 8, 
                                  fontSize: 12, 
                                  fontWeight: 700,
                                  height: 'fit-content'
                                }}>
                                  Status: {job.status}
                                </span>
                              </div>

                              {/* Progress Timeline Tracker */}
                              <div style={{ marginBottom: 28 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>PROGRESS TIMELINE {editingTimelineJobId === job.id ? '(Editing mode)' : '(Click step to advance/rewind)'}</span>
                                  {editingTimelineJobId !== job.id ? (
                                    <button
                                      onClick={() => {
                                        setEditingTimelineJobId(job.id);
                                        setTempTimelineSteps([...(Array.isArray(job.timeline_steps) ? job.timeline_steps : progressSteps)]);
                                        setTempProgressStep(job.progress_step);
                                      }}
                                      style={{
                                        background: 'none', border: 'none', color: c.brand, fontSize: 11,
                                        fontWeight: 600, cursor: 'pointer', padding: '2px 8px'
                                      }}
                                    >
                                      🛠️ Edit Phases
                                    </button>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        onClick={async () => {
                                          if (tempTimelineSteps.length === 0) {
                                            toast({ title: 'Validation error', description: 'At least one phase is required.', variant: 'destructive' });
                                            return;
                                          }
                                          try {
                                            await updateJob(job.id, { 
                                              timeline_steps: tempTimelineSteps,
                                              progress_step: tempProgressStep
                                            });
                                            toast({ title: 'Success', description: 'Timeline phases updated' });
                                            
                                            const updatedJobs = jobs.map(j => j.id === job.id ? { 
                                              ...j, 
                                              timeline_steps: tempTimelineSteps,
                                              progress_step: tempProgressStep
                                            } : j);
                                            setJobs(updatedJobs);
                                            setEditingTimelineJobId(null);
                                          } catch (e) {
                                            toast({ title: 'Error saving timeline', description: e.message, variant: 'destructive' });
                                          }
                                        }}
                                        style={{
                                          background: '#10b981', color: '#fff', border: 'none', 
                                          borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                        }}
                                      >
                                        Save Phases
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingTimelineJobId(null);
                                        }}
                                        style={{
                                          background: 'none', border: `1px solid ${c.border}`, color: c.text,
                                          borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  position: 'relative',
                                  padding: '10px 0',
                                  overflowX: 'auto',
                                  gap: 12
                                }}>
                                  {/* Background connecting line */}
                                  <div style={{ 
                                    position: 'absolute', 
                                    top: 24, 
                                    left: '4%', 
                                    right: '4%', 
                                    height: 2, 
                                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    zIndex: 1 
                                  }} />
                                  
                                  {/* Active progress color line */}
                                  <div style={{ 
                                    position: 'absolute', 
                                    top: 24, 
                                    left: '4%', 
                                    width: `${((editingTimelineJobId === job.id ? tempProgressStep : job.progress_step) / (Math.max(1, (editingTimelineJobId === job.id ? tempTimelineSteps : (Array.isArray(job.timeline_steps) ? job.timeline_steps : progressSteps)).length - 1))) * 92}%`, 
                                    height: 2, 
                                    background: c.brand,
                                    zIndex: 1,
                                    transition: 'width 0.3s'
                                  }} />

                                  {(() => {
                                    const stepsToRender = editingTimelineJobId === job.id 
                                      ? tempTimelineSteps 
                                      : (Array.isArray(job.timeline_steps) ? job.timeline_steps : progressSteps);
                                    const currentProgressStep = editingTimelineJobId === job.id ? tempProgressStep : job.progress_step;

                                    return (
                                      <>
                                        {stepsToRender.map((step, stepIdx) => {
                                          const isCompleted = stepIdx < currentProgressStep;
                                          const isCurrent = stepIdx === currentProgressStep;
                                          const isFuture = stepIdx > currentProgressStep;

                                          let circleBg = isDark ? '#22252c' : '#e2e8f0';
                                          let circleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                                          let textColor = c.subText;
                                          let circleContent = stepIdx + 1;

                                          if (isCompleted) {
                                            circleBg = '#10b981';
                                            circleBorder = '#10b981';
                                            textColor = '#10b981';
                                            circleContent = <Check size={12} color="#fff" />;
                                          } else if (isCurrent) {
                                            circleBg = '#f59e0b';
                                            circleBorder = '#f59e0b';
                                            textColor = '#f59e0b';
                                            circleContent = <Clock size={12} color="#fff" />;
                                          }

                                          return (
                                            <div 
                                              key={stepIdx} 
                                              onClick={() => {
                                                if (editingTimelineJobId !== job.id) {
                                                  handleUpdateProgressStep(job.id, stepIdx);
                                                }
                                              }}
                                              style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center', 
                                                flex: 1, 
                                                zIndex: 2,
                                                cursor: editingTimelineJobId !== job.id ? 'pointer' : 'default',
                                                textAlign: 'center',
                                                minWidth: 70
                                              }}
                                            >
                                              {editingTimelineJobId === job.id ? (
                                                <div 
                                                  onClick={() => {
                                                    const newSteps = tempTimelineSteps.filter((_, idx) => idx !== stepIdx);
                                                    setTempTimelineSteps(newSteps);
                                                    
                                                    // Adjust tempProgressStep
                                                    let newProgress = tempProgressStep;
                                                    if (stepIdx === tempProgressStep) {
                                                      newProgress = Math.min(tempProgressStep, newSteps.length - 1);
                                                    } else if (stepIdx < tempProgressStep) {
                                                      newProgress = tempProgressStep - 1;
                                                    }
                                                    setTempProgressStep(Math.max(0, newProgress));
                                                  }}
                                                  style={{ 
                                                    width: 28, 
                                                    height: 28, 
                                                    borderRadius: '50%', 
                                                    background: '#ef4444', 
                                                    border: '2px solid #ef4444',
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 5px rgba(239,68,68,0.3)',
                                                    marginBottom: 8,
                                                    transition: 'all 0.2s'
                                                  }}
                                                  title="Delete step"
                                                >
                                                  <X size={12} color="#fff" />
                                                </div>
                                              ) : (
                                                <div style={{ 
                                                  width: 28, 
                                                  height: 28, 
                                                  borderRadius: '50%', 
                                                  background: circleBg, 
                                                  border: `2px solid ${circleBorder}`,
                                                  display: 'flex', 
                                                  alignItems: 'center', 
                                                  justifyContent: 'center', 
                                                  fontSize: 11, 
                                                  fontWeight: 700, 
                                                  color: isCurrent || isCompleted ? '#fff' : c.subText,
                                                  marginBottom: 8,
                                                  boxShadow: isCurrent ? '0 0 10px rgba(245,158,11,0.5)' : 'none',
                                                  transition: 'all 0.2s'
                                                }}>
                                                  {circleContent}
                                                </div>
                                              )}

                                              {editingTimelineJobId === job.id ? (
                                                <input 
                                                  type="text"
                                                  value={step}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newSteps = [...tempTimelineSteps];
                                                    newSteps[stepIdx] = val;
                                                    setTempTimelineSteps(newSteps);
                                                  }}
                                                  style={{
                                                    fontSize: 10, padding: '2px 4px', 
                                                    background: c.bg, 
                                                    border: stepIdx === tempProgressStep ? `1.5px solid #f59e0b` : `1px solid ${c.border}`,
                                                    borderRadius: 4, color: c.text, width: 80, textAlign: 'center', marginTop: 4,
                                                    boxShadow: stepIdx === tempProgressStep ? '0 0 4px rgba(245,158,11,0.2)' : 'none'
                                                  }}
                                                  required
                                                />
                                              ) : (
                                                <span style={{ 
                                                  fontSize: 10, 
                                                  fontWeight: isCurrent ? 700 : 500, 
                                                  color: textColor,
                                                  maxWidth: 90
                                                }}>
                                                  {step}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}

                                        {editingTimelineJobId === job.id && (
                                          <div 
                                            onClick={() => {
                                              setTempTimelineSteps([...tempTimelineSteps, `New Phase ${tempTimelineSteps.length + 1}`]);
                                            }}
                                            style={{ 
                                              display: 'flex', 
                                              flexDirection: 'column', 
                                              alignItems: 'center', 
                                              flex: 1, 
                                              zIndex: 2,
                                              cursor: 'pointer',
                                              textAlign: 'center',
                                              minWidth: 70
                                            }}
                                            title="Add a new phase"
                                          >
                                            <div style={{ 
                                              width: 28, 
                                              height: 28, 
                                              borderRadius: '50%', 
                                              background: c.hover, 
                                              border: `2px dashed ${c.borderStrong}`,
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              justifyContent: 'center', 
                                              color: c.brand,
                                              marginBottom: 8
                                            }}>
                                              <Plus size={14} />
                                            </div>
                                            <span style={{ fontSize: 10, color: c.subText }}>Add Step</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Three Columns Section */}
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 24, borderTop: `1px solid ${c.border}`, paddingTop: 20 }}>
                                
                                {/* Col 1: Information Required From Customer */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h5 style={{ fontSize: 13, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <ListTodo size={14} className="text-orange-500" /> Customer Checklist
                                    </h5>
                                  </div>
                                  
                                  {/* Add requirement input */}
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                    <input 
                                      type="text" 
                                      value={newRequirementText}
                                      onChange={e => setNewRequirementText(e.target.value)}
                                      placeholder="Add item..."
                                      style={{
                                        flex: 1, padding: '5px 8px', background: c.bg, border: `1px solid ${c.border}`, 
                                        borderRadius: 6, color: c.text, fontSize: 12
                                      }}
                                    />
                                    <select 
                                      value={newRequirementType}
                                      onChange={e => setNewRequirementType(e.target.value)}
                                      style={{
                                        padding: '5px', background: c.bg, border: `1px solid ${c.border}`, 
                                        borderRadius: 6, color: c.text, fontSize: 11
                                      }}
                                    >
                                      <option value="text">Provide Text</option>
                                      <option value="upload">Upload File</option>
                                    </select>
                                    <button 
                                      onClick={() => handleAddRequirement(job)}
                                      style={{ 
                                        background: c.brand, border: 'none', color: '#fff', 
                                        borderRadius: 6, padding: '0 8px', cursor: 'pointer' 
                                      }}
                                    >
                                      Add
                                    </button>
                                  </div>

                                  {/* Checklist Items list */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {!job.customer_requirements || job.customer_requirements.length === 0 ? (
                                      <div style={{ fontSize: 11, color: c.subText, fontStyle: 'italic' }}>
                                        No requirements listed yet.
                                      </div>
                                    ) : (
                                      job.customer_requirements.map(req => {
                                        const isDone = req.status === 'completed' || req.status === 'provided';
                                        return (
                                          <div 
                                            key={req.id} 
                                            style={{ 
                                              display: 'flex', 
                                              alignItems: 'flex-start', 
                                              justifyContent: 'space-between',
                                              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                              padding: 8,
                                              borderRadius: 6,
                                              gap: 6
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: 1 }}>
                                              <button 
                                                onClick={() => handleToggleRequirementStatus(job, req.id)}
                                                style={{ 
                                                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                                  color: isDone ? '#10b981' : c.subText,
                                                  marginTop: 2
                                                }}
                                              >
                                                <CheckCircle2 size={15} />
                                              </button>
                                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ 
                                                  fontSize: 12, 
                                                  textDecoration: isDone ? 'line-through' : 'none',
                                                  color: isDone ? c.subText : c.text,
                                                  fontWeight: 500
                                                }}>
                                                  {req.title}
                                                </span>
                                                <span style={{ fontSize: 9, color: c.subText }}>
                                                  Type: {req.type === 'upload' ? 'File Upload' : 'Provide Text'} ({req.status})
                                                </span>
                                                {req.value && (
                                                  <div style={{ 
                                                    marginTop: 4, padding: '4px 6px', background: c.hover, 
                                                    borderRadius: 4, fontSize: 11, wordBreak: 'break-all',
                                                    color: c.brand, borderLeft: `2px solid ${c.brand}`
                                                  }}>
                                                    {req.type === 'upload' ? (
                                                      <a href={req.value} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>
                                                        View Uploaded File
                                                      </a>
                                                    ) : (
                                                      <span>Value: "{req.value}"</span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <button 
                                              onClick={() => handleDeleteRequirement(job, req.id)}
                                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>

                                {/* Col 2: Job Notes (Internal) */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MessageSquare size={14} className="text-orange-500" /> Internal Notes (Staff Only)
                                  </h5>
                                  <textarea
                                    value={internalNotesText}
                                    onChange={e => setInternalNotesText(e.target.value)}
                                    placeholder="Enter internal developer or staff notes..."
                                    style={{
                                      width: '100%', flex: 1, minHeight: 90, padding: 8, background: c.bg, 
                                      border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, 
                                      fontSize: 12, resize: 'none', marginBottom: 8
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveInternalNotes(job.id)}
                                    style={{
                                      background: c.hover, color: c.text, border: `1px solid ${c.border}`,
                                      padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                                      fontWeight: 600, alignSelf: 'flex-end'
                                    }}
                                  >
                                    Save Internal Notes
                                  </button>
                                </div>

                                {/* Col 3: Job Queue Information (Customer View) */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Eye size={14} className="text-orange-500" /> Customer View Queue Information
                                  </h5>
                                  <textarea
                                    value={customerViewNotesText}
                                    onChange={e => setCustomerViewNotesText(e.target.value)}
                                    placeholder="This notes block is displayed directly to the customer in their dashboard queue widget."
                                    style={{
                                      width: '100%', flex: 1, minHeight: 90, padding: 8, background: c.bg, 
                                      border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, 
                                      fontSize: 12, resize: 'none', marginBottom: 8
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveCustomerNotes(job.id)}
                                    style={{
                                      background: c.hover, color: c.text, border: `1px solid ${c.border}`,
                                      padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                                      fontWeight: 600, alignSelf: 'flex-end'
                                    }}
                                  >
                                    Save Customer View Notes
                                  </button>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 3. Create / Edit Job Panel (Slide-out Right Sidebar) */}
      {sidebarOpen && (
        <>
          {/* Overlay background */}
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
              background: 'rgba(0,0,0,0.5)', zIndex: 998, backdropFilter: 'blur(3px)'
            }}
          />
          
          {/* Sidebar Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, width: isMobile ? '100%' : 460, height: '100vh',
            background: c.sidebar, borderLeft: `1px solid ${c.border}`, zIndex: 999,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{ 
              padding: 20, 
              borderBottom: `1px solid ${c.border}`, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {editingJob ? '⚙️ Edit Job Details' : '✨ Create New Job'}
                </h3>
                <p style={{ fontSize: 11, color: c.subText, margin: '2px 0 0' }}>
                  {editingJob ? `Editing #JOB-${editingJob.id.substring(0,8).toUpperCase()}` : 'Define deliverables and queue priority.'}
                </p>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form area */}
            <form onSubmit={handleFormSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Customer selection */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                  Customer
                </label>
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleFormChange}
                  style={{
                    width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 8, color: c.text, fontSize: 13
                  }}
                  required
                >
                  <option value="" disabled>Select a customer</option>
                  {customers.map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.company ? `(${cust.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                  Job Title
                </label>
                <input 
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Redesign WordPress Website"
                  style={{
                    width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 8, color: c.text, fontSize: 13
                  }}
                  required
                />
              </div>

              {/* Grid 2 Cols: Category & Service */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Category
                  </label>
                  <select
                    value={isCustomCategory ? 'Custom' : formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setIsCustomCategory(true);
                        setFormData(prev => ({ ...prev, category: customCategoryText || 'Custom Category' }));
                      } else {
                        setIsCustomCategory(false);
                        setFormData(prev => ({ ...prev, category: val }));
                      }
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="Custom">Custom Category...</option>
                  </select>

                  {isCustomCategory && (
                    <input 
                      type="text"
                      placeholder="Enter custom category..."
                      value={customCategoryText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCategoryText(val);
                        setFormData(prev => ({ ...prev, category: val }));
                      }}
                      style={{
                        width: '100%', marginTop: 8, padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: 8, color: c.text, fontSize: 13
                      }}
                      required
                    />
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Service / Package
                  </label>
                  <input 
                    type="text"
                    name="service_package"
                    value={formData.service_package}
                    onChange={handleFormChange}
                    placeholder="e.g. Standard Hosting / SEO Pro"
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  />
                </div>
              </div>

              {/* Grid 2 Cols: Priority & Est. Start */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleFormChange}
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  >
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Estimated Start
                  </label>
                  <input 
                    type="text"
                    name="estimated_start"
                    value={formData.estimated_start}
                    onChange={handleFormChange}
                    placeholder="e.g. 3–5 Business Days"
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  />
                </div>
              </div>

              {/* Grid 2 Cols: Created Date & Queue Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Start Job Date
                  </label>
                  <input 
                    type="date"
                    name="created_date"
                    value={formData.created_date}
                    onChange={handleFormChange}
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Queue Position (Optional)
                  </label>
                  <input 
                    type="number"
                    name="queue_position"
                    value={formData.queue_position}
                    onChange={handleFormChange}
                    placeholder="Manually assign rank"
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  />
                </div>
              </div>

              {/* Grid 2 Cols: Status & Assignee */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  >
                    {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                    Assign To
                  </label>
                  <input 
                    type="text"
                    name="assign_to"
                    value={formData.assign_to}
                    onChange={handleFormChange}
                    placeholder="e.g. Web Team, Alex (Dev)"
                    style={{
                      width: '100%', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: 8, color: c.text, fontSize: 13
                    }}
                  />
                </div>
              </div>

              {/* Description Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>
                  Description / Deliverable Notes
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Outline the specifications of the project here..."
                  style={{
                    width: '100%', minHeight: 100, padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 8, color: c.text, fontSize: 13, resize: 'vertical'
                  }}
                />
              </div>

              {/* Send email notification */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                <input 
                  type="checkbox"
                  name="send_email_notification"
                  checked={formData.send_email_notification}
                  onChange={handleFormChange}
                  style={{ accentColor: c.brand, width: 16, height: 16 }}
                />
                <span>Send email notification to customer</span>
              </label>

              {/* Actions Footer */}
              <div style={{ 
                marginTop: 'auto', 
                display: 'flex', 
                gap: 12, 
                borderTop: `1px solid ${c.border}`, 
                paddingTop: 20 
              }}>
                <button 
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  style={{ 
                    flex: 1, padding: '10px 16px', background: 'none', border: `1px solid ${c.border}`, 
                    borderRadius: 8, color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ 
                    flex: 1, padding: '10px 16px', background: c.brand, border: 'none', 
                    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' 
                  }}
                >
                  {editingJob ? 'Save Changes' : 'Create Job'}
                </button>
              </div>

            </form>
          </div>
        </>
      )}
      
      {/* Dynamic Keyframe style for SlideIn animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </div>
  );
}
