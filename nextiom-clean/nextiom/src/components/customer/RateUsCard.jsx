import React, { useState } from 'react';
import { Star, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function RateUsCard({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addNotification({
        customer_id: user?.id || null,
        type: 'review',
        title: `Customer Review — ${rating}/5 Stars`,
        message: reviewText.trim() || `Rating: ${rating}/5 stars`
      });
      toast({ title: 'Review Submitted', description: 'Thank you for your feedback!' });
      setShowModal(false);
      setRating(0);
      setReviewText('');
    } catch {
      toast({ title: 'Error', description: 'Could not submit review.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-md">
              <Star className="text-yellow-600 w-4 h-4" />
            </div>
            <h3 className="text-slate-800 font-semibold text-sm">Rate Us</h3>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className="text-yellow-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                      </svg>
                    </div>
                  ))}
                </div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Your feedback helps us maintain our high service standards. Please take a moment to rate your experience with Nextiom.
                </p>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => setShowModal(true)}
                  >
                    Leave a Review
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Leave a Review</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">How would you rate your experience with Nextiom?</p>

            <div className="flex gap-2 mb-4 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill={(hoverRating || rating) >= star ? '#facc15' : '#e2e8f0'}
                    stroke="none"
                  >
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                  </svg>
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-sm text-slate-500 mb-4">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </p>
            )}

            <textarea
              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about your experience (optional)..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RateUsCard;
