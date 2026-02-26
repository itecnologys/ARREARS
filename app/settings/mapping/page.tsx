
'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '../../../components/AppLayout';
import { createClient } from '@supabase/supabase-js';

// Load env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function MappingPage() {
  const [sample, setSample] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mappings, setMappings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
        setError("Supabase credentials missing");
        setLoading(false);
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    async function fetchSample() {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('raw_data')
        .not('raw_data', 'is', null)
        .limit(1)
        .maybeSingle();

      if (error) {
        setError('Error: ' + error.message);
      } else if (data && data.raw_data) {
        setSample(data.raw_data);
      } else {
        setError('No raw data found. Please upload a file first.');
      }
      setLoading(false);
    }
    fetchSample();
  }, []);

  const handleSelectChange = (idx: number, field: string) => {
      setMappings(prev => {
          const newMap = { ...prev };
          // Remove field if it was mapped elsewhere
          Object.keys(newMap).forEach(key => {
              if (newMap[key] === idx) delete newMap[key];
          });
          
          if (field) {
              // Remove index if field was mapped elsewhere
              if (newMap[field] !== undefined) {
                  // Optional: warn or clear old index
              }
              newMap[field] = idx;
          }
          return newMap;
      });
  };

  const getFieldForIndex = (idx: number) => {
      return Object.keys(mappings).find(key => mappings[key] === idx) || '';
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Data Mapping Settings</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {sample && sample.original_row && Array.isArray(sample.original_row) ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Sample Row (Source: {sample.source})</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-500 border">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 border">Index</th>
                    <th className="px-4 py-3 border">Value</th>
                    <th className="px-4 py-3 border">Map to Field</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.original_row.map((val: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 border font-mono text-gray-400">{idx}</td>
                      <td className="px-4 py-2 border font-medium text-gray-900">{String(val)}</td>
                      <td className="px-4 py-2 border">
                        <select 
                          className="border rounded p-1 text-sm w-full"
                          value={getFieldForIndex(idx)}
                          onChange={(e) => handleSelectChange(idx, e.target.value)}
                        >
                          <option value="">-- Ignore --</option>
                          <option value="transaction_date">Transaction Date</option>
                          <option value="amount">Amount</option>
                          <option value="transaction_type">Type</option>
                          <option value="details">Details</option>
                          <option value="reference">Reference</option>
                          <option value="transaction_no">Transaction No</option>
                          <option value="sage_id">Sage ID (A/C)</option>
                          <option value="tenant_name">Tenant Name</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded">
                <h4 className="font-bold mb-2">Current Mappings:</h4>
                <pre className="text-xs bg-gray-200 p-2 rounded">{JSON.stringify(mappings, null, 2)}</pre>
            </div>
          </div>
        ) : (
             !loading && <div className="text-gray-500">No array data found in sample.</div>
        )}
      </div>
    </AppLayout>
  );
}
