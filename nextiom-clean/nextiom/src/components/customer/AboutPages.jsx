import React, { useState } from 'react';
import { Building, Phone, Mail, MapPin, CheckCircle2, Shield, Heart, Users, Sparkles, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addNotification } from '@/lib/storage';

export function CompanyInfoPage({ isDark = false, c = {} }) {
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
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
        {/* Left Column: Who We Are */}
        <div className="lg:col-span-2" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building style={{ width: 16, height: 16, color: brand }} />
            </div>
            <h2 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>Who We Are</h2>
          </div>
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Nextiom is a premier provider of internet infrastructure and digital enablement solutions. We specialize in high-performance cloud hosting, secure domain registration, professional business email setups, and custom digital services designed to empower modern enterprises.
          </p>
          <p style={{ color: text, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Since our inception, our mission has been to build robust and scalable digital environments for businesses of all sizes. By combining state-of-the-art server infrastructure with an intuitive customer-focused management portal, we help our clients focus on growth while we handle the complexity of hosting and web management.
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
    </div>
  );
}

export function ContactDetailsPage({ user, isDark = false, c = {} }) {
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';
  const cardBg = isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 20,
    padding: 24,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!subject.trim()) { toast({ title: 'Please enter a subject', variant: 'destructive' }); return; }
    if (!message.trim()) { toast({ title: 'Please enter a message', variant: 'destructive' }); return; }

    setIsSubmitting(true);
    try {
      await addNotification({
        customer_id: user?.id || null,
        type: 'inquiry',
        title: `Contact Inquiry: ${subject.trim()}`,
        message: message.trim(),
      });
      toast({ title: 'Message Sent Successfully', description: 'Thank you! We will get back to you shortly.' });
      setSubject('');
      setMessage('');
    } catch (err) {
      toast({ title: 'Error sending message', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
      {/* Header */}
      <div>
        <h1 style={{ color: text, fontSize: 24, fontWeight: 800, margin: 0 }}>Contact Information</h1>
        <p style={{ color: subText, fontSize: 13, marginTop: 4, margin: 0 }}>Get in touch with us. We are always ready to support you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Contact Form: 3 columns */}
        <div className="lg:col-span-3" style={cardStyle}>
          <h2 style={{ color: text, fontSize: 16, fontWeight: 700, margin: '0 0 6px 0' }}>Send Us a Message</h2>
          <p style={{ color: subText, fontSize: 12, marginBottom: 20 }}>Have a query or custom requirement? Write to us and our team will reply within 24 hours.</p>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Subject</label>
              <input
                type="text"
                placeholder="How can we help you?"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${borderStrong}`,
                  borderRadius: 10,
                  background: panel2,
                  color: text,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Message</label>
              <textarea
                placeholder="Provide detailed information regarding your inquiry..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${borderStrong}`,
                  borderRadius: 10,
                  background: panel2,
                  color: text,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  height: 120,
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: brand,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
                alignSelf: 'flex-start',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#d4692a'; }}
              onMouseLeave={e => e.currentTarget.style.background = brand}
            >
              <Send style={{ width: 14, height: 14 }} />
              <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
            </button>
          </form>
        </div>

        {/* Contact Info Details: 2 columns */}
        <div className="lg:col-span-2" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>Direct Channels</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone style={{ width: 18, height: 18, color: brand }} />
              </div>
              <div>
                <h3 style={{ color: text, fontSize: 13, fontWeight: 700, margin: '0 0 2px 0' }}>Phone Support</h3>
                <p style={{ color: text, fontSize: 14, fontWeight: 800, margin: '0 0 2px 0' }}>+94 77 123 4567</p>
                <p style={{ color: subText, fontSize: 11, margin: 0 }}>Available Monday – Friday (9:00 AM – 6:00 PM)</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail style={{ width: 18, height: 18, color: brand }} />
              </div>
              <div>
                <h3 style={{ color: text, fontSize: 13, fontWeight: 700, margin: '0 0 2px 0' }}>Email Address</h3>
                <p style={{ color: text, fontSize: 14, fontWeight: 800, margin: '0 0 2px 0' }}>info@nextiom.com</p>
                <p style={{ color: subText, fontSize: 11, margin: 0 }}>We reply to general inquiries within 24 hours</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin style={{ width: 18, height: 18, color: brand }} />
              </div>
              <div>
                <h3 style={{ color: text, fontSize: 13, fontWeight: 700, margin: '0 0 2px 0' }}>Corporate Office</h3>
                <p style={{ color: text, fontSize: 13, fontWeight: 800, margin: '0 0 2px 0' }}>No. 123, Galle Road, Colombo 03</p>
                <p style={{ color: subText, fontSize: 11, margin: 0 }}>Sri Lanka</p>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginTop: 16 }}>
            <p style={{ color: subText, fontSize: 11, lineHeight: 1.5, margin: 0 }}>
              Need urgent support? Log in to the portal and create a support ticket directly from the **Support** menu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
