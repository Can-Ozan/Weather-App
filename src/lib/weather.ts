import { WeatherData, ForecastData, LocationData } from '@/types/weather';

const API_KEY = '61e5ca145b2a29a6720c45b8cf71dab7';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// Simple cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const weatherService = {
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`
    );
    
    if (!response.ok) {
      throw new Error('Hava durumu verileri alınamadı');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  },

  async getForecast(lat: number, lon: number): Promise<ForecastData> {
    const cacheKey = `forecast_${lat}_${lon}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`
    );
    
    if (!response.ok) {
      throw new Error('Tahmin verileri alınamadı');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  },

  async searchLocation(query: string): Promise<LocationData[]> {
    const cacheKey = `search_${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const response = await fetch(
      `${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=10&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Konum arama başarısız');
    }
    
    const locations = await response.json();
    
    // Türkiye'deki şehirleri önceliklendir ve sonuçları sırala
    const sortedLocations = locations
      .sort((a: LocationData, b: LocationData) => {
        // Türkiye'deki şehirleri önce göster
        if (a.country === 'TR' && b.country !== 'TR') return -1;
        if (b.country === 'TR' && a.country !== 'TR') return 1;
        
        // İsim eşleşmesine göre sırala (exact match önce)
        const queryLower = query.toLowerCase();
        const aNameMatch = a.name.toLowerCase().includes(queryLower);
        const bNameMatch = b.name.toLowerCase().includes(queryLower);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (bNameMatch && !aNameMatch) return 1;
        
        return 0;
      })
      .slice(0, 5); // En fazla 5 sonuç
    
    setCachedData(cacheKey, sortedLocations);
    return sortedLocations;
  },

  async getCurrentPosition(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation desteklenmiyor'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error('Konum erişimi reddedildi'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  },

  getWeatherIcon(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  },

  getWeatherBackground(weatherMain: string, isDay: boolean): string {
    const weather = weatherMain.toLowerCase();
    
    if (!isDay) return 'gradient-night';
    
    switch (weather) {
      case 'clear':
        return 'gradient-sunny';
      case 'clouds':
        return 'gradient-cloudy';
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return 'gradient-rainy';
      default:
        return 'gradient-clear';
    }
  },

  formatTemperature(temp: number): string {
    return `${Math.round(temp)}°`;
  },

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  },

  formatTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};