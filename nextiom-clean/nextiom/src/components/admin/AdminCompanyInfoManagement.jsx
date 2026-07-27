import React, { useState, useEffect } from 'react';
import { Building, Plus, Trash2, Edit2, ArrowUp, ArrowDown, Code, CheckCircle2, Shield, Heart, Users, Sparkles, Send, Wrench, Zap, Search, ArrowUpCircle, ShieldAlert, Smartphone, Palette, Award, Star, Check, HelpCircle, Info, Globe, Settings, X, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getCompanyInfoSections, createCompanyInfoSection, updateCompanyInfoSection, deleteCompanyInfoSection } from '@/lib/storage';

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

const CATEGORIES = [
  { id: 'about_text', name: 'About NEXTIOM Paragraphs', desc: 'Main description paragraphs of the about page.' },
  { id: 'about_feature', name: 'About Mini Features', desc: 'Three small feature highlights with icons at the bottom of the about section.' },
  { id: 'core_pillar', name: 'Core Pillars', desc: 'Three key pillars displayed in the right column.' },
  { id: 'service', name: 'Our Services', desc: 'The grid of services at the very bottom.' }
];

export default function AdminCompanyInfoManagement({ isDark = false, c = {} }) {
  const { toast } = useToast();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formCategory, setFormCategory] = useState('about_text');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('Sparkles');
  const [formOrder, setFormOrder] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const border = c.border || 'rgba(255,255,255,0.06)';
  const text = c.text || '#fff';
  const subText = c.subText || '#a0a0a0';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.15)';
  const cardBg = isDark ? '#1C1E24' : '#ffffff';
  const hoverBg = c.hover || 'rgba(255,255,255,0.04)';
  const panelBg = c.panel2 || '#22252C';

  const loadData = async () => {
    try {
      const data = await getCompanyInfoSections();
      setSections(data);
    } catch (err) {
      console.error('Failed to load company info sections:', err);
      toast({
        variant: 'destructive',
        title: 'Error loading sections',
        description: 'Could not fetch company info sections from the database.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = (category) => {
    // Get max display order in this category
    const categoryItems = sections.filter(s => s.category === category);
    const maxOrder = categoryItems.reduce((max, item) => Math.max(max, item.display_order || 0), 0);
    
    setEditingItem(null);
    setFormCategory(category);
    setFormTitle('');
    setFormDescription('');
    setFormIcon(category === 'service' ? 'Code' : category === 'core_pillar' ? 'CheckCircle2' : 'Shield');
    setFormOrder(maxOrder + 10);
    setIsOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormTitle(item.title || '');
    setFormDescription(item.description || '');
    setFormIcon(item.icon || 'Sparkles');
    setFormOrder(item.display_order || 0);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Description is required.' });
      return;
    }
    if (formCategory !== 'about_text' && !formTitle.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Title is required for this section.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: formCategory,
        title: formCategory === 'about_text' ? '' : formTitle.trim(),
        description: formDescription.trim(),
        icon: formCategory === 'about_text' ? null : formIcon,
        display_order: Number(formOrder)
      };

      if (editingItem) {
        await updateCompanyInfoSection(editingItem.id, payload);
        toast({ title: 'Section updated', description: 'The company info section has been updated successfully.' });
      } else {
        await createCompanyInfoSection(payload);
        toast({ title: 'Section created', description: 'New company info section has been created.' });
      }
      setIsOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error saving section', description: err.message || 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await deleteCompanyInfoSection(id);
      toast({ title: 'Section deleted', description: 'Item has been removed.' });
      setDeleteConfirmId(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error deleting section', description: err.message || 'An error occurred.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (item, direction) => {
    const categoryItems = sections
      .filter(s => s.category === item.category)
      .sort((a, b) => a.display_order - b.display_order);

    const idx = categoryItems.findIndex(s => s.id === item.id);
    if (idx === -1) return;

    let targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categoryItems.length) return;

    const targetItem = categoryItems[targetIdx];

    try {
      // Swap display orders
      const tempOrder = item.display_order;
      await updateCompanyInfoSection(item.id, { display_order: targetItem.display_order });
      await updateCompanyInfoSection(targetItem.id, { display_order: tempOrder });
      
      toast({ title: 'Reordered', description: 'Sequence has been updated.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Reorder error', description: 'Could not update display sequence.' });
    }
  };

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 24,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.03)'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: brand }} />
      </div>
    );
  }

  const aboutTextSections = sections.filter(s => s.category === 'about_text');
  const aboutFeatureSections = sections.filter(s => s.category === 'about_feature');
  const corePillarSections = sections.filter(s => s.category === 'core_pillar');
  const serviceSections = sections.filter(s => s.category === 'service');

  const renderSectionHeader = (title, category) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h3 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
      <button
        onClick={() => handleOpenAdd(category)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: brandLight,
          color: brand,
          border: 'none',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
      >
        <Plus size={14} /> Add Item
      </button>
    </div>
  );

  const renderItemActions = (item, index, length) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        disabled={index === 0}
        onClick={() => handleMove(item, 'up')}
        title="Move Up"
        style={{
          background: hoverBg,
          color: index === 0 ? c.subText + '40' : text,
          border: 'none',
          padding: 6,
          borderRadius: 6,
          cursor: index === 0 ? 'not-allowed' : 'pointer',
          display: 'flex'
        }}
      >
        <ArrowUp size={14} />
      </button>
      <button
        disabled={index === length - 1}
        onClick={() => handleMove(item, 'down')}
        title="Move Down"
        style={{
          background: hoverBg,
          color: index === length - 1 ? c.subText + '40' : text,
          border: 'none',
          padding: 6,
          borderRadius: 6,
          cursor: index === length - 1 ? 'not-allowed' : 'pointer',
          display: 'flex'
        }}
      >
        <ArrowDown size={14} />
      </button>
      <button
        onClick={() => handleOpenEdit(item)}
        title="Edit"
        style={{
          background: hoverBg,
          color: text,
          border: 'none',
          padding: 6,
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex'
        }}
      >
        <Edit2 size={14} />
      </button>
      <button
        onClick={() => setDeleteConfirmId(item.id)}
        title="Delete"
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex'
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
      {/* Header */}
      <div>
        <h1 style={{ color: text, fontSize: 24, fontWeight: 800, margin: 0 }}>Company Information Manager</h1>
        <p style={{ color: subText, fontSize: 13, marginTop: 4, margin: 0 }}>Manage the content, features, core pillars, and service items shown on the customer-side Company Info page.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* About Paragraphs */}
        <div style={cardStyle}>
          {renderSectionHeader('About NEXTIOM - Paragraphs', 'about_text')}
          {aboutTextSections.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: subText, fontSize: 13, fontStyle: 'italic' }}>
              No paragraphs added yet. Click "Add Item" to add one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aboutTextSections.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    padding: 12,
                    background: hoverBg,
                    border: `1px solid ${border}`,
                    borderRadius: 10
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ color: brand, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Paragraph {idx + 1}</span>
                    <p style={{ color: text, fontSize: 13, lineHeight: 1.5, margin: '4px 0 0 0' }}>{s.description}</p>
                  </div>
                  {renderItemActions(s, idx, aboutTextSections.length)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* About Bottom Features */}
        <div style={cardStyle}>
          {renderSectionHeader('About Section - Feature Highlights', 'about_feature')}
          {aboutFeatureSections.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: subText, fontSize: 13, fontStyle: 'italic' }}>
              No mini features added yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aboutFeatureSections.map((s, idx) => {
                const Icon = getIcon(s.icon, Shield);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      padding: 12,
                      background: hoverBg,
                      border: `1px solid ${border}`,
                      borderRadius: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: 16, height: 16, color: brand }} />
                      </div>
                      <div>
                        <h4 style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{s.title}</h4>
                        <p style={{ color: subText, fontSize: 11, margin: '2px 0 0 0' }}>{s.description}</p>
                      </div>
                    </div>
                    {renderItemActions(s, idx, aboutFeatureSections.length)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Core Pillars */}
        <div style={cardStyle}>
          {renderSectionHeader('Core Pillars (Right Column)', 'core_pillar')}
          {corePillarSections.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: subText, fontSize: 13, fontStyle: 'italic' }}>
              No core pillars added yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {corePillarSections.map((s, idx) => {
                const Icon = getIcon(s.icon, CheckCircle2);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      padding: 12,
                      background: hoverBg,
                      border: `1px solid ${border}`,
                      borderRadius: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: 16, height: 16, color: brand }} />
                      </div>
                      <div>
                        <h4 style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{s.title}</h4>
                        <p style={{ color: subText, fontSize: 11, margin: '2px 0 0 0' }}>{s.description}</p>
                      </div>
                    </div>
                    {renderItemActions(s, idx, corePillarSections.length)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Services */}
        <div style={cardStyle}>
          {renderSectionHeader('Our Services Grid', 'service')}
          {serviceSections.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: subText, fontSize: 13, fontStyle: 'italic' }}>
              No services added yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {serviceSections.map((s, idx) => {
                const Icon = getIcon(s.icon, Code);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      padding: 12,
                      background: hoverBg,
                      border: `1px solid ${border}`,
                      borderRadius: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: 16, height: 16, color: brand }} />
                      </div>
                      <div>
                        <h4 style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{s.title}</h4>
                        <p style={{ color: subText, fontSize: 11, margin: '2px 0 0 0' }}>{s.description}</p>
                      </div>
                    </div>
                    {renderItemActions(s, idx, serviceSections.length)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
              padding: 16
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: panelBg,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                color: text
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {editingItem ? 'Edit Item' : 'Add Item'} - {CATEGORIES.find(c => c.id === formCategory)?.name || formCategory}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: subText, cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {formCategory !== 'about_text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: subText }}>Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="Enter item title..."
                      style={{
                        background: cardBg,
                        border: `1px solid ${border}`,
                        color: text,
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: subText }}>
                    {formCategory === 'about_text' ? 'Paragraph Text' : 'Description'}
                  </label>
                  <textarea
                    rows={formCategory === 'about_text' ? 5 : 3}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Enter description content..."
                    style={{
                      background: cardBg,
                      border: `1px solid ${border}`,
                      color: text,
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                {formCategory !== 'about_text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: subText }}>Select Icon</label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 8,
                        padding: 12,
                        background: cardBg,
                        border: `1px solid ${border}`,
                        borderRadius: 8,
                        maxHeight: 130,
                        overflowY: 'auto'
                      }}
                    >
                      {Object.keys(IconMap).map((iconName) => {
                        const Icon = IconMap[iconName];
                        const isSelected = formIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setFormIcon(iconName)}
                            title={iconName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 8,
                              borderRadius: 6,
                              background: isSelected ? brandLight : 'transparent',
                              border: isSelected ? `1px solid ${brand}` : '1px solid transparent',
                              color: isSelected ? brand : subText,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Icon size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: subText }}>Display Order</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={e => setFormOrder(e.target.value)}
                    placeholder="E.g. 10, 20..."
                    style={{
                      background: cardBg,
                      border: `1px solid ${border}`,
                      color: text,
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      outline: 'none',
                      width: '100px'
                    }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: hoverBg,
                      color: text,
                      border: `1px solid ${border}`,
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      background: brand,
                      color: '#fff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {editingItem ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 400,
                background: panelBg,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                color: text
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 12 }}>Confirm Deletion</h3>
              <p style={{ color: subText, fontSize: 13, lineHeight: 1.5, margin: 0, marginBottom: 20 }}>
                Are you sure you want to remove this item? This action is permanent and will instantly update the customer portal.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    background: hoverBg,
                    color: text,
                    border: `1px solid ${border}`,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(deleteConfirmId)}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isDeleting && <Loader2 size={14} className="animate-spin" />}
                  Delete Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
