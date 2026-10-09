import React, { useState } from 'react';
import { Search, Container } from 'lucide-react';

export default function SearchBar({ onSearch, containers = [], currentSelectedId }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim().toUpperCase());
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg mb-4 sm:mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <form onSubmit={handleFormSubmit} className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Container ID (e.g. CNT-1001)..."
            className="w-full pl-9 sm:pl-11 pr-20 sm:pr-24 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-xs sm:text-sm"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 sm:right-1.5 sm:top-1.5 sm:bottom-1.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-semibold rounded-md transition-colors shadow"
          >
            Lookup
          </button>
        </form>

        {containers.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
              <Container className="w-3.5 h-3.5" /> Quick Select:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {containers.map((c) => {
                const isSelected = c.containerId === currentSelectedId;
                return (
                  <button
                    key={c.containerId}
                    onClick={() => {
                      setSearchTerm(c.containerId);
                      onSearch(c.containerId);
                    }}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-mono font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                    }`}
                  >
                    {c.containerId}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
