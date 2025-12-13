import React, { useState, useEffect } from 'react';

interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
    high: number;
    low: number;
}

interface ForecastDay {
    day: string;
    high: number;
    low: number;
    icon: string;
}

const weatherCodeToIcon: Record<number, { icon: string; condition: string }> = {
    0: { icon: 'wb_sunny', condition: 'Clear' },
    1: { icon: 'wb_sunny', condition: 'Mostly Clear' },
    2: { icon: 'partly_cloudy_day', condition: 'Partly Cloudy' },
    3: { icon: 'cloud', condition: 'Overcast' },
    45: { icon: 'foggy', condition: 'Foggy' },
    48: { icon: 'foggy', condition: 'Foggy' },
    51: { icon: 'grain', condition: 'Light Drizzle' },
    53: { icon: 'grain', condition: 'Drizzle' },
    55: { icon: 'grain', condition: 'Heavy Drizzle' },
    61: { icon: 'rainy', condition: 'Light Rain' },
    63: { icon: 'rainy', condition: 'Rain' },
    65: { icon: 'rainy', condition: 'Heavy Rain' },
    71: { icon: 'ac_unit', condition: 'Light Snow' },
    73: { icon: 'ac_unit', condition: 'Snow' },
    75: { icon: 'ac_unit', condition: 'Heavy Snow' },
    80: { icon: 'rainy', condition: 'Rain Showers' },
    81: { icon: 'rainy', condition: 'Rain Showers' },
    82: { icon: 'thunderstorm', condition: 'Heavy Showers' },
    95: { icon: 'thunderstorm', condition: 'Thunderstorm' },
    96: { icon: 'thunderstorm', condition: 'Thunderstorm' },
    99: { icon: 'thunderstorm', condition: 'Severe Thunderstorm' },
};

const getWeatherInfo = (code: number) => {
    return weatherCodeToIcon[code] || { icon: 'wb_sunny', condition: 'Unknown' };
};

const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const Weather = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [forecast, setForecast] = useState<ForecastDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [locationName, setLocationName] = useState('Detecting location...');

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
                );
                const data = await response.json();
                
                const current = data.current;
                const daily = data.daily;
                const weatherInfo = getWeatherInfo(current.weather_code);

                setWeather({
                    location: locationName,
                    temperature: Math.round(current.temperature_2m),
                    condition: weatherInfo.condition,
                    icon: weatherInfo.icon,
                    humidity: current.relative_humidity_2m,
                    windSpeed: Math.round(current.wind_speed_10m),
                    feelsLike: Math.round(current.apparent_temperature),
                    high: Math.round(daily.temperature_2m_max[0]),
                    low: Math.round(daily.temperature_2m_min[0]),
                });

                const forecastDays: ForecastDay[] = [];
                for (let i = 0; i < 5 && i < daily.time.length; i++) {
                    forecastDays.push({
                        day: getDayName(daily.time[i]),
                        high: Math.round(daily.temperature_2m_max[i]),
                        low: Math.round(daily.temperature_2m_min[i]),
                        icon: getWeatherInfo(daily.weather_code[i]).icon,
                    });
                }
                setForecast(forecastDays);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch weather data');
                setLoading(false);
            }
        };

        const getLocationName = async (lat: number, lon: number) => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                );
                const data = await response.json();
                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Your Location';
                const country = data.address?.country_code?.toUpperCase() || '';
                setLocationName(`${city}${country ? ', ' + country : ''}`);
                return `${city}${country ? ', ' + country : ''}`;
            } catch {
                return 'Your Location';
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    await getLocationName(latitude, longitude);
                    fetchWeather(latitude, longitude);
                },
                () => {
                    setLocationName('San Francisco, CA');
                    fetchWeather(37.7749, -122.4194);
                }
            );
        } else {
            setLocationName('San Francisco, CA');
            fetchWeather(37.7749, -122.4194);
        }
    }, []);

    if (loading) {
        return (
            <div className="h-full bg-background-dark p-4 flex items-center justify-center">
                <div className="text-white/60">Loading weather...</div>
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="h-full bg-background-dark p-4 flex items-center justify-center">
                <div className="text-red-400">{error || 'Unable to load weather'}</div>
            </div>
        );
    }

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-black/20 rounded-xl p-6 flex flex-col items-center">
                <div className="text-white/60 text-lg">{locationName}</div>
                <span className="material-symbols-outlined text-7xl text-orange-400 my-4">{weather.icon}</span>
                <div className="text-6xl font-light text-white">{weather.temperature}°C</div>
                <div className="text-white/80 text-xl mt-2">{weather.condition}</div>
                <div className="text-white/60 mt-1">
                    H: {weather.high}° L: {weather.low}°
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
                <div className="text-white/60 text-sm mb-3">Details</div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-white/60 text-2xl">thermostat</span>
                        <span className="text-white/60 text-xs mt-1">Feels Like</span>
                        <span className="text-white text-lg">{weather.feelsLike}°</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-white/60 text-2xl">water_drop</span>
                        <span className="text-white/60 text-xs mt-1">Humidity</span>
                        <span className="text-white text-lg">{weather.humidity}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-white/60 text-2xl">air</span>
                        <span className="text-white/60 text-xs mt-1">Wind</span>
                        <span className="text-white text-lg">{weather.windSpeed} km/h</span>
                    </div>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
                <div className="text-white/60 text-sm mb-3">5-Day Forecast</div>
                <div className="flex justify-between">
                    {forecast.map((day, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <span className="text-white/60 text-sm">{day.day}</span>
                            <span className="material-symbols-outlined text-orange-400 text-2xl my-2">{day.icon}</span>
                            <span className="text-white text-sm">{day.high}°</span>
                            <span className="text-white/40 text-sm">{day.low}°</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
