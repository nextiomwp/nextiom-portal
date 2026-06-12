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
  hasSubItems,
  collapsed = false,
  c = {},
  isDark = false,
  badge = 0,
  badgeColor,
  badge2 = 0,
  badge2Color,
}) => {
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const subText = c.subText || '#888';
  const textColor = c.text || '#1a1a1a';
  const hover = c.hover || '#f5f5f5';

  const isItemActive = !hasSubItems && isActive;

  return (
    <div className="mb-0.5">
      <button
        onClick={hasSubItems ? onToggle : onClick}
        title={collapsed ? label : undefined}
        className={cn(
          'w-full flex items-center py-2.5 rounded-lg transition-colors text-sm font-medium select-none touch-manipulation',
          collapsed ? 'justify-center px-2' : 'justify-between px-3'
        )}
        style={{ backgroundColor: isItemActive ? brandLight : 'transparent' }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.backgroundColor = hover;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = isItemActive ? brandLight : 'transparent';
        }}
        aria-expanded={isExpanded}
      >
        <div className={cn('flex items-center', collapsed ? '' : 'gap-3')}>
          {Icon && (
            <div className="relative">
              <Icon
                className="w-5 h-5 flex-shrink-0"
                style={{ color: isActive ? brand : subText }}
              />
              {badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -6,
                    width: 14,
                    height: 14,
                    backgroundColor: badgeColor || brand,
                    borderRadius: '50%',
                    fontSize: 9,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {badge}
                </span>
              )}
              {badge2 > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    left: -6,
                    width: 14,
                    height: 14,
                    backgroundColor: badge2Color || brand,
                    borderRadius: '50%',
                    fontSize: 9,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {badge2}
                </span>
              )}
            </div>
          )}
          {!collapsed && (
            <span style={{ color: isActive ? brand : textColor }}>{label}</span>
          )}
        </div>

        {hasSubItems && !collapsed && (
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4" style={{ color: isActive ? brand : subText }} />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {hasSubItems && isExpanded && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="mt-0.5 ml-4 pl-2 space-y-0.5 pb-1"
              style={{ borderLeft: `1px solid ${c.border || '#ebebeb'}` }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsibleMenuItem;
