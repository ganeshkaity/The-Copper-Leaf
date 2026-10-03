'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Link as LinkIcon,
  X,
  Check,
  Globe,
  Search,
  Loader2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export interface FoodImageResult {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  source: 'TheMealDB' | 'Wikimedia Commons' | 'Wikipedia' | 'Openverse';
}

interface ImageUploadOrLinkProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  aspectHint?: string; // e.g. "16:9 banner" or "1:1 square dish photo"
  placeholder?: string;
  searchQuery?: string; // Pre-fills online search with dish / item name
  className?: string;
}

const QUICK_SEARCH_CHIPS = [
  'Butter Chicken',
  'Biryani',
  'Paneer Tikka',
  'Dal Makhani',
  'Tandoori Roti',
  'Naan',
  'Gulab Jamun',
  'Cocktail',
  'Appetizer',
];

export function ImageUploadOrLink({
  label = 'Image',
  value,
  onChange,
  disabled = false,
  aspectHint,
  placeholder = 'https://images.unsplash.com/photo-...',
  searchQuery = '',
  className = '',
}: ImageUploadOrLinkProps) {
  const [mode, setMode] = useState<'upload' | 'link' | 'online'>(
    value && !value.includes('imgbb.com') ? 'link' : 'upload'
  );
  const [linkInput, setLinkInput] = useState(value || '');
  const [uploading, setUploading] = useState(false);

  // Online search state
  const [onlineQuery, setOnlineQuery] = useState(searchQuery || '');
  const [onlineResults, setOnlineResults] = useState<FoodImageResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (searchQuery && !onlineQuery) {
      setOnlineQuery(searchQuery);
    }
  }, [searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Upload failed');
      }

      onChange(data.url);
      setLinkInput(data.url);
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleApplyLink = () => {
    if (!linkInput.trim()) {
      onChange('');
      return;
    }
    const clean = linkInput.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      toast.error('Please enter a valid URL starting with https:// or http://');
      return;
    }
    onChange(clean);
    toast.success('Image link applied');
  };

  const handleSearchOnline = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : onlineQuery || searchQuery || '').trim();
    if (!term) {
      toast.error('Please enter a dish name or culinary term to search (e.g. "Butter Chicken")');
      return;
    }

    setIsSearchingOnline(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/external/food-image-search?query=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to search images');
      }
      setOnlineResults(data.images || []);
      if (!data.images || data.images.length === 0) {
        toast.info(`No online images found for "${term}". Try another food keyword.`);
      } else {
        toast.success(`Found ${data.images.length} images for "${term}"`);
      }
    } catch (err: any) {
      toast.error('Search error: ' + err.message);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleSelectImage = (img: FoodImageResult) => {
    onChange(img.url);
    setLinkInput(img.url);
    toast.success(`Kept image: "${img.title}"`);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
          {label} {aspectHint && <span className="text-[10px] text-gray-400 font-normal">({aspectHint})</span>}
        </label>

        {/* Mode Toggle: Upload, Link, or Fetch Online */}
        <div className="flex items-center rounded-lg bg-gray-100 dark:bg-[#22222A] p-0.5 text-[11px] font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              mode === 'upload'
                ? 'bg-white dark:bg-[#18181D] text-gray-900 dark:text-white shadow-xs font-semibold'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Upload className="w-3 h-3" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              mode === 'link'
                ? 'bg-white dark:bg-[#18181D] text-gray-900 dark:text-white shadow-xs font-semibold'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            Image Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('online');
              if ((onlineQuery || searchQuery) && onlineResults.length === 0) {
                handleSearchOnline(onlineQuery || searchQuery);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              mode === 'online'
                ? 'bg-white dark:bg-[#18181D] text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
            }`}
          >
            <Globe className="w-3 h-3" />
            Fetch Online
            {onlineResults.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                {onlineResults.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mode 1: File Upload */}
      {mode === 'upload' && (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={disabled || uploading}
            className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50/50 dark:bg-[#22222A]/50"
          />
          {uploading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-[#18181D]/80 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading to ImgBB...</span>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Direct URL Link */}
      {mode === 'link' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="url"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                onChange(e.target.value.trim());
              }}
              placeholder={placeholder}
              className="pl-8 text-xs"
              disabled={disabled}
            />
          </div>
          {linkInput !== value && (
            <Button type="button" size="sm" onClick={handleApplyLink} className="h-9 text-xs">
              <Check className="w-3.5 h-3.5 mr-1" />
              Apply
            </Button>
          )}
        </div>
      )}

      {/* Mode 3: Online Image Fetch & Choice Gallery */}
      {mode === 'online' && (
        <div className="p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={onlineQuery}
                onChange={(e) => setOnlineQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchOnline();
                  }
                }}
                placeholder="Type dish name (e.g. Butter Chicken, Biryani, Naan)..."
                className="pl-8 text-xs h-9 bg-white dark:bg-[#18181D]"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSearchOnline()}
              disabled={isSearchingOnline}
              className="h-9 text-xs shrink-0"
            >
              {isSearchingOnline ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Search Online
                </>
              )}
            </Button>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
            <span className="text-gray-400 font-medium shrink-0">Quick terms:</span>
            {QUICK_SEARCH_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setOnlineQuery(chip);
                  handleSearchOnline(chip);
                }}
                className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181D] text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Search Results Grid */}
          {isSearchingOnline ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-gray-100 dark:bg-[#22222A] animate-pulse flex items-center justify-center text-[10px] text-gray-400"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-gray-300 dark:text-gray-600" />
                </div>
              ))}
            </div>
          ) : onlineResults.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Select an image below to keep for this dish:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {onlineResults.length} photos found
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {onlineResults.map((img) => {
                  const isSelected = value === img.url;
                  return (
                    <div
                      key={img.id}
                      onClick={() => handleSelectImage(img)}
                      className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-sm'
                      }`}
                    >
                      <img
                        src={img.thumbnail || img.url}
                        alt={img.title}
                        className="h-24 w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/400x300/E8E0D5/78716C?text=Food+Photo';
                        }}
                      />

                      {/* Source Badge */}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {img.source}
                      </span>

                      {/* Selected State Overlay */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      {/* Title overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
                        <p className="text-[10px] font-medium text-white truncate drop-shadow-xs">
                          {img.title}
                        </p>
                      </div>

                      {/* Hover action banner */}
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="px-2 py-1 rounded-lg bg-primary text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Keep This Image
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                No culinary images found for &quot;{onlineQuery}&quot;
              </p>
              <p className="text-[11px]">
                Try searching with simplified dish keywords like &quot;Butter Chicken&quot;, &quot;Biryani&quot;, or &quot;Naan&quot;.
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
              <p>Type any dish name above and click <strong>Search Online</strong> to view and choose food photography.</p>
            </div>
          )}
        </div>
      )}

      {/* Live Selected Image Preview */}
      {value && (
        <div className="relative inline-block mt-1 group">
          <div className="flex items-center gap-2.5 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181D]">
            <img
              src={value}
              alt="Selected Preview"
              className="h-16 w-16 object-cover rounded-lg border border-gray-100 dark:border-gray-800"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://placehold.co/400x300/E8E0D5/78716C?text=Invalid+Image+URL';
              }}
            />
            <div className="text-[11px] pr-2 max-w-[200px] truncate">
              <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate">
                Active Photo
              </span>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-[10px]"
              >
                View full image <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setLinkInput('');
              }}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-rose-500 hover:text-white text-gray-500 flex items-center justify-center transition-colors"
              title="Remove Image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
