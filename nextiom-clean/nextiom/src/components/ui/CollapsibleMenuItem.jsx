import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const CollapsibleMenuItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  isExpanded, 
  onToggle, 
  onClick, 
  children,
  hasSubItems
}) => {
  return (
    <div className="mb-1">
      <button
        onClick={hasSubItems ? onToggle : onClick}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-sm font-medium group select-none touch-manipulation",
          isActive && !hasSubItems 
            ? "text-blue-700 bg-blue-50" 
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          hasSubItems && isActive && "text-blue-700 font-semibold" // Active parent style
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon 
              className={cn(
                "w-5 h-5 transition-colors", 
                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
              )} 
            />
          )}
          <span>{label}</span>
        </div>
        
        {hasSubItems && (
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown className={cn("w-4 h-4 transition-colors", isActive ? "text-blue-600" : "text-slate-400")} />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {hasSubItems && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 border-l border-slate-200 pl-2 space-y-1 pb-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsibleMenuItem;