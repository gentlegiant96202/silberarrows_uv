"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function TestPermissionsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: 'uv_crm'
      });
      setResults({ data, error, success: !error });
    } catch (err) {
      setResults({ error: err, success: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      testPermissions();
    }
  }, [user]);

  if (!user) {
    return <div className="p-6 text-white">Please login first</div>;
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Permission Function Test</h1>
        
        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <h2 className="text-white font-semibold mb-2">User Info:</h2>
          <p className="text-white/70">ID: {user.id}</p>
          <p className="text-white/70">Email: {user.email}</p>
        </div>

        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <h2 className="text-white font-semibold mb-2">RPC Test Results:</h2>
          {loading ? (
            <p className="text-yellow-400">Testing...</p>
          ) : (
            <div className="space-y-2">
              <p className={`font-semibold ${results.success ? 'text-green-400' : 'text-red-400'}`}>
                Status: {results.success ? '✅ SUCCESS' : '❌ FAILED'}
              </p>
              
              {results.data && (
                <div>
                  <p className="text-white/70">Permissions found:</p>
                  <pre className="text-green-300 text-sm bg-black/30 p-2 rounded mt-1">
                    {JSON.stringify(results.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {results.error && (
                <div>
                  <p className="text-white/70">Error:</p>
                  <pre className="text-red-300 text-sm bg-black/30 p-2 rounded mt-1">
                    {JSON.stringify(results.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          onClick={testPermissions}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Retest Permissions'}
        </button>

        <div className="mt-6">
          <a href="/module-selection" className="text-blue-400 hover:underline">
            ← Back to Module Selection
          </a>
        </div>
      </div>
    </div>
  );
} 