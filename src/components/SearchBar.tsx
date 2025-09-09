import { useState, useCallback, memo } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LocationData } from '@/types/weather';
import { weatherService } from '@/lib/weather';

// Ülke kodlarını Türkçe isimlerle eşleştir
const getCountryName = (countryCode: string): string => {
  const countryNames: Record<string, string> = {
    'TR': 'Türkiye',
    'US': 'Amerika Birleşik Devletleri',
    'GB': 'Birleşik Krallık',
    'DE': 'Almanya',
    'FR': 'Fransa',
    'IT': 'İtalya',
    'ES': 'İspanya',
    'GR': 'Yunanistan',
    'BG': 'Bulgaristan',
    'RO': 'Romanya',
    'UA': 'Ukrayna',
    'RU': 'Rusya',
  };
  
  return countryNames[countryCode] || countryCode;
};

// Debounce hook for search optimization
const useDebounce = (callback: Function, delay: number) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout>();

  const debouncedCallback = useCallback((...args: any[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    const timer = setTimeout(() => callback(...args), delay);
    setDebounceTimer(timer);
  }, [callback, delay, debounceTimer]);

  return debouncedCallback;
};

interface SearchBarProps {
  onLocationSelect: (lat: number, lon: number) => void;
}

export const SearchBar = memo(({ onLocationSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const locations = await weatherService.searchLocation(searchQuery);
      // Türkiye sonuçlarını önceliklendir
      const prioritizedLocations = locations.filter(loc => loc.country === 'TR')
        .concat(locations.filter(loc => loc.country !== 'TR'));
      
      setSuggestions(prioritizedLocations.slice(0, 5));
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search to prevent too many API calls
  const debouncedSearch = useDebounce(handleSearch, 300);

  const handleLocationSelect = (location: LocationData) => {
    onLocationSelect(location.lat, location.lon);
    setQuery(`${location.name}, ${location.country}`);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleCurrentLocation = async () => {
    try {
      const position = await weatherService.getCurrentPosition();
      onLocationSelect(position.lat, position.lon);
      setQuery('Mevcut Konum');
      setShowSuggestions(false);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Şehir ara..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className="pl-10 glass border-white/20 text-foreground placeholder:text-muted-foreground"
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </div>
        <Button
          onClick={handleCurrentLocation}
          variant="secondary"
          size="icon"
          className="glass border-white/20 hover:bg-white/20"
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 glass border-white/20 z-50">
          <div className="p-2">
            {suggestions.map((location, index) => (
              <button
                key={`${location.lat}-${location.lon}-${index}`}
                onClick={() => handleLocationSelect(location)}
                className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-smooth group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-foreground group-hover:text-white transition-colors">
                      {location.name}
                    </div>
                    <div className="text-sm text-muted-foreground group-hover:text-white/80">
                      {location.state && `${location.state}, `}
                      <span className={location.country === 'TR' ? 'font-medium text-primary' : ''}>
                        {getCountryName(location.country)}
                      </span>
                    </div>
                  </div>
                  {location.country === 'TR' && (
                    <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      TR
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2">
          <Card className="glass border-white/20">
            <div className="p-4 text-center text-muted-foreground">
              Aranıyor...
            </div>
          </Card>
        </div>
      )}
    </div>
  );
});