import React, { useState, useEffect } from 'react';
import { Building, Phone, Mail, MapPin, CheckCircle2, Shield, Heart, Users, Sparkles, Send, Code, Wrench, Zap, Search, ArrowUpCircle, ShieldAlert, Smartphone, Palette, Award, Star, Check, HelpCircle, Info, Globe, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addNotification, getCompanyInfoSections } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

const IconMap = {
  Building, Phone, Mail, MapPin, CheckCircle2, Shield, Heart, Users, Sparkles,
  Send, Code, Wrench, Zap, Search, ArrowUpCircle, ShieldAlert, Smartphone, Palette,
  Award, Star, Check, HelpCircle, Info, Globe, Settings
};

const getIcon = (iconName, fallbackIcon = Sparkles) => {
  if (!iconName) return fallbackIcon;
  const IconComponent = IconMap[iconName] || fallbackIcon;
  return IconComponent;
};

export function CompanyInfoPage({ isDark = false, c = {} }) {
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || 'var(--brand-color)';
  const brandLight = c.brandLight || 'var(--brand-color-light)';
  const cardBg = isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)';

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await getCompanyInfoSections();
      setSections(data);
    } catch (err) {
      console.error('Failed to load company info sections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('company_info_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_info_sections' }, () => { loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 20,
    padding: 24,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: `2px solid ${brand}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  const aboutTextSections = sections.filter(s => s.category === 'about_text');
  const aboutFeatureSections = sections.filter(s => s.category === 'about_feature');
  const corePillarSections = sections.filter(s => s.category === 'core_pillar');
  const serviceSections = sections.filter(s => s.category === 'service');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
      {/* Header */}
      <div>
        <h1 style={{ color: text, fontSize: 24, fontWeight: 800, margin: 0 }}>Company Information</h1>
        <p style={{ color: subText, fontSize: 13, marginTop: 4, margin: 0 }}>Learn more about Nextiom, our values, and our mission.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Company Info */}
        <div className="lg:col-span-2" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building style={{ width: 16, height: 16, color: brand }} />
            </div>
            <h2 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>About NEXTIOM</h2>
          </div>
          
          {aboutTextSections.length === 0 ? (
            <p style={{ color: subText, fontSize: 14, fontStyle: 'italic', marginBottom: 16 }}>No about text content available.</p>
          ) : (
            aboutTextSections.map((s, idx) => (
              <p key={s.id || idx} style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                {s.description}
              </p>
            ))
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, borderTop: `1px solid ${border}`, paddingTop: 20 }}>
            {aboutFeatureSections.map((v, i) => {
              const Icon = getIcon(v.icon, Shield);
              return (
                <div key={v.id || i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon style={{ width: 16, height: 16, color: brand }} />
                    <span style={{ color: text, fontSize: 13, fontWeight: 700 }}>{v.title}</span>
                  </div>
                  <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Values & Core Pillars */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: 16, height: 16, color: brand }} />
            </div>
            <h2 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>Core Pillars</h2>
          </div>

          <p style={{ color: subText, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            At the heart of Nextiom is a set of principles that direct our technology stack and support operations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            {corePillarSections.map((p, idx) => {
              const Icon = getIcon(p.icon, CheckCircle2);
              return (
                <div key={p.id || idx} style={{ display: 'flex', gap: 12 }}>
                  <Icon style={{ width: 18, height: 18, color: brand, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h3 style={{ color: text, fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}>{p.title}</h3>
                    <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{p.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles style={{ width: 16, height: 16, color: brand }} />
          </div>
          <h2 style={{ color: text, fontSize: 18, fontWeight: 800, margin: 0 }}>Our Services</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {serviceSections.map((s, idx) => {
            const Icon = getIcon(s.icon, Code);
            return (
              <div
                key={s.id || idx}
                style={{
                  ...cardStyle,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'transform 0.2s, border-color 0.2s',
                  cursor: 'default'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = brand;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = border;
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 18, height: 18, color: brand }} />
                </div>
                <div>
                  <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 6px 0' }}>{s.title}</h3>
                  <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ContactDetailsPage({ user, isDark = false, c = {} }) {
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || 'var(--brand-color)';
  const brandLight = c.brandLight || 'var(--brand-color-light)';
  const cardBg = isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)';

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 20,
    padding: 24,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
      {/* Header */}
      <div>
        <h1 style={{ color: text, fontSize: 24, fontWeight: 800, margin: 0 }}>Contact Information</h1>
        <p style={{ color: subText, fontSize: 13, marginTop: 4, margin: 0 }}>Get in touch with us. We are always ready to support you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Phone Support */}
        <div style={{ ...cardStyle, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone style={{ width: 20, height: 20, color: brand }} />
          </div>
          <div>
            <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 4px 0' }}>Phone Support</h3>
            <p style={{ color: text, fontSize: 15, fontWeight: 800, margin: '0 0 4px 0' }}>+94 70 203 2323</p>
            <p style={{ color: subText, fontSize: 12, margin: 0, lineHeight: 1.4 }}>Available Monday – Friday (9:00 AM – 6:00 PM)</p>
          </div>
        </div>

        {/* Email Address */}
        <div style={{ ...cardStyle, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail style={{ width: 20, height: 20, color: brand }} />
          </div>
          <div>
            <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 4px 0' }}>Email Address</h3>
            <p style={{ color: text, fontSize: 15, fontWeight: 800, margin: '0 0 4px 0' }}>info@nextiom.com</p>
            <p style={{ color: subText, fontSize: 12, margin: 0, lineHeight: 1.4 }}>We reply to general inquiries within 24 hours</p>
          </div>
        </div>

        {/* Corporate Office */}
        <div style={{ ...cardStyle, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin style={{ width: 20, height: 20, color: brand }} />
          </div>
          <div>
            <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 4px 0' }}>Corporate Office</h3>
            <p style={{ color: text, fontSize: 14, fontWeight: 800, margin: '0 0 4px 0' }}>Niwandama, Ja Ela – 11350</p>
            <p style={{ color: subText, fontSize: 12, margin: 0, lineHeight: 1.4 }}>Sri Lanka</p>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <p style={{ color: subText, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          Need urgent support? Log in to the portal and create a support ticket directly from the <strong>Support</strong> menu.
        </p>
      </div>
    </div>
  );
}
