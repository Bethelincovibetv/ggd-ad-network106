import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Copy, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminApiManager = () => {
  const [keys, setKeys] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    setKeys(data || []);
  };

  const createKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('api_keys').insert({ user_id: user.id, name: newName || 'Admin Key', domain: newDomain || null });
    toast.success('API key created!');
    setNewName(''); setNewDomain('');
    fetchKeys();
  };

  const deleteKey = async (id: string) => {
    await supabase.from('api_keys').delete().eq('id', id);
    toast.success('Deleted!');
    fetchKeys();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Create API Key</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Key name" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input placeholder="Domain (optional)" value={newDomain} onChange={e => setNewDomain(e.target.value)} />
          <Button onClick={createKey} className="w-full"><Plus className="h-4 w-4 mr-1" />Create</Button>
        </CardContent>
      </Card>
      {keys.map(k => (
        <Card key={k.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{k.name}</p>
              <code className="text-[10px] text-orange-600 truncate block">{k.api_key}</code>
              <p className="text-[10px] text-muted-foreground">{k.requests_count} requests</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(k.api_key); toast.success('Copied!'); }}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteKey(k.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminApiManager;
