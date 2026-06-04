import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, KeyRound, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { AUTH_ERRORS } from '@/lib/authErrors';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { addNotification } from '@/lib/storage';

function RegisterPage() {
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const inputCls = (field) => cn(
    "w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 transition-all",
    errors[field] ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-[#FF8C42]"
  );

  const validateForm = () => {
    const newErrors = {};
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.password) newErrors.password = "Password is required";
    else if (!passwordRegex.test(formData.password)) newErrors.password = AUTH_ERRORS.WEAK_PASSWORD;
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = AUTH_ERRORS.PASSWORD_MISMATCH;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName, phone: formData.phone } }
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Failed to create account.' });
      } else {
        setStep('otp');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 8) { setOtpError('Please enter the 8-digit code.'); return; }
    setIsLoading(true);
    setOtpError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: formData.email, token: otp, type: 'signup' });
      if (error) {
        setOtpError('Wrong OTP. Please try again.');
      } else {
        const { error: profileErr } = await supabase
          .from('customers')
          .update({ status: 'active', name: formData.fullName, phone: formData.phone })
          .eq('user_id', data.user.id);

        if (profileErr) {
          console.error('Failed to activate customer profile:', profileErr);
          const { error: insertErr } = await supabase.from('customers').insert([{
            user_id: data.user.id,
            email: formData.email,
            name: formData.fullName,
            phone: formData.phone,
            status: 'active',
            created_at: new Date().toISOString()
          }]);
          if (insertErr) {
            console.error('Fallback insert also failed:', insertErr);
            toast({
              variant: 'destructive',
              title: 'Profile Setup Failed',
              description: 'Account created but profile could not be saved. Contact support.'
            });
          }
        } else {
          addNotification({
            customer_id: null,
            type: 'new_registration',
            title: `New Customer: ${formData.fullName}`,
            message: `${formData.email} just registered on the portal.`,
          }).catch(() => {});
        }
        navigate('/customer-dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: formData.email });
    setIsLoading(false);
    toast(error
      ? { variant: 'destructive', description: error.message || 'Failed to resend.' }
      : { description: `Verification code resent to ${formData.email}` }
    );
  };

  const logo = (
    <img
      src="/nextiomLogo.png"
      alt="Nextiom" className="h-10 w-auto object-contain mx-auto mb-6"
    />
  );

  if (step === 'otp') {
    return (
      <>
        <Helmet><title>Verify Email - Nextiom</title></Helmet>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[440px]">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
              <div className="text-center space-y-2">
                {logo}
                <div className="flex items-center justify-center w-14 h-14 bg-[#FF8C42]/10 rounded-full mx-auto mb-3">
                  <KeyRound className="w-7 h-7 text-[#FF8C42]" />
                </div>
                <h1 className="text-2xl font-bold text-[#1a1a1a]">Verify your email</h1>
                <p className="text-slate-500 text-sm">
                  Enter the 6-digit code sent to<br />
                  <span className="font-medium text-[#1a1a1a]">{formData.email}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                    className={cn(
                      "w-full text-center py-3 bg-white border rounded-lg text-2xl font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 transition-all",
                      otpError ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-[#FF8C42]"
                    )}
                    placeholder="________"
                    autoFocus
                  />
                  {otpError && <p className="text-xs text-red-500 text-center font-medium">{otpError}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 8}
                  className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /><span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Verify & Create Account</span><ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>

                <div className="text-center space-y-2 pt-1">
                  <p className="text-sm text-slate-500">
                    Didn't receive it?{' '}
                    <button type="button" onClick={handleResend} disabled={isLoading} className="text-[#FF8C42] font-medium hover:text-[#e67e3b] transition-colors disabled:opacity-50">
                      Resend code
                    </button>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setOtp(''); setOtpError(''); }}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to registration
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Register - Nextiom</title>
        <meta name="description" content="Create your Nextiom account" />
      </Helmet>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[480px]">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
            <div className="text-center space-y-2">
              {logo}
              <h1 className="text-2xl font-bold text-[#1a1a1a]">Create an account</h1>
              <p className="text-slate-500 text-sm">Start managing your digital services today.</p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input id="fullName" type="text" value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={inputCls('fullName')} placeholder="John Doe" />
                </div>
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input id="phone" type="tel" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputCls('phone')} placeholder="+94 77 123 4567" />
                </div>
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input id="email" type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputCls('email')} placeholder="you@example.com" />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input id="password" type={showPassword ? 'text' : 'password'} value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={cn(inputCls('password'), 'pr-10')} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={cn(inputCls('confirmPassword'), 'pr-10')} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md">
                Password must have at least 8 characters, one uppercase letter, one number, and one special character.
              </div>

              {(errors.password || errors.confirmPassword) && (
                <p className="text-xs text-red-500 text-center">{errors.password || errors.confirmPassword}</p>
              )}

              <Button type="submit" disabled={isLoading}
                className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg transition-all shadow-sm hover:shadow-md mt-2">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /><span>Sending code...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Continue</span><ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>

              <div className="text-center pt-2">
                <span className="text-sm text-slate-500">Already have an account? </span>
                <Link to="/" className="text-sm font-medium text-[#FF8C42] hover:text-[#e67e3b] transition-colors">Sign in</Link>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default RegisterPage;
