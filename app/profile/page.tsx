'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  FaCamera, 
  FaArrowRightFromBracket, 
  FaDownload, 
  FaUser, 
  FaChevronRight, 
  FaPencil, 
  FaTrash, 
  FaXmark,
  FaEye,
  FaBookmark,
  FaCheck
} from 'react-icons/fa6';

// Initialize Supabase client
const supabase = createClient(
  'https://mpsnwijabfingujzirri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wc253aWphYmZpbmd1anppcnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDUzNzIsImV4cCI6MjA4MzQyMTM3Mn0.RTNnZHJRnYjoeX9faOi324CbooNxNaW6Fm2xJrV609M'
);

export default function ProfilePage() {
  const router = useRouter();
  
  // States
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'downloads'>('saved');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Profile Data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [downloadHistory, setDownloadHistory] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
      if (activeTab === 'saved') {
        const savedItem = savedItems.find(item => item.products.id === selectedProduct.id);
        setNote(savedItem?.custom_note || '');
      }
    } else {
      document.body.style.overflow = '';
      setNote('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedProduct, activeTab, savedItems]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setEmail(session.user.email || '');

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileData) {
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setBio(profileData.bio || '');
        setGender(profileData.gender || '');
        setBirthday(profileData.birthday || '');
        setPhoneNumber(profileData.phone_number || '');
        setAvatarUrl(profileData.avatar_url || '');
      }

      const { data: dlData } = await supabase.from('user_downloads').select('id, downloaded_at, products (*)').eq('user_id', session.user.id).order('downloaded_at', { ascending: false });
      if (dlData) setDownloadHistory(dlData.filter(item => item.products !== null));

      const { data: svData } = await supabase.from('user_favorites').select('id, saved_at, custom_note, products (*)').eq('user_id', session.user.id).order('saved_at', { ascending: false });
      if (svData) setSavedItems(svData.filter(item => item.products !== null));
    } catch (error) {
      console.error('Data Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedProduct) return;
    try {
      setSavingNote(true);
      const savedItem = savedItems.find(item => item.products.id === selectedProduct.id);
      if (!savedItem) return;
      const { error } = await supabase.from('user_favorites').update({ custom_note: note }).eq('id', savedItem.id);
      if (error) throw error;
      setSavedItems(prev => prev.map(item => item.id === savedItem.id ? { ...item, custom_note: note } : item));
      alert('Customization Note Saved!');
    } catch (error) {
      alert('Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase.from('profiles').update({
        first_name: firstName, last_name: lastName, bio, gender, birthday, phone_number: phoneNumber, updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;
      alert('Profile updated!');
      setEditingField(null);
    } catch (error) {
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;
      const path = `${user.id}-${Math.random()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setAvatarUrl(publicUrl);
    } catch (error) {
      alert('Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveItem = async (id: any, type: 'download' | 'saved') => {
    if (!confirm('Remove this item?')) return;
    const table = type === 'download' ? 'user_downloads' : 'user_favorites';
    await supabase.from(table).delete().eq('id', id);
    if (type === 'download') setDownloadHistory(prev => prev.filter(i => i.id !== id));
    else setSavedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleReDownload = async (product: any) => {
    if (!product?.image_url) return;
    try {
      setDownloading(true);
      const res = await fetch(product.image_url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.item_code || 'texture'}.webp`;
      a.click();
    } catch (error) {
      alert('Download error.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const renderEditableRow = (
    label: string, 
    fieldKey: string, 
    value: string, 
    setter: (val: string) => void, 
    inputType: 'text' | 'date' | 'select' = 'text',
    options: string[] = [] // Default value handles most cases
  ) => {
    const isEditing = editingField === fieldKey;

    return (
      <div className="flex justify-between items-center p-4 border-b border-white/5 last:border-0 min-h-[56px]">
        <span className="text-sm text-zinc-300 w-1/3">{label}</span>
        <div className="flex items-center w-2/3 justify-end">
          {isEditing ? (
            inputType === 'select' ? (
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="bg-transparent text-right text-sm text-white outline-none w-full appearance-none"
                style={{ direction: 'rtl' }}
              >
                <option value="" disabled className="bg-[#1a1a1a]">Select</option>
                {/* Fixed line with optional chaining and null check */}
                {options?.length > 0 && options.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#1a1a1a]">
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={inputType}
                value={value}
                onChange={(e) => setter(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                autoFocus
                className="bg-transparent border-b border-[#B08038] text-right text-sm text-white outline-none w-full pb-1"
                style={inputType === 'date' ? { colorScheme: 'dark' } : {}}
              />
            )
          ) : (
            <div 
              className="flex items-center cursor-pointer group justify-end w-full"
              onClick={() => setEditingField(fieldKey)}
            >
              <span className={`text-sm text-right truncate ${value ? 'text-white' : 'text-[#B08038]'}`}>
                {value || 'Set Now'}
              </span>
              <FaChevronRight className="ml-3 text-zinc-600 text-xs group-hover:text-[#B08038] transition-colors" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentData = activeTab === 'saved' ? savedItems : downloadHistory;
  const emptyMessage = activeTab === 'saved' ? "No saved items found. Click the save icon on products to keep them here for later." : "No download history found. Downloaded materials will appear here.";
  const EmptyIcon = activeTab === 'saved' ? FaBookmark : FaDownload;

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-white/10 border-t-[#B08038] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-20 px-6 lg:px-16 font-['Prompt'] relative">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-12 lg:gap-20">
        
        {/* Left Column - Profile Info */}
        <div className="w-full lg:w-1/3 flex flex-col">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex flex-col items-center justify-center pt-4 pb-6 border-b border-white/5">
              <div className="relative group mb-3">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 shadow-xl flex items-center justify-center border border-white/10">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <FaUser className="text-4xl text-zinc-500" />}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity duration-300">
                  <FaCamera className="text-white text-xl" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
              <label className="text-zinc-400 text-sm flex items-center gap-2 cursor-pointer hover:text-white transition-colors mb-2">
                <FaPencil className="text-xs" /> Edit Profile Picture
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              <h3 className="text-lg font-medium text-white tracking-wide uppercase">
                {firstName || lastName ? `${firstName} ${lastName}` : 'New User'}
              </h3>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
              {renderEditableRow('First Name', 'firstName', firstName, setFirstName)}
              {renderEditableRow('Last Name', 'lastName', lastName, setLastName)}
              {renderEditableRow('Bio', 'bio', bio, setBio)}
            </div>

            <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
              {renderEditableRow('Gender', 'gender', gender, setGender, 'select', ['Male', 'Female', 'Other'])}
              {renderEditableRow('Birthday', 'birthday', birthday, setBirthday, 'date')}
              {renderEditableRow('Phone', 'phone', phoneNumber, setPhoneNumber)}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button type="button" onClick={handleSignOut} className="text-zinc-500 text-xs flex items-center gap-2 hover:text-white transition-colors">
                <FaArrowRightFromBracket /> Sign Out
              </button>
              <button type="submit" disabled={saving} className="bg-[#B08038] text-white px-6 py-2 rounded-sm text-xs font-medium tracking-wide hover:bg-[#8f662a] transition-colors">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Content */}
        <div className="w-full lg:w-2/3 lg:pl-12 lg:border-l border-white/10 mt-10 lg:mt-0">
          <div className="flex gap-8 mb-8 border-b border-white/10">
            <button onClick={() => setActiveTab('saved')} className={`pb-3 text-sm font-medium uppercase transition-colors relative ${activeTab === 'saved' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Saved Items{activeTab === 'saved' && <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#B08038]" />}</button>
            <button onClick={() => setActiveTab('downloads')} className={`pb-3 text-sm font-medium uppercase transition-colors relative ${activeTab === 'downloads' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Download History{activeTab === 'downloads' && <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#B08038]" />}</button>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-white uppercase">{activeTab === 'saved' ? 'Your Saved Textures' : 'Recent Downloads'}</h2>
            <span className="text-zinc-500 text-xs">{currentData.length} Items</span>
          </div>

          {currentData.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-sm p-12 text-center flex flex-col items-center mt-4">
              <EmptyIcon className="text-4xl text-zinc-600 mb-4" />
              <h3 className="text-white font-medium mb-2">{emptyMessage}</h3>
              <Link href="/introduction" prefetch={false} className="bg-[#B08038] text-white px-8 py-3 text-[10px] uppercase tracking-widest rounded-sm hover:bg-[#8f662a]">Explore Collections</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {currentData.map((item) => (
                <div key={item.id} className="group relative bg-[#050505] border border-white/10 rounded-sm overflow-hidden hover:border-[#B08038]/50 transition-colors flex flex-col">
                  <div className="aspect-square p-4 bg-zinc-900/50 flex items-center justify-center cursor-pointer relative" onClick={() => setSelectedProduct(item.products)}>
                    <img src={item.products.image_url} alt={item.products.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-xs uppercase tracking-widest font-bold border border-white/30 px-4 py-2 bg-black/40 flex items-center gap-2"><FaEye /> View</span></div>
                  </div>
                  <div className="p-4 border-t border-white/5 flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="text-[#B08038] text-xs font-bold uppercase tracking-wider mb-1 truncate">{item.products.title}</h4>
                      <p className="text-zinc-500 text-[10px] tracking-widest uppercase mb-1">{item.products.item_code}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <button onClick={() => setSelectedProduct(item.products)} className="text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">Details</button>
                      <button onClick={() => handleRemoveItem(item.id, activeTab === 'downloads' ? 'download' : 'saved')} className="text-zinc-600 hover:text-red-500 p-1 transition-colors"><FaTrash className="text-sm" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal with Updated Dimensions View */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md transition-opacity duration-300" onClick={e => e.target === e.currentTarget && setSelectedProduct(null)}>
          <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-[#B08038] transition-colors"><FaXmark /></button>
            <div className="w-full md:w-1/2 bg-[#050505] flex items-center justify-center p-8 relative min-h-[300px]">
              <div className="w-full aspect-square border border-white/5 overflow-hidden"><img src={selectedProduct.image_url || ''} className="w-full h-full object-cover" /></div>
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto no-scrollbar text-left relative bg-[#0a0a0a]">
              <div className="mb-6">
                <h2 className="text-3xl text-[#B08038] font-medium mb-2 leading-tight uppercase tracking-wide">{selectedProduct.title}</h2>
                <p className="text-white text-[10px] tracking-widest uppercase mb-4 font-bold">{selectedProduct.subtitle || 'Collection'}</p>
                <p className="text-zinc-400 text-sm leading-relaxed font-light">{selectedProduct.description || 'Premium architectural material.'}</p>
              </div>
              <hr className="border-white/10 mb-6" />
              
              <div className="mb-8 p-5 bg-white/5 rounded-sm border border-white/5 space-y-4">
                <div className="flex flex-col gap-4">
                  {/* Updated Standard Dimensions Block */}
                  <div>
                    <span className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-3 font-semibold">
                      Standard Dimensions
                    </span>
                    <div className="space-y-2 text-zinc-300 text-sm">
                      <p>W1220 x H2440 x T5+- mm</p>
                      <p>W1220 x H2800 x T5+- mm</p>
                      <p className="pt-2 text-white font-medium">Custom Size Available</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <span className="block text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Ref Code</span>
                    <span className="text-[#B08038] text-xs tracking-wider font-bold">{selectedProduct.item_code || '-'}</span>
                  </div>
                </div>

                {activeTab === 'saved' && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <label className="block text-zinc-500 text-[9px] uppercase font-bold mb-2">Customization Note</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add specific project dimensions or notes here..." className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-xs text-white focus:border-[#B08038] outline-none transition-colors resize-none" rows={3} />
                    <button onClick={handleSaveNote} disabled={savingNote} className="w-full mt-2 bg-[#B08038] text-white text-[10px] font-bold uppercase py-2 hover:bg-[#8f662a] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {savingNote ? 'Saving...' : <><FaCheck /> Save Note</>}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-6"><button onClick={() => handleReDownload(selectedProduct)} disabled={downloading} className="w-full py-4 bg-white text-black text-[11px] font-bold uppercase hover:bg-[#B08038] hover:text-white transition-all flex items-center justify-center gap-2">{downloading ? 'Downloading...' : <><FaDownload /> Download Image</>}</button></div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
