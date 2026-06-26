import React, { useState } from 'react';
import { Building, Phone, Mail, MapPin, CheckCircle2, Shield, Heart, Users, Sparkles, Send, Code, Wrench, Zap, Search, ArrowUpCircle, ShieldAlert, Smartphone, Palette } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addNotification } from '@/lib/storage';

export function CompanyInfoPage({ isDark = false, c = {} }) {
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
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            We are perfect in an innovative online marketing solution.
            We are warmly welcome to you the useful online service website. We are hoping to create the
            best service and fulfil customer needs, and wants. NEXTIOM is a full service- graphic design, web designing & developing print design, and much more for each of our clients based on their needs and goals.
          </p>
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            We believe in the importance of improving the online services, which is why we established
            NEXTIOM in three years ago. Our credibility and excellent service built satisfaction of 1000+ valued consumers. Just over a year ago, we had insured capacious victory and earned a lot of satisfying potential customers.
          </p>
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            NEXTIOM has a great team, and which has uncanny ability to understand what objective customers are trying to achieve in the project. Our team has also worked to develop good imitation by creating proper communication and business ethics. We accept graphic/web design & developing, content marketing, presentation, or every high-impact task around the world.
          </p>
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Want an opportunity to achieve the best and profitable business owner? Are you not aware of
            how to create the best path with the premium website to your business? NEXTIOM online service is ready to assist you at any time.
          </p>
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            We plan everything with our clients, and we create it as their performance. Our valued customers who have driven us so far.
            At nextiom we have a theme, “Our clients are always our top precedence.”
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, borderTop: `1px solid ${border}`, paddingTop: 20 }}>
            {[
              { icon: Shield, title: 'Secure By Design', desc: 'Enterprise-grade firewalls, isolated systems, and continuous monitoring.' },
              { icon: Heart, title: 'Customer First', desc: 'Uncompromised focus on user experience, stability, and round-the-clock assistance.' },
              { icon: Users, title: 'Trusted Globally', desc: 'Powering thousands of domain names, custom corporate emails, and websites.' }
            ].map((v, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <v.icon style={{ width: 16, height: 16, color: brand }} />
                  <span style={{ color: text, fontSize: 13, fontWeight: 700 }}>{v.title}</span>
                </div>
                <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
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
            {[
              {
                title: 'Reliable Infrastructure',
                desc: 'Our hosting networks operate on high-grade servers with multi-homed carrier networks, assuring maximum uptime and high availability.'
              },
              {
                title: '24/7 Customer Support',
                desc: 'Our technical support personnel are available round-the-clock to assist with DNS setup, mail server configuration, and hosting optimization.'
              },
              {
                title: 'Secure & Scalable Solutions',
                desc: 'Grow your resources dynamically as your business demands expand, without complex migrations or lengthy deployment delays.'
              }
            ].map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12 }}>
                <CheckCircle2 style={{ width: 18, height: 18, color: brand, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ color: text, fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}>{p.title}</h3>
                  <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
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
          {[
            { icon: Code, title: 'Custom Development', desc: 'Tailored web solutions built with cutting-edge tech stacks to meet your exact workflow requirements.' },
            { icon: Wrench, title: 'WordPress Maintenance', desc: 'Continuous updates, plugin audits, database optimization, and core stability management.' },
            { icon: Zap, title: 'WordPress Speed', desc: 'Aggressive caching, asset optimization, database pruning, and Core Web Vitals acceleration.' },
            { icon: Search, title: 'SEO Optimization', desc: 'Strategic keyword targeting, schema markup, technical audit, and organic search engine growth.' },
            { icon: ArrowUpCircle, title: 'Site Upgrade', desc: 'Seamless migration, modernization of outdated systems, and framework version transitions.' },
            { icon: ShieldAlert, title: 'Malware Removal', desc: 'Comprehensive exploit auditing, virus cleanup, vulnerability patching, and security hardening.' },
            { icon: Smartphone, title: 'App Development', desc: 'Native-feeling cross-platform mobile apps for iOS and Android built on robust frameworks.' },
            { icon: Palette, title: 'Graphic Design', desc: 'High-impact UI/UX branding, vector logo creations, marketing mockups, and corporate media assets.' }
          ].map((s, idx) => (
            <div
              key={idx}
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
                <s.icon style={{ width: 18, height: 18, color: brand }} />
              </div>
              <div>
                <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 6px 0' }}>{s.title}</h3>
                <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
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
