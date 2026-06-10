import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Edit, Trash2, Download, RefreshCw, Infinity, Layers, Clock, Key, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { deleteProduct, addNotification } from '@/lib/storage';
import EditProductDialog from '@/components/dialogs/EditProductDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LICENSE_LABEL = {
  one_time: { label: 'One Time', icon: Package, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  yearly: { label: 'Yearly', icon: RefreshCw, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  lifetime: { label: 'Lifetime', icon: Infinity, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

export default function ProductList({ products, onUpdate, isDark, c }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'digital', 'virtual'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'name_asc', 'name_desc', 'price_asc', 'price_desc'
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const { toast } = useToast();

  const brand = c?.brand || '#e87b35';
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const sub = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const border = c?.border || (isDark ? 'rgba(255,255,255,0.06)' : '#ebebeb');
  const borderStrong = c?.borderStrong || (isDark ? 'rgba(255,255,255,0.1)' : '#d0d0d0');

  // iOS-style Glassmorphism Config
  const glassStyle = {
    background: isDark ? 'rgba(28, 30, 36, 0.45)' : 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
    borderRadius: 16,
    boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.25)' : '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const handleDelete = async (productId) => {
    const product = products.find(p => p.id === productId);
    await deleteProduct(productId);
    addNotification({
      customer_id: null,
      type: 'delete',
      title: `Product Deleted — ${product?.name || 'Unknown'}`,
      message: `Admin permanently deleted product: "${product?.name || 'Unknown'}".`,
    }).catch(() => {});
    onUpdate();
    toast({ title: 'Product deleted', description: 'Product removed successfully' });
    setDeletingProductId(null);
  };

  // 1. Filter products
  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // 2. Sort products
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
    if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  // Stats calculation
  const totalCount = products.length;
  const digitalCount = products.filter(p => p.category === 'digital').length;
  const virtualCount = products.filter(p => p.category === 'virtual').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '8px 4px' }}>
      
      {/* 1. Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Products', value: totalCount, icon: Package, color: brand, bgGrad: `linear-gradient(135deg, ${brand}20, ${brand}05)` },
          { label: 'Digital Products', value: digitalCount, icon: Download, color: '#22c55e', bgGrad: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))' },
          { label: 'Virtual Services', value: virtualCount, icon: Layers, color: '#6366f1', bgGrad: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))' },
        ].map((item, idx) => (
          <div key={idx} style={{ ...glassStyle, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: item.bgGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 650, color: sub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: text, marginTop: 2 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Control Bar */}
      <div style={{
        ...glassStyle,
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left: Search & Category Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: sub }} />
            <input
              type="text"
              placeholder="Search products by name, type..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10,
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                background: isDark ? 'rgba(20,20,22,0.6)' : 'rgba(255,255,255,0.6)',
                color: text, outline: 'none', fontSize: 13, boxSizing: 'border-box',
                transition: 'all 0.15s ease'
              }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{
            display: 'flex', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
            padding: 3, borderRadius: 10, border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'digital', label: 'Digital' },
              { id: 'virtual', label: 'Virtual' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: categoryFilter === tab.id ? (isDark ? 'rgba(255,255,255,0.08)' : '#fff') : 'transparent',
                  color: categoryFilter === tab.id ? text : sub,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sorting Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sub, fontSize: 12 }}>
            <ArrowUpDown size={14} />
            <span>Sort by:</span>
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: isDark ? 'rgba(28, 30, 36, 0.8)' : '#fff',
              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              color: text, cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="newest">Newest Added</option>
            <option value="name_asc">Name (A - Z)</option>
            <option value="name_desc">Name (Z - A)</option>
            <option value="price_asc">Price (Low - High)</option>
            <option value="price_desc">Price (High - Low)</option>
          </select>
        </div>
      </div>

      {/* 3. Product Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <AnimatePresence mode="popLayout">
          {sorted.map((product, i) => {
            const isVirtual = product.category === 'virtual';
            const lt = LICENSE_LABEL[product.license_type] || LICENSE_LABEL.one_time;
            const LtIcon = lt.icon;
            const cardBrand = isVirtual ? '#6366f1' : brand;

            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                whileHover={{ y: -4, boxShadow: isDark ? '0 12px 40px 0 rgba(0,0,0,0.4)' : '0 12px 40px 0 rgba(0,0,0,0.08)' }}
                style={{
                  ...glassStyle,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Glow Backdrop Effect */}
                <div style={{
                  position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%',
                  background: cardBrand, opacity: isDark ? 0.08 : 0.05, filter: 'blur(30px)', pointerEvents: 'none'
                }} />

                {/* Card Top: Icon and Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  {/* Styled Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isVirtual 
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))' 
                      : `linear-gradient(135deg, ${brand}15, ${brand}05)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${isVirtual ? 'rgba(99,102,241,0.15)' : `${brand}15`}`,
                    flexShrink: 0
                  }}>
                    {isVirtual ? (
                      <Layers style={{ width: 20, height: 20, color: '#6366f1' }} />
                    ) : (
                      <Package style={{ width: 20, height: 20, color: brand }} />
                    )}
                  </div>

                  {/* Actions & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 650, padding: '3px 9px', borderRadius: 20,
                      background: isVirtual ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)',
                      color: isVirtual ? '#818cf8' : '#22c55e',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {isVirtual ? 'Virtual' : 'Digital'}
                    </span>
                    
                    <button
                      onClick={() => setEditingProduct(product)}
                      style={{
                        padding: 6, borderRadius: 8, border: 'none', background: 'transparent',
                        cursor: 'pointer', color: sub, display: 'flex', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = brand; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sub; }}
                    >
                      <Edit style={{ width: 14, height: 14 }} />
                    </button>
                    
                    <button
                      onClick={() => setDeletingProductId(product.id)}
                      style={{
                        padding: 6, borderRadius: 8, border: 'none', background: 'transparent',
                        cursor: 'pointer', color: sub, display: 'flex', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sub; }}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>

                {/* Card Middle: Title & Type */}
                <div style={{ flex: 1 }}>
                  <p style={{ color: text, fontWeight: 700, fontSize: 15, margin: '0 0 4px', lineHeight: 1.4 }}>{product.name}</p>
                  <p style={{ color: sub, fontSize: 11.5, fontWeight: 500, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{product.type}</p>

                  {product.description && (
                    <p style={{
                      color: sub, fontSize: 12.5, margin: '0 0 16px', lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1.5, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '14px 0' }} />

                {/* Card Bottom: Pricing & Configuration Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Pricing */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: sub }}>Price</span>
                    <span style={{ color: cardBrand, fontWeight: 700, fontSize: 15 }}>
                      {product.currency === 'LKR' ? `Rs. ${Number(product.price).toFixed(2)}` : `$${Number(product.price).toFixed(2)}`}
                    </span>
                  </div>

                  {isVirtual ? (
                    <>
                      {product.renewal_date && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: sub, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Renewal</span>
                          <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>{product.renewal_date}</span>
                        </div>
                      )}
                      {product.renewal_enabled && product.renewal_price && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: sub, display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> Renewal Price</span>
                          <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>
                            {product.currency === 'LKR' ? `Rs. ${product.renewal_price}` : `$${product.renewal_price}`}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <LtIcon size={12} style={{ color: lt.color }} /> License
                        </span>
                        <span style={{ color: lt.color, fontSize: 12, fontWeight: 650 }}>{lt.label}</span>
                      </div>
                      
                      {product.download_url && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: 12, color: sub, display: 'flex', alignItems: 'center', gap: 4 }}><Download size={12} /> Updates</span>
                          <a href={product.download_url} target="_blank" rel="noopener noreferrer"
                            style={{ color: brand, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            Get Download URL
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {product.license_key && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
                      padding: '6px 10px', borderRadius: 8, background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                    }}>
                      <span style={{ fontSize: 11, color: sub, display: 'flex', alignItems: 'center', gap: 4 }}><Key size={11} /> Default Key</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: text, fontWeight: 600 }}>{product.license_key}</span>
                    </div>
                  )}
                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>

        {sorted.length === 0 && (
          <div style={{
            gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', ...glassStyle,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
          }}>
            <Package size={36} style={{ color: sub, opacity: 0.5 }} />
            <div>
              <p style={{ color: text, fontWeight: 600, fontSize: 15, margin: 0 }}>No Products Found</p>
              <p style={{ color: sub, fontSize: 13, margin: '4px 0 0' }}>Try broadening your search term or category filters.</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Edit Dialog */}
      {editingProduct && (
        <EditProductDialog
          open={!!editingProduct}
          onOpenChange={o => !o && setEditingProduct(null)}
          product={editingProduct}
          onSuccess={() => { setEditingProduct(null); onUpdate(); }}
          isDark={isDark}
          c={c}
        />
      )}

      {/* 5. Delete Alert Dialog */}
      <AlertDialog open={!!deletingProductId} onOpenChange={o => !o && setDeletingProductId(null)}>
        <AlertDialogContent style={{ background: isDark ? '#1C1E24' : '#fff', color: text, border: `1px solid ${borderStrong}` }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: text }}>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: sub }}>
              This will permanently delete this product and remove any associated licenses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: 'transparent', border: `1px solid ${border}`, color: text }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingProductId)}
              style={{ background: '#ef4444', color: '#fff' }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
