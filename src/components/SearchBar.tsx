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
    'PL': 'Polonya',
    'NL': 'Hollanda',
    'BE': 'Belçika',
    'AT': 'Avusturya',
    'CH': 'İsviçre',
    'SE': 'İsveç',
    'NO': 'Norveç',
    'DK': 'Danimarka',
    'FI': 'Finlandiya',
    'IE': 'İrlanda',
    'PT': 'Portekiz',
    'CZ': 'Çek Cumhuriyeti',
    'HU': 'Macaristan',
    'SK': 'Slovakya',
    'SI': 'Slovenya',
    'HR': 'Hırvatistan',
    'BA': 'Bosna Hersek',
    'RS': 'Sırbistan',
    'ME': 'Karadağ',
    'MK': 'Kuzey Makedonya',
    'AL': 'Arnavutluk',
  };
  
  return countryNames[countryCode] || countryCode;
};

// Gelişmiş konum formatı
const formatLocationDisplay = (location: LocationData): { primary: string; secondary: string; fullName: string } => {
  const countryName = getCountryName(location.country);
  
  // Türkiye için özel formatlar
  if (location.country === 'TR') {
    if (location.state && location.state !== location.name) {
      // İlçe/Mahalle durumu: "Çayırova/Kocaeli"
      return {
        primary: location.name,
        secondary: `${location.state}, ${countryName}`,
        fullName: `${location.name}, ${location.state}`
      };
    } else {
      // Ana şehir: "İstanbul, Türkiye"
      return {
        primary: location.name,
        secondary: countryName,
        fullName: `${location.name}, ${countryName}`
      };
    }
  }
  
  // Diğer ülkeler için
  if (location.state && location.state !== location.name) {
    return {
      primary: location.name,
      secondary: `${location.state}, ${countryName}`,
      fullName: `${location.name}, ${location.state}, ${countryName}`
    };
  }
  
  return {
    primary: location.name,
    secondary: countryName,
    fullName: `${location.name}, ${countryName}`
  };
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
      setSuggestions(locations.slice(0, 8)); // API'den gelen sıralamayı kullan
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
  const debouncedSearch = useDebounce(handleSearch, 250); // Biraz daha hızlı yap

  const handleLocationSelect = (location: LocationData) => {
    const formatted = formatLocationDisplay(location);
    onLocationSelect(location.lat, location.lon);
    setQuery(formatted.fullName);
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
            placeholder="Şehir, ilçe veya bölge ara... (örn: Çayırova, Kocaeli)"
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
            {suggestions.map((location, index) => {
              const formatted = formatLocationDisplay(location);
              return (
                <button
                  key={`${location.lat}-${location.lon}-${index}`}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-smooth group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground group-hover:text-white transition-colors">
                        {formatted.primary}
                        {location.country === 'TR' && location.state && location.state !== location.name && (
                          <span className="text-primary font-normal"> / {location.state}</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground group-hover:text-white/80">
                        {formatted.secondary}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {location.country === 'TR' && (
                        <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                          TR
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(location.lat * 100) / 100}°, {Math.round(location.lon * 100) / 100}°
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
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