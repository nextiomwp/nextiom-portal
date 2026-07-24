import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Lock, ShieldCheck, Loader2, TriangleAlert, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { getMaintenanceStatus } from '@/lib/storage';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP, 3 = New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(null);
  const { signIn, user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (role === 'admin') navigate('/admin-dashboard');
      else if (role === 'moderator') navigate('/moderator-dashboard');
    }
  }, [user, role, navigate]);

  // Check maintenance mode
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getMaintenanceStatus();
        if (mounted && status.active) {
          setMaintenance(status);
        }
      } catch (err) {
        console.error('Failed to check maintenance status:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setTimeout(() => {
      setForgotCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [forgotCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: forgotEmail.trim(),
        options: {
          shouldCreateUser: false,
        }
      });
      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "A 6-digit OTP code has been sent to your registered email.",
      });
      setForgotStep(2);
      setForgotCooldown(60);
    } catch (err) {
      toast({
        title: "Failed to Send OTP",
        description: err.description || err.message || err,
        variant: "destructive"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpToken.trim()) return;
    setForgotLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: otpToken.trim(),
        type: 'email'
      });
      if (error) throw error;

      const userRole = data.user?.app_metadata?.role;
      if (userRole !== 'admin' && userRole !== 'moderator') {
        await supabase.auth.signOut();
        throw new Error("Access Denied: You are not authorized to reset password here.");
      }

      toast({
        title: "OTP Verified",
        description: "Identity verified. Please set your new password.",
      });
      setForgotStep(3);
    } catch (err) {
      toast({
        title: "Verification Failed",
        description: err.description || err.message || err,
        variant: "destructive"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Validation Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Validation Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset successful! You are now logged in.",
      });

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userRole = currentUser?.app_metadata?.role;
      if (userRole === 'admin') navigate('/admin-dashboard');
      else if (userRole === 'moderator') navigate('/moderator-dashboard');
      else navigate('/');
    } catch (err) {
      toast({
        title: "Reset Failed",
        description: err.description || err.message || err,
        variant: "destructive"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Authentication Failed",
        description: error.description || error.message || error,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
       const userRole = data.user?.app_metadata?.role;
       if (userRole !== 'admin' && userRole !== 'moderator') {
          toast({
            title: "Access Denied",
            description: "You are not authorized to access the admin portal.",
            variant: "destructive"
          });
          setIsLoading(false);
       } else {
          // Success handled by useEffect
       }
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Portal - Nextiom</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8">
            {showForgotPassword ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full mb-4">
                    <ShieldCheck className="w-4 h-4 text-[#FF8C42]" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">OTP Account Recovery</span>
                  </div>
                  <h1 className="text-xl font-bold text-[#1a1a1a]">
                    {forgotStep === 1 && "Forgot Password"}
                    {forgotStep === 2 && "Enter OTP Verification"}
                    {forgotStep === 3 && "Set New Password"}
                  </h1>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    {forgotStep === 1 && "Enter your registered staff email address to receive a one-time verification code."}
                    {forgotStep === 2 && `We sent a 6-digit verification code to ${forgotEmail}.`}
                    {forgotStep === 3 && "Choose a strong password of at least 6 characters."}
                  </p>
                </div>

                {forgotStep === 1 && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Registered Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="moderator@nextiom.com"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={forgotLoading || !forgotEmail}
                      className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg"
                    >
                      {forgotLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending OTP...</span>
                        </div>
                      ) : (
                        <span>Send OTP Code</span>
                      )}
                    </Button>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-code">One-Time Password (OTP)</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="otp-code"
                          type="text"
                          maxLength={6}
                          value={otpToken}
                          onChange={(e) => setOtpToken(e.target.value)}
                          placeholder="Enter 6-digit code"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] tracking-widest text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={forgotLoading || otpToken.length !== 6}
                      className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg"
                    >
                      {forgotLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Verifying OTP...</span>
                        </div>
                      ) : (
                        <span>Verify OTP</span>
                      )}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        disabled={forgotCooldown > 0 || forgotLoading}
                        onClick={handleSendOtp}
                        className="text-xs text-[#FF8C42] hover:underline disabled:opacity-55"
                      >
                        {forgotCooldown > 0 ? `Resend code in ${forgotCooldown}s` : "Resend OTP Code"}
                      </button>
                    </div>
                  </form>
                )}

                {forgotStep === 3 && (
                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-pwd">New Password</Label>
                        <input
                          id="new-pwd"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-pwd">Confirm New Password</Label>
                        <input
                          id="confirm-pwd"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg"
                    >
                      {forgotLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving Password...</span>
                        </div>
                      ) : (
                        <span>Save & Sign In</span>
                      )}
                    </Button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotStep(1);
                      setForgotEmail('');
                      setOtpToken('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center">
                  <img 
                    src="https://horizons-cdn.hostinger.com/147148b5-9ad3-49b5-a69f-decad9e9a152/c4356b200db1f138597a66d14c006177.jpg"
                    alt="Nextiom"
                    className="h-8 w-auto object-contain mb-6"
                  />
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full mb-4">
                    <ShieldCheck className="w-4 h-4 text-[#FF8C42]" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Restricted Access</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#1a1a1a]">Admin Portal</h1>
                </div>

                {maintenance?.active && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <p className="text-xs font-bold text-orange-800">Maintenance Mode Active</p>
                    </div>
                    <p className="text-xs text-orange-700">{maintenance.message}</p>
                    {maintenance.expectedDowntime && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <Clock className="w-3 h-3" />
                        <span>Expected downtime: {maintenance.expectedDowntime}</span>
                      </div>
                    )}
                    <p className="text-xs text-orange-600 font-medium mt-1">Only administrators can log in during maintenance.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Administrator Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@nextiom.com"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(true);
                            setForgotEmail(email);
                            setForgotStep(1);
                          }}
                          className="text-xs text-[#FF8C42] hover:underline bg-transparent border-none cursor-pointer p-0"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <span>Admin Sign In</span>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
          
          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-slate-500 hover:text-[#1a1a1a] transition-colors">
              Return to Customer Login
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default AdminLogin;