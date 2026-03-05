import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';

function Login({ onLoginSuccess }) {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn, user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setEmail('');
    setPassword('');
    setIsLoading(false);
    setShowPassword(false);
  }, [showAdminLogin]);

  useEffect(() => {
    if (user) {
      if (role === 'admin') navigate('/admin-dashboard');
      else navigate('/customer-dashboard');
    }
  }, [user, role, navigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setShowAdminLogin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getErrorMessage = (error) => {
    const msg = typeof error === 'string' ? error : error?.message || '';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
      return 'Please check your email inbox and click the confirmation link before logging in.';
    }
    if (msg.includes('Too many requests')) {
      return 'Too many login attempts. Please wait a few minutes and try again.';
    }
    return msg || 'Something went wrong. Please try again.';
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Login Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
      if (onLoginSuccess) onLoginSuccess();
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Authentication Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (data.user?.user_metadata?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "This portal is restricted to administrative staff only.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Admin Access Granted",
      description: "Welcome to the Nextiom Admin Portal.",
      className: "bg-emerald-50 border-emerald-200 text-emerald-800",
    });
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <>
      <Helmet>
        <title>{showAdminLogin ? "Admin Portal" : "Login"} - Nextiom</title>
        <meta name="description" content="Sign in to your Nextiom account" />
      </Helmet>

      <div className={cn(
        "min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-500 ease-in-out",
        showAdminLogin ? "bg-slate-100" : "bg-white"
      )}>
        <AnimatePresence mode="wait">
          {showAdminLogin ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-w-[400px]"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF8C42] to-red-500" />
                <button 
                  onClick={() => setShowAdminLogin(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center">
                  <div className="bg-orange-50 p-3 rounded-full mb-4">
                    <ShieldCheck className="w-8 h-8 text-[#FF8C42]" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#1a1a1a]">Admin Portal</h1>
                  <p className="text-slate-500 text-sm mt-2 font-medium">Restricted System Access</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email" className="text-sm font-medium text-[#1a1a1a]">Admin Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="admin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter admin email"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password" className="text-sm font-medium text-[#1a1a1a]">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="admin-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42] focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#1a1a1a] hover:bg-slate-800 text-white font-semibold h-11 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Sign In</span>
                      </div>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="customer"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-w-[400px] space-y-8"
            >
              <div className="flex flex-col items-center">
                <img 
                  src="https://horizons-cdn.hostinger.com/147148b5-9ad3-49b5-a69f-decad9e9a152/c4356b200db1f138597a66d14c006177.jpg"
                  alt="Nextiom"
                  className="h-10 w-auto object-contain mb-8"
                />
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold text-[#1a1a1a]">Sign in to your account</h1>
                  <p className="text-slate-500 text-sm">Welcome back! Please enter your details.</p>
                </div>
              </div>

              <form onSubmit={handleCustomerLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-[#1a1a1a]">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-sm font-medium text-[#1a1a1a]">Password</Label>
                      <a href="#" className="text-xs font-medium text-[#FF8C42] hover:text-[#e67e3b] transition-colors">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#FF8C42] hover:bg-[#e67e3b] text-white font-semibold h-11 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <span className="text-sm text-slate-500">Don't have an account? </span>
                  <Link to="/register" className="text-sm font-medium text-[#FF8C42] hover:text-[#e67e3b] transition-colors">
                    Register
                  </Link>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="fixed bottom-6 text-center text-xs text-slate-400">
          © 2026 Nextiom Inc. All rights reserved.
        </div>
      </div>
    </>
  );
}

export default Login;