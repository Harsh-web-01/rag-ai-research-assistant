"use client";

import React, { useState } from 'react';
import { UploadCloud, CheckCircle, Send, FileText } from 'lucide-react';

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
}

function queryEndpoint(): string {
  const base = apiBase();
  return base ? `${base}/query` : '/api/query';
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.status === 404
        ? 'API not found. For Docker/static builds, set NEXT_PUBLIC_API_URL at build time.'
        : `Invalid response (${res.status}). Check the network tab for details.`
    );
  }
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle'|'uploading'|'success'>('idle');
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState<{role: 'user'|'assistant', content: string, sources?: string[]}[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });
      const data = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || data.error || !data.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      setUploadStatus('success');
    } catch (err) {
      console.error(err);
      setUploadStatus('idle');
      alert('Upload failed: ' + (err as Error).message);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newChat = [...chat, { role: 'user' as const, content: query }];
    setChat(newChat);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch(queryEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await readJsonResponse<{
        answer?: string;
        sources?: string[];
        error?: string;
      }>(res);

      if (!res.ok || data.error) {
        setChat([
          ...newChat,
          {
            role: 'assistant',
            content: data.error || `Request failed (${res.status}).`,
          },
        ]);
        return;
      }

      setChat([
        ...newChat,
        {
          role: 'assistant',
          content: data.answer || "Sorry, I couldn't find an answer.",
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setChat([
        ...newChat,
        {
          role: 'assistant',
          content:
            'Error connecting to AI Assistant: ' +
            (err instanceof Error ? err.message : 'Unknown error'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="panel upload-panel">
        <h2><FileText className="inline-block mr-2" size={24} style={{verticalAlign: 'middle', marginRight: '8px'}}/> Documents</h2>
        <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem'}}>
          Upload research papers (PDF) to build your knowledge base.
        </p>

        <label className="upload-box">
          {uploadStatus === 'success' ? (
            <>
              <CheckCircle size={48} color="var(--accent)" />
              <h3 style={{marginTop: '1rem'}}>Upload Complete</h3>
              <p style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{file?.name}</p>
            </>
          ) : uploadStatus === 'uploading' ? (
            <>
              <div className="loader"></div>
              <p style={{marginTop: '1rem', color: 'var(--text-muted)'}}>Processing Document...</p>
            </>
          ) : (
            <>
              <UploadCloud size={48} color="var(--text-muted)" />
              <h3 style={{marginTop: '1rem'}}>Select PDF Document</h3>
              <input type="file" accept=".pdf" onChange={handleFileChange} style={{display:'none'}} />
            </>
          )}
        </label>
        
        {file && uploadStatus === 'idle' && (
          <button onClick={uploadFile} style={{marginTop: '1.5rem', width: '100%', padding: '1rem'}}>
            Upload & Process
          </button>
        )}
      </div>

      <div className="panel chat-panel">
        <h2>AI Research Assistant</h2>
        <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Ask questions about your uploaded documents.</p>

        <div className="chat-history">
          {chat.length === 0 && (
            <div style={{margin: 'auto', textAlign:'center', color:'var(--text-muted)'}}>
              <p>No messages yet. Ask a question to get started!</p>
            </div>
          )}
          {chat.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div>{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <strong>Sources:</strong> {msg.sources.join(', ')}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="loader" style={{width: 16, height: 16, borderWidth: 2}}></div>
            </div>
          )}
        </div>

        <form className="input-area" onSubmit={handleAsk}>
          <input 
            type="text" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="E.g., What are the key findings?" 
            disabled={loading}
          />
          <button type="submit" disabled={loading || !query.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
