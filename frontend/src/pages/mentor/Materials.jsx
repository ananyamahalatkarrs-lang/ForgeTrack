import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, ExternalLink, FileText, Video, Link as LinkIcon, PlayCircle } from 'lucide-react';

export function Materials() {
  const [materials, setMaterials] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    session_id: '',
    title: '',
    material_type: 'slides',
    url: '',
    description: ''
  });

  useEffect(() => {
    fetchMaterials();
    fetchSessions();
  }, []);

  async function fetchMaterials() {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          sessions ( date, topic )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessions() {
    try {
      const { data } = await supabase
        .from('sessions')
        .select('id, date, topic')
        .order('date', { ascending: false });
      if (data) {
        setSessions(data);
        if (data.length > 0) setFormData(f => ({ ...f, session_id: data[0].id }));
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert({
          session_id: formData.session_id,
          title: formData.title,
          material_type: formData.material_type,
          url: formData.url,
          description: formData.description || null
        })
        .select(`*, sessions(date, topic)`)
        .single();

      if (error) throw error;
      
      setMaterials(prev => [data, ...prev]);
      setShowAddModal(false);
      setFormData({ ...formData, title: '', url: '', description: '' });
    } catch (err) {
      console.error(err);
      alert("Failed to add material.");
    } finally {
      setSaving(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sessions?.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type) => {
    switch(type) {
      case 'slides': return <FileText className="w-5 h-5" />;
      case 'recording': return <PlayCircle className="w-5 h-5" />;
      case 'code_repo': return <LinkIcon className="w-5 h-5" />;
      default: return <ExternalLink className="w-5 h-5" />;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-display-sm text-primary mb-2">Class Materials</h1>
          <p className="text-secondary text-body-sm">Manage slides, recordings, and repository links.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-inverse px-5 py-2.5 rounded-md font-medium text-[14px] hover:bg-[#E5E5E7] transition-colors flex items-center shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </button>
      </div>

      <div className="mb-8 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
        <input 
          type="text" 
          placeholder="Search materials..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-surface-inset border border-border-default rounded-md pl-10 pr-4 py-3 text-primary text-[14px] focus:border-accent-glow focus:outline-none placeholder:text-tertiary"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-surface rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-20 text-tertiary italic text-body-lg">
          No materials found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMaterials.map(item => (
            <div key={item.id} className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-[var(--shadow-card)] flex flex-col group hover:border-border-default transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                  ${item.material_type === 'recording' ? 'bg-[rgba(244,63,94,0.12)] text-[#F43F5E]' :
                    item.material_type === 'slides' ? 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]' :
                    'bg-[rgba(16,185,129,0.12)] text-[#10B981]'
                  }`}
                >
                  {getTypeIcon(item.material_type)}
                </div>
                <span className="text-micro font-mono text-tertiary uppercase tracking-wider bg-surface-inset px-2 py-1 rounded border border-border-subtle">
                  {new Date(item.sessions?.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
              </div>
              
              <h3 className="text-h3 text-primary mb-1 line-clamp-1" title={item.title}>{item.title}</h3>
              <p className="text-caption text-secondary mb-4 line-clamp-1">{item.sessions?.topic}</p>
              
              {item.description && (
                <p className="text-body-sm text-tertiary mb-6 line-clamp-2 flex-1">{item.description}</p>
              )}
              <div className="flex-1" />

              <a 
                href={item.url} 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center py-2.5 rounded-md bg-surface-raised border border-border-default text-primary text-[14px] font-medium hover:bg-surface transition-colors mt-auto group-hover:border-accent-glow"
              >
                Open Link <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-50" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 md:p-8 max-w-md w-full border border-border-subtle shadow-raised animate-in zoom-in-95 duration-200">
            <h2 className="text-h2 mb-6">Add Material</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div>
                <label className="block text-label text-secondary mb-1">SESSION</label>
                <select 
                  required
                  value={formData.session_id}
                  onChange={e => setFormData({...formData, session_id: e.target.value})}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none appearance-none"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {s.topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label text-secondary mb-1">TITLE</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. React Router Slides"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-label text-secondary mb-1">TYPE</label>
                  <select 
                    value={formData.material_type}
                    onChange={e => setFormData({...formData, material_type: e.target.value})}
                    className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none appearance-none"
                  >
                    <option value="slides">Slides</option>
                    <option value="recording">Recording</option>
                    <option value="code_repo">Code Repo</option>
                    <option value="document">Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label text-secondary mb-1">URL</label>
                <input 
                  required
                  type="url" 
                  placeholder="https://..."
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label text-secondary mb-1">DESCRIPTION (Optional)</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-md border border-border-default text-primary hover:bg-surface-raised transition-colors text-[14px] font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving || !formData.session_id}
                  className="px-5 py-2.5 rounded-md bg-primary text-inverse hover:bg-[#E5E5E7] transition-colors text-[14px] font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
