
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../components/AppLayout';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage('');
      setError('');
      setPreview([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');
    setPreview([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setMessage(`Success! Processed ${data.totalProcessed} records using format: ${data.type}. Inserted: ${data.count}, Skipped (Duplicates): ${data.skipped}`);
      setFile(null);
      if (data.preview) {
        setPreview(data.preview);
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Upload Data</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="file-upload">
              Select File (Excel, CSV, JSON, TXT)
            </label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">XLSX, XLS, CSV, JSON, TXT</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx,.xls,.csv,.json,.txt" />
                </label>
            </div> 
          </div>

          {file && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded border border-blue-200 flex justify-between items-center">
              <span>Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)</span>
              <button 
                onClick={() => setFile(null)}
                className="text-red-500 hover:text-red-700 font-bold ml-4"
              >
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded border border-red-200">
              Error: {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded border border-green-200">
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-6 py-2 rounded text-white font-bold transition-colors ${
                !file || uploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 overflow-x-auto">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold text-gray-800">Preview (First 50 Rows)</h2>
               <button 
                  onClick={() => {
                     const dataStr = JSON.stringify(preview, null, 2);
                     const blob = new Blob([dataStr], { type: 'application/json' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = 'preview_data.json';
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
               >
                 Download JSON Preview
               </button>
             </div>
             <table className="min-w-full text-sm text-left text-gray-500 border-collapse">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 border">Raw Row Data (Full Content)</th>
                        <th className="px-4 py-3 border">Mapped Date</th>
                        <th className="px-4 py-3 border">Mapped Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {preview.map((row, i) => (
                        <tr key={i} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-2 border font-mono text-xs break-all max-w-lg">
                                {row.raw_data ? (
                                   <div className="max-h-32 overflow-y-auto">
                                      <strong>Source:</strong> {row.raw_data.source}<br/>
                                      <strong>Original:</strong> {JSON.stringify(row.raw_data.original_row)}
                                   </div>
                                ) : (
                                   <span className="text-gray-400">No raw data in preview</span>
                                )}
                            </td>
                            <td className="px-4 py-2 border">{row.transaction_date}</td>
                            <td className="px-4 py-2 border">{row.amount}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
        )}

        <div className="mt-8 bg-gray-50 p-6 rounded border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Supported Formats</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li><strong>Sage Report (Block Format):</strong> Excel files with grouped transactions per customer (A/C, Name headers).</li>
            <li><strong>Tabular Data:</strong> Standard Excel/CSV with headers in the first few rows (Date, Amount, Tenant Name, etc.).</li>
            <li><strong>All Fields Loaded:</strong> The system will attempt to extract standard fields (Date, Amount, Ref) and store the entire raw row for future calculations.</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
