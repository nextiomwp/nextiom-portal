import React, { useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function RateUsCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
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
                  <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">
                    Leave a Review
                  </Button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RateUsCard;