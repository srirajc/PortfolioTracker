'use client';

import React, { useState } from 'react';

export default function CsvUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload CSV');

      setMessage(`✅ ${data.message}`);
      onUploadComplete();
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-8 text-center transition-colors">
      <h3 className="text-lg font-bold text-white mb-2">📥 Upload Broker CSV Report</h3>
      <p className="text-sm text-slate-400 mb-4">
        Supports SelfWealth, Vanguard, & CoinSpot reports (Trades, Holdings, or Movements CSV)
      </p>
      
      <label className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg cursor-pointer transition-colors">
        {uploading ? 'Processing CSV...' : 'Select CSV File'}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {message && (
        <p className="mt-4 text-sm font-semibold text-slate-200 bg-slate-900/60 p-2 rounded border border-slate-700">
          {message}
        </p>
      )}
    </div>
  );
}
