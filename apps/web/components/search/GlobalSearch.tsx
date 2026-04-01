'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X, Loader2, User, Building, Home, FileText, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api';

// Types
interface SearchResult {
  id: string;
  type: 'client' | 'lead' | 'property' | 'deal';
  typeAr: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnailUrl?: string;
  status?: string;
  statusAr?: string;
  metadata?: Record<string, any>;
  relevance: number;
  createdAt: string;
}

interface SearchResultsByType {
  type: string;
  typeAr: string;
  count: number;
  items: SearchResult[];
}

interface SearchResponse {
  query: string;
  totalResults: number;
  searchTimeMs: number;
  results: SearchResultsByType[];
  allResults: SearchResult[];
}

// Type icons
const TYPE_ICONS: Record<string, typeof User> = {
  client: User,
  lead: User,
  property: Home,
  deal: FileText,
};

// Type colors
const TYPE_COLORS: Record<string, string> = {
  client: 'text-blue-600 bg-blue-50',
  lead: 'text-purple-600 bg-purple-50',
  property: 'text-green-600 bg-green-50',
  deal: 'text-orange-600 bg-orange-50',
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function GlobalSearch() {
  const t = useTranslations('search');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = results?.allResults.length || suggestions.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            if (results && results.allResults[selectedIndex]) {
              navigateToResult(results.allResults[selectedIndex]);
            } else if (suggestions[selectedIndex]) {
              setQuery(suggestions[selectedIndex]);
            }
          }
          break;
        case 'Escape':
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, suggestions]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setResults(null);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await apiClient.getSearchSuggestions(debouncedQuery, 5);
        setSuggestions(response.data || []);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Perform search when query is stable
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.globalSearch(debouncedQuery, undefined, 5);
        setResults(response.data);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Navigate to result
  const navigateToResult = useCallback((result: SearchResult) => {
    const routes: Record<string, string> = {
      client: '/clients',
      lead: '/leads',
      property: '/properties',
      deal: '/deals',
    };
    router.push(`${routes[result.type]}/${result.id}`);
    setIsOpen(false);
    setQuery('');
    setResults(null);
  }, [router]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Format price
  const formatPrice = (price: number, currency: string = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={t('placeholder')}
          className="w-full h-10 pr-10 pl-8 text-sm bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
          autoComplete="off"
        />
        {query && !isLoading && (
          <button
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.length >= 2 && (results || suggestions.length > 0) && (
        <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[70vh] overflow-y-auto z-50">
          {/* Search time */}
          {results && (
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 flex items-center justify-between">
              <span>{t('resultsCount', { count: results.totalResults })}</span>
              <span>{t('searchTime', { time: results.searchTimeMs })}</span>
            </div>
          )}

          {/* Results by type */}
          {results?.results.map((group) => (
            <div key={group.type} className="border-b border-gray-100 last:border-0">
              <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 flex items-center justify-between">
                <span>{group.typeAr}</span>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                  {group.count}
                </span>
              </div>
              {group.items.map((item) => {
                const Icon = TYPE_ICONS[item.type] || User;
                const globalIndex = results.allResults.findIndex(r => r.id === item.id);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateToResult(item)}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-right hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Icon or Thumbnail */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        TYPE_COLORS[item.type]
                      }`}
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {item.title}
                        </span>
                        {item.statusAr && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
                            {item.statusAr}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
                      )}
                      {/* Price for properties */}
                      {item.metadata?.price && (
                        <p className="text-sm font-medium text-primary mt-1">
                          {formatPrice(item.metadata.price, item.metadata.currency)}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          ))}

          {/* No results */}
          {results && results.totalResults === 0 && (
            <div className="px-4 py-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('noResults')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('noResultsHint')}</p>
            </div>
          )}

          {/* Suggestions (when no results yet) */}
          {!results && suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                {t('suggestions')}
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(suggestion)}
                  className={`w-full px-4 py-2 text-right hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    index === selectedIndex ? 'bg-primary/5' : ''
                  }`}
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Keyboard hints */}
          {results && results.totalResults > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd>
                <span>{t('navigate')}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
                <span>{t('select')}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd>
                <span>{t('close')}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
