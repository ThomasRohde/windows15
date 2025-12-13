import React, { useState } from 'react';

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
    condition: string;
    icon: string;
}

const mockLocations: Record<string, WeatherData> = {
    'San Francisco': {
        location: 'San Francisco, CA',
        temperature: 18,
        condition: 'Partly Cloudy',
        icon: 'partly_cloudy_day',
        humidity: 72,
        windSpeed: 15,
        feelsLike: 17,
        high: 21,
        low: 14,
    },
    'New York': {
        location: 'New York, NY',
        temperature: 8,
        condition: 'Cloudy',
        icon: 'cloud',
        humidity: 65,
        windSpeed: 22,
        feelsLike: 5,
        high: 11,
        low: 4,
    },
    'London': {
        location: 'London, UK',
        temperature: 12,
        condition: 'Rainy',
        icon: 'rainy',
        humidity: 85,
        windSpeed: 18,
        feelsLike: 10,
        high: 14,
        low: 9,
    },
    'Tokyo': {
        location: 'Tokyo, Japan',
        temperature: 22,
        condition: 'Sunny',
        icon: 'wb_sunny',
        humidity: 55,
        windSpeed: 10,
        feelsLike: 23,
        high: 25,
        low: 18,
    },
    'Sydney': {
        location: 'Sydney, Australia',
        temperature: 28,
        condition: 'Clear',
        icon: 'wb_sunny',
        humidity: 45,
        windSpeed: 12,
        feelsLike: 30,
        high: 31,
        low: 22,
    },
};

const mockForecast: ForecastDay[] = [
    { day: 'Mon', high: 21, low: 14, condition: 'Sunny', icon: 'wb_sunny' },
    { day: 'Tue', high: 19, low: 13, condition: 'Cloudy', icon: 'cloud' },
    { day: 'Wed', high: 17, low: 12, condition: 'Rainy', icon: 'rainy' },
    { day: 'Thu', high: 18, low: 11, condition: 'Partly Cloudy', icon: 'partly_cloudy_day' },
    { day: 'Fri', high: 22, low: 15, condition: 'Sunny', icon: 'wb_sunny' },
];

export const Weather = () => {
    const [selectedLocation, setSelectedLocation] = useState('San Francisco');
    const weather = mockLocations[selectedLocation];

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex gap-2 justify-center flex-wrap">
                {Object.keys(mockLocations).map((loc) => (
                    <button
                        key={loc}
                        onClick={() => setSelectedLocation(loc)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${selectedLocation === loc ? 'bg-orange-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {loc}
                    </button>
                ))}
            </div>

            <div className="bg-black/20 rounded-xl p-6 flex flex-col items-center">
                <div className="text-white/60 text-lg">{weather.location}</div>
                <span className="material-icons text-7xl text-orange-400 my-4">{weather.icon}</span>
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
                        <span className="material-icons text-white/60 text-2xl">thermostat</span>
                        <span className="text-white/60 text-xs mt-1">Feels Like</span>
                        <span className="text-white text-lg">{weather.feelsLike}°</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="material-icons text-white/60 text-2xl">water_drop</span>
                        <span className="text-white/60 text-xs mt-1">Humidity</span>
                        <span className="text-white text-lg">{weather.humidity}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="material-icons text-white/60 text-2xl">air</span>
                        <span className="text-white/60 text-xs mt-1">Wind</span>
                        <span className="text-white text-lg">{weather.windSpeed} km/h</span>
                    </div>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
                <div className="text-white/60 text-sm mb-3">5-Day Forecast</div>
                <div className="flex justify-between">
                    {mockForecast.map((day) => (
                        <div key={day.day} className="flex flex-col items-center">
                            <span className="text-white/60 text-sm">{day.day}</span>
                            <span className="material-icons text-orange-400 text-2xl my-2">{day.icon}</span>
                            <span className="text-white text-sm">{day.high}°</span>
                            <span className="text-white/40 text-sm">{day.low}°</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center text-white/40 text-xs mt-2">
                Demo data - No API connection
            </div>
        </div>
    );
};
