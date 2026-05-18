import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Edit, Trash2, Download, RefreshCw, Infinity, Layers, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { deleteProduct } from '@/lib/storage';
import EditProductDialog from '@/components/dialogs/EditProductDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LICENSE_LABEL = {
  one_time: { label: 'One Time', icon: Package, color: '#22c55e' },
  yearly: { label: 'Yearly', icon: RefreshCw, color: '#f59e0b' },
  lifetime: { label: 'Lifetime', icon: Infinity, color: '#6366f1' },
};

function ProductList({ products, onUpdate, isDark, c }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const { toast } = useToast();

  const bg = c?.card || (isDark ? '#1C1E24' : '#fff');
  const panelBg = c?.panel2 || (isDark ? '#22252C' : '#f5f5f5');
  const border = c?.border || (isDark ? 'rgba(255,255,255,0.06)' : '#ebebeb');
  const borderStrong = c?.borderStrong || (isDark ? 'rgba(255,255,255,0.1)' : '#d0d0d0');
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const sub = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const brand = c?.brand || '#E87B35';
  const hover = c?.hover || (isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5');

  const handleDelete = async (productId) => {
    await deleteProduct(productId);
    onUpdate();
    toast({ title: 'Product deleted', description: 'Product removed successfully' });
    setDeletingProductId(null);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: sub }} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8,
              border: `1px solid ${borderStrong}`, background: panelBg,
              color: text, outline: 'none', fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, padding: 20 }}>
        <AnimatePresence>
          {filtered.map((product, i) => {
            const isVirtual = product.category === 'virtual';
            const lt = LICENSE_LABEL[product.license_type] || LICENSE_LABEL.one_time;
            const LtIcon = lt.icon;
            return (
              <motion.div key={product.id}
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.93 }} transition={{ duration: 0.2, delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    background: product.image_url ? 'transparent' : 'linear-gradient(135deg,#4F46E5,#6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {product.image_url
                      ? <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (isVirtual ? <Layers style={{ width: 18, height: 18, color: '#fff' }} /> : <Package style={{ width: 18, height: 18, color: '#fff' }} />)
                    }
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                      background: isVirtual ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)',
                      color: isVirtual ? '#6366f1' : '#22c55e' }}>
                      {isVirtual ? 'Virtual' : 'Digital'}
                    </span>
                    <button onClick={() => setEditingProduct(product)}
                      style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: sub }}
                      onMouseEnter={e => { e.currentTarget.style.background = hover; e.currentTarget.style.color = brand; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sub; }}>
                      <Edit style={{ width: 14, height: 14 }} />
                    </button>
                    <button onClick={() => setDeletingProductId(product.id)}
                      style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: sub }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sub; }}>
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>

                <p style={{ color: text, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{product.name}</p>
                <p style={{ color: sub, fontSize: 12, marginBottom: 8 }}>{product.type}</p>

                {product.description && (
                  <p style={{ color: sub, fontSize: 12, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </p>
                )}

                {product.price != null && (
                  <p style={{ color: brand, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>${Number(product.price).toFixed(2)}</p>
                )}

                {isVirtual ? (
                  <>
                    {product.renewal_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock style={{ width: 12, height: 12, color: sub }} />
                        <span style={{ color: sub, fontSize: 11 }}>Renews: {product.renewal_date}</span>
                      </div>
                    )}
                    {product.renewal_enabled && product.renewal_price && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <RefreshCw style={{ width: 12, height: 12, color: sub }} />
                        <span style={{ color: sub, fontSize: 11 }}>Renewal: ${product.renewal_price}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: product.download_url ? 8 : 0 }}>
                      <LtIcon style={{ width: 12, height: 12, color: lt.color }} />
                      <span style={{ color: lt.color, fontSize: 11, fontWeight: 500 }}>{lt.label}</span>
                    </div>
                    {product.download_url && (
                      <a href={product.download_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, color: brand, fontSize: 12, textDecoration: 'none', marginTop: 4 }}>
                        <Download style={{ width: 12, height: 12 }} /> Download URL set
                      </a>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: sub }}>
            No products found
          </div>
        )}
      </div>

      {editingProduct && (
        <EditProductDialog open={!!editingProduct} onOpenChange={o => !o && setEditingProduct(null)}
          product={editingProduct} onSuccess={() => { setEditingProduct(null); onUpdate(); }} isDark={isDark} c={c} />
      )}

      <AlertDialog open={!!deletingProductId} onOpenChange={o => !o && setDeletingProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the product.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deletingProductId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProductList;
