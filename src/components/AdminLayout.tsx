import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Map, Package, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h2 className="text-xl font-bold">Administration</h2>
        </div>
        <nav className="mt-8">
          <a
            href="/admin/points"
            className="flex items-center px-4 py-3 hover:bg-gray-700 transition-colors"
          >
            <Package className="mr-3" size={20} />
            Points de livraison
          </a>
          <a
            href="/admin/map"
            className="flex items-center px-4 py-3 hover:bg-gray-700 transition-colors"
          >
            <Map className="mr-3" size={20} />
            Carte
          </a>
          <a
            href="/"
            className="flex items-center px-4 py-3 hover:bg-gray-700 transition-colors text-green-400"
          >
            <Home className="mr-3" size={20} />
            Retour au site
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 hover:bg-gray-700 transition-colors text-red-400"
          >
            <LogOut className="mr-3" size={20} />
            Déconnexion
          </button>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-100">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}