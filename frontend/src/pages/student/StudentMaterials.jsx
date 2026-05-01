import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ExternalLink, FileText, Video, Link as LinkIcon, PlayCircle, ChevronDown, Check } from 'lucide-react';
import * as Select from '@radix-ui/react-select';

export function StudentMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
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
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.sessions?.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || m.material_type === typeFilter;
    return matchesSearch && matchesType;
  });

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
      <div className="mb-8">
        <h1 className="text-display-sm text-primary mb-2">Study Materials</h1>
        <p className="text-secondary text-body-sm">Access slides, recordings, and resources for your sessions.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8 z-20 relative">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input 
            type="text" 
            placeholder="Search materials..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface-inset border border-border-default rounded-md pl-10 pr-4 py-2.5 text-primary text-[14px] focus:border-accent-glow focus:outline-none placeholder:text-tertiary"
          />
        </div>

        {/* Radix UI Select for Filtering */}
        <Select.Root value={typeFilter} onValueChange={setTypeFilter}>
          <Select.Trigger className="inline-flex items-center justify-between rounded-md px-4 py-2.5 text-[14px] leading-none bg-surface-inset border border-border-default text-primary hover:bg-surface focus:outline-none focus:border-accent-glow data-[placeholder]:text-tertiary outline-none min-w-[160px] transition-colors">
            <Select.Value placeholder="Filter by type" />
            <Select.Icon className="text-tertiary">
              <ChevronDown className="w-4 h-4" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="overflow-hidden bg-surface rounded-md border border-border-subtle shadow-raised z-50">
              <Select.Viewport className="p-1">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="slides">Slides</SelectItem>
                <SelectItem value="recording">Recordings</SelectItem>
                <SelectItem value="code_repo">Code Repos</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-surface rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-20 text-tertiary italic text-body-lg bg-surface rounded-2xl border border-border-subtle">
          No materials match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                Access Material <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-50" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Radix SelectItem Helper Component
const SelectItem = React.forwardRef(({ children, className, ...props }, forwardedRef) => {
  return (
    <Select.Item
      className={`text-[14px] leading-none text-secondary rounded-[3px] flex items-center h-8 pr-8 pl-6 relative select-none data-[disabled]:text-tertiary data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-primary cursor-pointer transition-colors ${className}`}
      {...props}
      ref={forwardedRef}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute left-0 w-6 inline-flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-primary" />
      </Select.ItemIndicator>
    </Select.Item>
  );
});
