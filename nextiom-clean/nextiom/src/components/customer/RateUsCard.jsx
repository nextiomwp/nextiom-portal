import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function RateUsCard({ user, isDark = false, c = {} }) {
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';

  const handleSubmit = async () => {
    if (rating === 0) { toast({ title: 'Please select a rating', variant: 'destructive' }); return; }
    setIsSubmitting(true);
    try {
      await addNotification({
        customer_id: user?.id || null,
        type: 'review',
        title: `Customer Review — ${rating}/5 Stars`,
        message: reviewText.trim() || `Rating: ${rating}/5 stars`,
      });
      toast({ title: 'Review Submitted', description: 'Thank you for your feedback!' });
      setShowModal(false); setRating(0); setReviewText('');
    } catch {
      toast({ title: 'Error', description: 'Could not submit review.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <>
      <div style={{
        background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${border}`,
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 16px rgba(0,0,0,0.06)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Star style={{ width: 15, height: 15, color: '#ca8a04' }} />
          </div>
          <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Rate Us</span>
        </div>

        {/* Stars display */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} style={{ width: 20, height: 20, color: '#facc15', fill: '#facc15' }} />
          ))}
        </div>

        {/* Text */}
        <p style={{ color: subText, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
          Your feedback helps us maintain our high service standards. Please take a moment to rate your experience.
        </p>

        {/* Button */}
        <div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 18px', borderRadius: 10,
              background: brandLight, color: brand,
              border: `1px solid ${brand}`,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,123,53,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = brandLight}
          >
            Leave a Review
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{
            background: isDark ? '#1C1E24' : '#fff',
            border: `1px solid ${border}`,
            borderRadius: 20, width: '100%', maxWidth: 440,
            margin: '0 16px', padding: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: text, fontSize: 16, fontWeight: 700 }}>Leave a Review</span>
              <button onClick={() => setShowModal(false)} style={{ color: subText, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <p style={{ color: subText, fontSize: 13, marginBottom: 16 }}>How would you rate your experience with Nextiom?</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: 'center' }}>
              {[1,2,3,4,5].map(star => (
                <button key={star}
                  onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"
                    fill={(hoverRating || rating) >= star ? '#facc15' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')} stroke="none">
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                  </svg>
                </button>
              ))}
            </div>
            {rating > 0 && <p style={{ textAlign: 'center', fontSize: 13, color: brand, fontWeight: 600, marginBottom: 10 }}>{labels[rating]}</p>}
            <textarea
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${borderStrong}`, borderRadius: 10, background: panel2, color: text, fontSize: 13, resize: 'none', height: 80, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Tell us about your experience (optional)…"
              value={reviewText} onChange={e => setReviewText(e.target.value)}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={isSubmitting}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#d4692a'; }}
                onMouseLeave={e => e.currentTarget.style.background = brand}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RateUsCard;
