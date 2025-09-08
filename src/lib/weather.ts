import { WeatherData, ForecastData, LocationData } from '@/types/weather';

const API_KEY = '61e5ca145b2a29a6720c45b8cf71dab7';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

export const weatherService = {
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`
    );
    
    if (!response.ok) {
      throw new Error('Hava durumu verileri alınamadı');
    }
    
    return response.json();
  },

  async getForecast(lat: number, lon: number): Promise<ForecastData> {
    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`
    );
    
    if (!response.ok) {
      throw new Error('Tahmin verileri alınamadı');
    }
    
    return response.json();
  },

  async searchLocation(query: string): Promise<LocationData[]> {
    const response = await fetch(
      `${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Konum arama başarısız');
    }
    
    return response.json();
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