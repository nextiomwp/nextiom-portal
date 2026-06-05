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

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(null);
  const { signIn, user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role === 'admin') {
      navigate('/admin-dashboard');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Authentication Failed",
        description: error,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
       if (data.user?.app_metadata?.role !== 'admin') {
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
                  <Label htmlFor="password">Password</Label>
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