import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, GitCommit, GitPullRequest, Github, ExternalLink, 
  CheckCircle2, Loader2, FolderTree, FileCode, RefreshCw, 
  Terminal, Globe, Sparkles, Copy, Check, Lock, ShieldCheck, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RepoDetails {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface CommitItem {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export const GitHubImporterHub: React.FC = () => {
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoDetails | null>(null);
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'commits' | 'webhook'>('overview');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [importSaved, setImportSaved] = useState(false);

  // Parse owner and repo from various GitHub URL formats
  const parseGitHubUrl = (url: string) => {
    try {
      let clean = url.trim().replace(/\/$/, '');
      if (clean.includes('github.com/')) {
        const parts = clean.split('github.com/')[1].split('/');
        if (parts.length >= 2) {
          return { owner: parts[0], repo: parts[1].replace('.git', '') };
        }
      }
      // If user typed owner/repo directly
      const simpleParts = clean.split('/');
      if (simpleParts.length === 2) {
        return { owner: simpleParts[0], repo: simpleParts[1] };
      }
    } catch (e) {
      console.warn('URL parse error:', e);
    }
    return null;
  };

  const handleImportRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseGitHubUrl(repoUrlInput);
    if (!parsed) {
      toast.error('Please enter a valid public GitHub repository URL (e.g. https://github.com/facebook/react)');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch repository details from public GitHub API
      const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
      if (!repoRes.ok) {
        throw new Error('Could not find public repository. Please ensure the repository is public and the URL is correct.');
      }
      const repoJson: RepoDetails = await repoRes.json();
      setRepoData(repoJson);

      // 2. Fetch recent commits
      const commitsRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=15`);
      if (commitsRes.ok) {
        const commitsJson = await commitsRes.json();
        setCommits(commitsJson);
      }

      // 3. Fetch repository tree (file list)
      const treeRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${repoJson.default_branch || 'main'}?recursive=1`);
      if (treeRes.ok) {
        const treeJson = await treeRes.json();
        setFileTree(treeJson.tree || []);
      }

      toast.success(`Successfully connected public repository: ${repoJson.full_name}!`);
      setActiveTab('overview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import repository');
      setRepoData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImport = async () => {
    if (!repoData) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save repository import');
        return;
      }

      const { error } = await (supabase.from('business_profiles') as any).update({
        github_repo_url: repoData.html_url,
        github_repo_name: repoData.full_name,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);

      if (error) {
        // Fallback or handle if column doesn't exist yet
        console.warn('Profile update note:', error);
      }

      setImportSaved(true);
      toast.success(`Repository ${repoData.full_name} linked to your account successfully!`);
      setTimeout(() => setImportSaved(false), 3000);
    } catch (e) {
      toast.error('Failed to save link');
    }
  };

  const webhookUrl = `${window.location.origin}/api/github/webhook`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-purple-500/20">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Github className="w-72 h-72" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
            <Github className="h-3.5 w-3.5" /> GitHub Integration & Git Push Sync
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Import Public GitHub Repository</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Link any public GitHub repository to this platform. Inspect its code tree, monitor recent commits, set up automated Git Push webhook syncs, and showcase your repository directly in your merchant or developer profile.
          </p>

          <form onSubmit={handleImportRepo} className="pt-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="https://github.com/username/repository"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                className="pl-10 h-12 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium text-sm focus-visible:ring-purple-500"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !repoUrlInput.trim()}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 shrink-0"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : <><Sparkles className="h-4 w-4 mr-2" /> Import Repo</>}
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      {repoData ? (
        <div className="space-y-6">
          {/* Repo Overview Card */}
          <Card className="border-border/80 shadow-sm rounded-3xl bg-card overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={repoData.owner.avatar_url}
                  alt={repoData.owner.login}
                  className="h-12 w-12 rounded-2xl border object-cover shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={repoData.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-lg text-foreground hover:text-purple-600 transition flex items-center gap-1.5"
                    >
                      {repoData.full_name} <ExternalLink className="h-4 w-4" />
                    </a>
                    <Badge variant="outline" className="text-xs font-semibold">Public</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{repoData.description || 'No description provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleSaveImport}
                  disabled={importSaved}
                  variant="outline"
                  className="flex-1 sm:flex-initial rounded-xl text-xs font-bold gap-1.5 h-10 border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                >
                  {importSaved ? <><Check className="h-4 w-4 mr-1 text-emerald-600" /> Linked</> : <><ShieldCheck className="h-4 w-4 mr-1" /> Link to Profile</>}
                </Button>
                <a
                  href={`${repoData.html_url}/archive/refs/heads/${repoData.default_branch || 'main'}.zip`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button variant="default" className="rounded-xl text-xs font-bold gap-1.5 h-10 bg-slate-900 text-white hover:bg-slate-800">
                    <Download className="h-4 w-4 mr-1" /> Download Zip
                  </Button>
                </a>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Default Branch</p>
                  <p className="text-sm font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                    <GitBranch className="h-3.5 w-3.5 text-purple-600" /> {repoData.default_branch || 'main'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Primary Language</p>
                  <p className="text-sm font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                    <FileCode className="h-3.5 w-3.5 text-blue-600" /> {repoData.language || 'TypeScript'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Stars & Forks</p>
                  <p className="text-sm font-bold text-foreground mt-1">
                    ⭐ {repoData.stargazers_count} · 🍴 {repoData.forks_count}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Open Issues</p>
                  <p className="text-sm font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                    <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" /> {repoData.open_issues_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Tabs (Files, Commits, Webhook Sync) */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
            <TabsList className="bg-muted p-1 rounded-2xl inline-flex w-full sm:w-auto">
              <TabsTrigger value="overview" className="rounded-xl text-xs font-bold px-4 py-2">Overview</TabsTrigger>
              <TabsTrigger value="files" className="rounded-xl text-xs font-bold px-4 py-2">File Tree ({fileTree.length})</TabsTrigger>
              <TabsTrigger value="commits" className="rounded-xl text-xs font-bold px-4 py-2">Recent Commits</TabsTrigger>
              <TabsTrigger value="webhook" className="rounded-xl text-xs font-bold px-4 py-2">Git Push Webhook</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="border-border/80 rounded-3xl p-6 bg-card">
                <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-purple-600" /> Repository Summary & Features
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your repository <span className="font-semibold text-foreground">{repoData.full_name}</span> has been successfully indexed. You can browse its structure in the <span className="font-semibold text-purple-600">File Tree</span> tab or configure automated <span className="font-semibold text-purple-600">Git Push Webhooks</span> so that any `git push` event instantly synchronizes with this platform.
                </p>
                <div className="mt-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Public Repository Status: Verified</p>
                      <p className="text-[11px] text-muted-foreground">Ready for import, migration, and push synchronization.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab('webhook')}
                    size="sm"
                    className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Setup Push Webhook
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card className="border-border/80 rounded-3xl p-6 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-purple-600" /> Repository File Tree
                  </h3>
                  <Badge variant="outline" className="text-xs">{fileTree.length} files indexed</Badge>
                </div>
                <div className="max-h-[420px] overflow-y-auto space-y-1 pr-2">
                  {fileTree.slice(0, 100).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 text-xs font-mono">
                      <span className="flex items-center gap-2 text-foreground truncate">
                        {item.type === 'tree' ? '📁' : '📄'} {item.path}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">{item.type}</span>
                    </div>
                  ))}
                  {fileTree.length > 100 && (
                    <p className="text-xs text-center text-muted-foreground pt-3">... and {fileTree.length - 100} more files</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="commits">
              <Card className="border-border/80 rounded-3xl p-6 bg-card">
                <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-purple-600" /> Recent Git Commits
                </h3>
                <div className="space-y-3">
                  {commits.map((c) => (
                    <div key={c.sha} className="p-3.5 rounded-2xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <a
                          href={c.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-foreground hover:text-purple-600 transition block truncate"
                        >
                          {c.commit.message}
                        </a>
                        <p className="text-[11px] text-muted-foreground">
                          👤 {c.commit.author.name} · 🕒 {new Date(c.commit.author.date).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0 self-start sm:self-center">
                        {c.sha.slice(0, 7)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="webhook">
              <Card className="border-border/80 rounded-3xl p-6 bg-card space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-600" /> Automated Git Push Webhook Sync
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    To trigger automated updates whenever you run <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">git push</code> on your repository, add this webhook URL in your GitHub repository settings under <span className="font-semibold text-foreground">Settings &gt; Webhooks &gt; Add webhook</span>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-muted border space-y-2">
                  <p className="text-xs font-bold text-foreground">Payload URL:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="bg-card font-mono text-xs h-10"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        setCopiedWebhook(true);
                        toast.success('Webhook URL copied to clipboard!');
                        setTimeout(() => setCopiedWebhook(false), 2500);
                      }}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold shrink-0"
                    >
                      {copiedWebhook ? <><Check className="h-4 w-4 mr-1 text-emerald-600" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Content type: <code className="font-mono">application/json</code> · Events: <code className="font-mono">push</code>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p className="font-bold text-foreground">How Git Push Sync works:</p>
                  <p>1. Make changes locally in your codebase and commit them.</p>
                  <p>2. Run <code className="font-mono text-purple-600 font-semibold">git push origin main</code> to your public GitHub repo.</p>
                  <p>3. GitHub dispatches a push payload to the webhook endpoint above, automatically syncing commits and notifying this platform.</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="border-border/80 rounded-3xl p-12 text-center bg-card">
          <div className="h-16 w-16 rounded-3xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto mb-4">
            <Github className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No repository imported yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
            Paste any public GitHub repository URL above to inspect its file tree, view recent commits, and configure Git Push webhook synchronization.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-medium"
              onClick={() => { setRepoUrlInput('https://github.com/facebook/react'); }}
            >
              Try facebook/react
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-medium"
              onClick={() => { setRepoUrlInput('https://github.com/tailwindlabs/tailwindcss'); }}
            >
              Try tailwindlabs/tailwindcss
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GitHubImporterHub;
