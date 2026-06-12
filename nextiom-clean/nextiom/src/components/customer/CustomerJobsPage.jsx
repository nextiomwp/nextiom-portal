import React, { useState, useEffect } from 'react';
import { 
  Briefcase, CheckCircle, Clock, AlertCircle, FileText, 
  Upload, Check, ChevronRight, HelpCircle, ListTodo, MessageSquare, Info 
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { getCustomerJobs, getJobSettings, updateJob } from '@/lib/jobs';

export default function CustomerJobsPage({ user, c, isDark }) {
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Submit state for requirement
  const [submittingReqId, setSubmittingReqId] = useState(null);
  const [textInputVal, setTextInputVal] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    loadData();
    
    // Subscribe to realtime updates for jobs and job settings
    const channel = supabase
      .channel('customer-jobs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        () => {
          loadData();
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
          loadData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch settings first
      const settingsData = await getJobSettings();
      setSettings(settingsData);

      // Fetch customer's jobs (using the custom library)
      // Note: user.id here is the customer.id or user_id depending on how it was set up.
      // Let's make sure we pass customer profile ID.
      const customerId = user.id;
      const jobsData = await getCustomerJobs(customerId);
      setJobs(jobsData);

      if (jobsData.length > 0) {
        // Select first job by default if none selected or if previously selected is not in current list
        if (!selectedJob) {
          setSelectedJob(jobsData[0]);
        } else {
          const updatedSelected = jobsData.find(j => j.id === selectedJob.id);
          setSelectedJob(updatedSelected || jobsData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading jobs page:', error);
      toast({
        title: 'Error loading project queue',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload file to Supabase storage
  const handleFileUpload = async (e, job, reqId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setSubmittingReqId(reqId);
    
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `checklist/${user.id}/${job.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('request-documents')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('request-documents')
        .getPublicUrl(path);

      // Update the checklist item in the job
      const requirements = Array.isArray(job.customer_requirements) ? [...job.customer_requirements] : [];
      const updated = requirements.map(r => {
        if (r.id === reqId) {
          return { ...r, status: 'provided', value: publicUrl };
        }
        return r;
      });

      await updateJob(job.id, { customer_requirements: updated });
      toast({ title: 'Success', description: 'File uploaded and submitted successfully.' });
      loadData();
    } catch (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingFile(false);
      setSubmittingReqId(null);
    }
  };

  // Submit text input
  const handleTextSubmit = async (job, reqId) => {
    if (!textInputVal.trim()) return;

    try {
      const requirements = Array.isArray(job.customer_requirements) ? [...job.customer_requirements] : [];
      const updated = requirements.map(r => {
        if (r.id === reqId) {
          return { ...r, status: 'provided', value: textInputVal };
        }
        return r;
      });

      await updateJob(job.id, { customer_requirements: updated });
      toast({ title: 'Success', description: 'Information submitted.' });
      setTextInputVal('');
      setSubmittingReqId(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error saving info', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: c.subText }}>
        <Clock className="animate-spin text-orange-500" style={{ margin: '0 auto 10px' }} />
        Loading your projects and queue status...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div style={{ 
        background: c.card, 
        border: `1px solid ${c.border}`, 
        borderRadius: 12, 
        padding: 48, 
        textAlign: 'center', 
        maxWidth: 600, 
        margin: '40px auto' 
      }}>
        <Briefcase size={48} color={c.brand} style={{ margin: '0 auto 16px', opacity: 0.8 }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: c.text }}>No Active Projects</h3>
        <p style={{ fontSize: 14, color: c.subText, lineHeight: 1.5, marginBottom: 24 }}>
          You don't have any projects registered in the queue. Order a hosting plan, contact support, or request services to initiate a job queue item.
        </p>
      </div>
    );
  }

  // Calculate stats for widgets
  const activeJobsList = jobs.filter(j => j.status === 'Active');
  const waitingJobsList = jobs.filter(j => j.status === 'Waiting');
  
  // Sorting for queue position calculation
  // We need to calculate this based on all waiting jobs in the database
  // Let's approximate or use the job's position.
  // Wait, let's load all waiting jobs to calculate the position accurately!
  // But wait, the job object we loaded from supabase for customer includes their own jobs.
  // How do we find how many jobs are ahead of them?
  // Let's see: we can query the total waiting count or get their relative rank.
  // In `CustomerJobsPage` we can fetch the count of waiting jobs with created_date older than the customer's job, OR we can fetch their manual queue_position.
  // Let's implement a quick calculation:
  // If queue position mode is automatic:
  //   We can query `SELECT COUNT(*) FROM jobs WHERE status = 'Waiting' AND created_date < ?`
  // If manual:
  //   We use `job.queue_position`!
  // Let's do a quick query in useEffect or when selectedJob changes to get the count of jobs ahead!
  // That will show real accurate live position in the system.
  // Let's check how we can write a database query for this.
  // If the customer has a waiting job, we count how many waiting jobs in the system have an older created_date (if automatic) or a lower queue_position (if manual).
  // This is beautiful and extremely accurate! Let's write that.
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: c.text }}>
          <span style={{
            display: 'inline-block',
            width: 24,
            height: 24,
            backgroundColor: c.brand,
            WebkitMaskImage: "url('/on-progress.png')",
            maskImage: "url('/on-progress.png')",
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            flexShrink: 0
          }} /> Project Queue & Progress
        </h1>
        <p style={{ fontSize: 14, color: c.subText }}>Monitor your project's queue positioning, active workloads, and checklist requirements.</p>
      </div>

      {/* Multiple Job Selector tabs if customer has > 1 job */}
      {jobs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {jobs.map(job => {
            const isSelected = selectedJob?.id === job.id;
            return (
              <button
                key={job.id}
                onClick={() => { setSelectedJob(job); setSubmittingReqId(null); }}
                style={{
                  padding: '10px 16px',
                  background: isSelected ? c.brand : c.card,
                  color: isSelected ? '#fff' : c.text,
                  border: `1px solid ${isSelected ? c.brand : c.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{job.title}</span>
                <span style={{
                  fontSize: 10,
                  background: isSelected ? 'rgba(255,255,255,0.2)' : c.hover,
                  color: isSelected ? '#fff' : c.subText,
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  {job.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedJob && (() => {
        const job = selectedJob;
        
        // Find position and jobs ahead
        let positionStr = '-';
        let projectsAhead = 0;
        
        if (job.status === 'Waiting') {
          // If queue position mode is manual, we use the manual rank, or fallback to chronological
          // Let's fetch the actual position of this job in the system.
          // Wait, we can query how many jobs are ahead of it:
          // We can run a query to get this job's actual rank among all waiting jobs in the database!
          // Let's implement a dynamic state variable for queue position details:
          return <QueueDetailsContainer job={job} settings={settings} user={user} c={c} isDark={isDark} handleFileUpload={handleFileUpload} handleTextSubmit={handleTextSubmit} textInputVal={textInputVal} setTextInputVal={setTextInputVal} submittingReqId={submittingReqId} setSubmittingReqId={setSubmittingReqId} uploadingFile={uploadingFile} loadData={loadData} />;
        } else {
          return <QueueDetailsContainer job={job} settings={settings} user={user} c={c} isDark={isDark} handleFileUpload={handleFileUpload} handleTextSubmit={handleTextSubmit} textInputVal={textInputVal} setTextInputVal={setTextInputVal} submittingReqId={submittingReqId} setSubmittingReqId={setSubmittingReqId} uploadingFile={uploadingFile} loadData={loadData} />;
        }
      })()}
    </div>
  );
}

// Child container that handles fetching accurate relative queue positions
function QueueDetailsContainer({ 
  job, settings, user, c, isDark, 
  handleFileUpload, handleTextSubmit, textInputVal, setTextInputVal, 
  submittingReqId, setSubmittingReqId, uploadingFile, loadData 
}) {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [positionState, setPositionState] = useState({
    position: '-',
    ahead: 0,
    activeCount: 15,
    waitingCount: 20,
    loading: false
  });

  const defaultProgressSteps = [
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
  const progressSteps = Array.isArray(job.timeline_steps) ? job.timeline_steps : defaultProgressSteps;

  useEffect(() => {
    fetchRelativePosition();
  }, [job, settings]);

  const fetchRelativePosition = async () => {
    if (!settings) return;
    setPositionState(prev => ({ ...prev, loading: true }));
    try {
      // Get all active and waiting jobs to calculate positions relative to this customer's job via RPC to bypass RLS limits
      const { data: allJobs, error } = await supabase
        .rpc('get_queue_positions');
      
      if (error) throw error;

      const activeJobs = allJobs.filter(j => j.status === 'Active');
      const waitingJobs = allJobs.filter(j => j.status === 'Waiting');

      // Sort waiting jobs matching the mode
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

      const rankIndex = waitingJobs.findIndex(wj => wj.id === job.id);
      const calculatedPosition = rankIndex !== -1 ? rankIndex + 1 : '-';
      const projectsAhead = rankIndex !== -1 ? rankIndex : 0;

      // Active count is either manual override or real system active count
      const activeCount = settings.show_custom_active_jobs 
        ? settings.custom_active_jobs_count 
        : activeJobs.length;

      setPositionState({
        position: calculatedPosition !== '-' ? `#${calculatedPosition}` : '-',
        ahead: projectsAhead,
        activeCount: activeCount,
        waitingCount: waitingJobs.length,
        loading: false
      });
    } catch (e) {
      console.error('Error fetching relative queue position:', e);
      setPositionState(prev => ({ ...prev, loading: false }));
    }
  };

  const jobPriorityColor = job.priority === 'High' ? '#ef4444' : job.priority === 'Medium' ? '#f59e0b' : '#10b981';
  const displayQueue = settings?.display_queue_to_customers ?? true;
  
  if (!displayQueue) {
    return (
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
        <Info size={36} color={c.brand} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: c.text }}>Project Queue Temporarily Hidden</h3>
        <p style={{ fontSize: 13, color: c.subText }}>
          Our delivery queue tracking is currently hidden by the administrator. Rest assured your project is being processed. 
          Please check the checklist below or contact support for direct status updates.
        </p>
        
        {/* Render checklist and notes anyway */}
        <div style={{ marginTop: 24, textAlign: 'left' }}>
          {renderJobDetailsAndChecklist()}
        </div>
      </div>
    );
  }

  // Calculate Progress percentage
  // Total queue size = Active count + Waiting count
  const totalQueueSize = positionState.activeCount + positionState.waitingCount;
  
  // Progress bar logic:
  // If active, show 100% or high progress
  // If waiting, position determines progress. E.g. progress = (Total - Position) / Total
  // Let's create a beautiful custom progress bar representing where the customer's job is!
  let progressPercent = 100;
  if (job.status === 'Waiting' && typeof positionState.ahead === 'number') {
    const position = positionState.ahead + 1;
    // Projects ahead / Total waiting
    progressPercent = Math.max(5, Math.round(((totalQueueSize - position) / totalQueueSize) * 100));
  } else if (job.status === 'On Hold') {
    progressPercent = 30;
  } else if (job.status === 'Completed') {
    progressPercent = 100;
  }

  // Let's format progress characters like: [====================-------]
  const barLength = 30;
  const equalsCount = Math.round((progressPercent / 100) * barLength);
  const hyphenCount = Math.max(0, barLength - equalsCount);
  const progressBarText = `[${'='.repeat(equalsCount)}${'-'.repeat(hyphenCount)}]`;

  function renderJobDetailsAndChecklist() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        
        {/* Progress Stages Timeline */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: c.text }}>
            <Clock size={16} className="text-orange-500" /> Project Milestones
          </h4>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            position: 'relative',
            padding: '10px 0',
            overflowX: 'auto',
            gap: 12
          }}>
            {/* Connecting line */}
            <div style={{ 
              position: 'absolute', 
              top: 20, 
              left: '4%', 
              right: '4%', 
              height: 2, 
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              zIndex: 1 
            }} />
            <div style={{ 
              position: 'absolute', 
              top: 20, 
              left: '4%', 
              width: `${(job.progress_step / (progressSteps.length - 1)) * 92}%`, 
              height: 2, 
              background: c.brand,
              zIndex: 1,
              transition: 'width 0.3s'
            }} />

            {progressSteps.map((step, stepIdx) => {
              const isCompleted = stepIdx < job.progress_step;
              const isCurrent = stepIdx === job.progress_step;
              const isFuture = stepIdx > job.progress_step;

              let circleBg = isDark ? '#22252c' : '#e2e8f0';
              let circleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
              let circleContent = stepIdx + 1;
              let textColor = c.subText;

              if (isCompleted) {
                circleBg = '#10b981';
                circleBorder = '#10b981';
                circleContent = <Check size={12} color="#fff" />;
                textColor = '#10b981';
              } else if (isCurrent) {
                circleBg = '#f59e0b';
                circleBorder = '#f59e0b';
                circleContent = <Clock size={12} color="#fff" />;
                textColor = '#f59e0b';
              }

              return (
                <div key={stepIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2, minWidth: 70, textAlign: 'center' }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    background: circleBg, 
                    border: `2px solid ${circleBorder}`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 10, 
                    fontWeight: 700,
                    color: isCurrent || isCompleted ? '#fff' : c.subText,
                    marginBottom: 6,
                    boxShadow: isCurrent ? '0 0 8px rgba(245,158,11,0.4)' : 'none'
                  }}>
                    {circleContent}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 500, color: textColor, maxWidth: 85 }}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Checklist + Admin Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, gridTemplateRows: 'auto' }}>
          
          {/* Information checklist */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: c.text }}>
              <ListTodo size={16} className="text-orange-500" /> Information Required From You
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {!job.customer_requirements || job.customer_requirements.length === 0 ? (
                <div style={{ fontSize: 12, color: c.subText, fontStyle: 'italic', padding: '10px 0' }}>
                  No required actions or uploads requested at this time.
                </div>
              ) : (
                job.customer_requirements.map(req => {
                  const isSubmitted = req.status === 'provided' || req.status === 'completed';
                  const isSubmitting = submittingReqId === req.id;

                  return (
                    <div 
                      key={req.id} 
                      style={{ 
                        border: `1px solid ${c.border}`, 
                        borderRadius: 8, 
                        padding: 12, 
                        background: isSubmitted ? (isDark ? 'rgba(16,185,129,0.03)' : 'rgba(16,185,129,0.01)') : c.bg 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{req.title}</div>
                          <div style={{ fontSize: 10, color: c.subText, marginTop: 2 }}>
                            Requirement: {req.type === 'upload' ? 'Upload document/asset' : 'Provide text details'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          background: isSubmitted ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: isSubmitted ? '#10b981' : '#f59e0b',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {isSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </div>

                      {/* Interactive inputs */}
                      {!isSubmitted && (
                        <div style={{ marginTop: 10, borderTop: `1px solid ${c.border}`, paddingTop: 10 }}>
                          
                          {/* File Uploader */}
                          {req.type === 'upload' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <label style={{
                                background: c.brand, color: '#fff', padding: '6px 12px', borderRadius: 6,
                                fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                              }}>
                                <Upload size={12} />
                                {uploadingFile && isSubmitting ? 'Uploading...' : 'Upload File'}
                                <input 
                                  type="file" 
                                  onChange={e => handleFileUpload(e, job, req.id)}
                                  disabled={uploadingFile}
                                  style={{ display: 'none' }} 
                                />
                              </label>
                              <span style={{ fontSize: 10, color: c.subText }}>Image, PDF, zip, docx, etc.</span>
                            </div>
                          )}

                          {/* Text input */}
                          {req.type === 'text' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <textarea
                                value={isSubmitting ? textInputVal : ''}
                                onChange={e => { setSubmittingReqId(req.id); setTextInputVal(e.target.value); }}
                                placeholder="Type the requested details here..."
                                style={{
                                  width: '100%', padding: '6px 10px', background: c.bg, border: `1px solid ${c.border}`,
                                  borderRadius: 6, color: c.text, fontSize: 12, minHeight: 60, resize: 'none'
                                }}
                              />
                              <button
                                onClick={() => handleTextSubmit(job, req.id)}
                                disabled={!textInputVal.trim()}
                                style={{
                                  alignSelf: 'flex-end', background: c.brand, color: '#fff', border: 'none',
                                  padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                }}
                              >
                                Submit Details
                              </button>
                            </div>
                          )}

                        </div>
                      )}

                      {/* Submitted Value overview */}
                      {isSubmitted && req.value && (
                        <div style={{ 
                          marginTop: 8, padding: '6px 10px', background: c.hover, borderRadius: 6, 
                          fontSize: 12, wordBreak: 'break-all', borderLeft: `2px solid ${c.brand}` 
                        }}>
                          {req.type === 'upload' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={12} className="text-orange-500" />
                              <a href={req.value} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: c.text, fontWeight: 500 }}>
                                View Submitted Document
                              </a>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 10, color: c.subText }}>Submitted Text:</div>
                              <div style={{ fontStyle: 'italic', marginTop: 2, color: c.text }}>"{req.value}"</div>
                            </div>
                          )}
                          
                          {/* Re-submit option */}
                          <button
                            onClick={() => {
                              // Reset checklist requirement value to trigger input show
                              const requirements = Array.isArray(job.customer_requirements) ? [...job.customer_requirements] : [];
                              const updated = requirements.map(r => r.id === req.id ? { ...r, status: 'pending', value: '' } : r);
                              updateJob(job.id, { customer_requirements: updated }).then(() => loadData());
                            }}
                            style={{
                              background: 'none', border: 'none', color: c.brand, fontSize: 10, 
                              fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 6, display: 'block'
                            }}
                          >
                            Re-submit / Edit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Job Queue Information (Customer View Notes) */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: c.text }}>
              <MessageSquare size={16} className="text-orange-500" /> Notes from Project Team
            </h4>
            <div style={{ 
              flex: 1, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, 
              padding: 14, fontSize: 12, lineHeight: 1.6, color: c.text, minHeight: 120
            }}>
              {job.customer_view_notes ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{job.customer_view_notes}</div>
              ) : (
                <div style={{ color: c.subText, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'center' }}>
                  No messages posted for this project yet. Check back later for updates.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* 2. What Customers See — Job Queue Status Widget */}
      <div style={{ 
        background: `linear-gradient(135deg, ${c.card} 0%, ${isDark ? '#22252c' : '#fcfcfc'} 100%)`, 
        border: `1px solid ${c.borderStrong}`, 
        borderRadius: 16, 
        padding: 24,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${c.border}`, paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: c.brand, textTransform: 'uppercase' }}>
              YOUR PROJECT QUEUE STATUS
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0', color: c.text }}>{job.title}</h3>
            {job.assign_to && job.assign_to !== 'None' && job.assign_to.trim() !== '' && (
              <div style={{ fontSize: 12, color: c.subText, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: c.brand }} />
                <span>Assigned to: <strong style={{ color: c.text }}>{job.assign_to}</strong></span>
              </div>
            )}
            {job.created_date && (
              <div style={{ fontSize: 12, color: c.subText, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: c.brand }} />
                <span>Job Start Date: <strong style={{ color: c.text }}>{new Date(job.created_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
              </div>
            )}
          </div>
          
          <span style={{ 
            color: job.status === 'Active' ? '#10b981' : job.status === 'Waiting' ? '#3b82f6' : '#f59e0b',
            background: job.status === 'Active' ? 'rgba(16,185,129,0.1)' : job.status === 'Waiting' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
            padding: '4px 12px', 
            borderRadius: 8, 
            fontSize: 12, 
            fontWeight: 700 
          }}>
            {job.status}
          </span>
        </div>

        {/* Metrics Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
          gap: 16, 
          marginBottom: 24 
        }}>
          
          {/* Metric 1: Your Position */}
          {settings?.display_queue_position && (
            <div style={{ background: c.bg, padding: 16, borderRadius: 10, border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 11, color: c.subText, fontWeight: 500 }}>YOUR POSITION</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.text, marginTop: 4 }}>
                {job.status === 'Waiting' ? positionState.position : 'Active'}
              </div>
            </div>
          )}

          {/* Metric 2: Projects Ahead */}
          {settings?.display_queue_position && (
            <div style={{ background: c.bg, padding: 16, borderRadius: 10, border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 11, color: c.subText, fontWeight: 500 }}>PROJECTS AHEAD</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.text, marginTop: 4 }}>
                {job.status === 'Waiting' ? positionState.ahead : 0}
              </div>
            </div>
          )}

          {/* Metric 3: Active Jobs */}
          {settings?.display_active_job_count && (
            <div style={{ background: c.bg, padding: 16, borderRadius: 10, border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 11, color: c.subText, fontWeight: 500 }}>ACTIVE WORKLOAD</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.brand, marginTop: 4 }}>
                {positionState.activeCount} Jobs
              </div>
            </div>
          )}

          {/* Metric 4: Est. Start */}
          <div style={{ background: c.bg, padding: 16, borderRadius: 10, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 11, color: c.subText, fontWeight: 500 }}>ESTIMATED START</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981', marginTop: 6, display: 'flex', alignItems: 'center' }}>
              {job.estimated_start || '3–5 days'}
            </div>
          </div>

        </div>

        {/* Queue Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.subText, marginBottom: 8 }}>
            <span>Queue Progress Tracker</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{progressBarText} {progressPercent}%</span>
          </div>
          
          <div style={{ width: '100%', height: 8, background: c.bg, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: c.brand, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: c.subText }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.brand }} />
              {positionState.activeCount} Active Jobs
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              {positionState.waitingCount} Waiting
            </span>
          </div>
        </div>

      </div>

      {/* Checklist, progress tracker, and notes details */}
      {renderJobDetailsAndChecklist()}

    </div>
  );
}
