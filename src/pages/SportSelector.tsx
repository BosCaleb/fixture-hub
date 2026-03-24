import { useNavigate } from 'react-router-dom';
import { Trophy, Sun, Moon } from 'lucide-react';
import statedgeLogo from '@/assets/statedge-logo.png';
import netballBg from '@/assets/netball-bg.jpg';
import hockeyBg from '@/assets/hockey-bg.jpg';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/use-theme';

const sports = [
  { id: 'netball', name: 'Netball', image: netballBg, enabled: true },
  { id: 'hockey', name: 'Hockey', image: hockeyBg, enabled: false },
];

export default function SportSelector() {
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-1 gold-gradient" />
      <div className="tournament-gradient py-4">
        <div className="container flex items-center justify-center gap-3 px-4">
          <img src={statedgeLogo} alt="StatEdge Logo" className="h-10 w-10 rounded-full object-cover" />
          <div className="text-center">
            <h1 className="text-3xl tracking-wider text-white">Tournament Manager</h1>
            <p className="text-xs tracking-widest uppercase text-white/80">Powered by StatEdge</p>
          </div>
        </div>
      </div>
      <div className="h-1 gold-gradient" />

      {/* Sport Cards */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <p className="text-center text-muted-foreground text-sm uppercase tracking-widest font-medium mb-8">
            Choose Your Sport
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {sports.map((sport) => (
              <button
                key={sport.id}
                disabled={!sport.enabled}
                onClick={() => sport.enabled && navigate(`/${sport.id}/tournaments`)}
                className="group relative overflow-hidden rounded-lg border border-border aspect-[4/3] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-500"
                style={{ perspective: '800px' }}
              >
                {/* Background image */}
                <img
                  src={sport.image}
                  alt={sport.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                    sport.enabled
                      ? 'group-hover:scale-110'
                      : 'grayscale opacity-40'
                  }`}
                />

                {/* Dark overlay */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ${
                    sport.enabled
                      ? 'bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/70 group-hover:via-black/30'
                      : 'bg-black/60'
                  }`}
                />

                {/* Glow effect for enabled */}
                {sport.enabled && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      boxShadow: 'inset 0 0 60px 10px hsl(48 100% 50% / 0.15)',
                    }}
                  />
                )}

                {/* Accent border glow on hover */}
                {sport.enabled && (
                  <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-accent/60 transition-all duration-500 pointer-events-none" />
                )}

                {/* Coming Soon Banner */}
                {!sport.enabled && (
                  <div className="absolute top-0 right-0 z-20">
                    <div
                      className="bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest py-1.5 px-10 transform rotate-45 translate-x-8 translate-y-4 shadow-lg"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Coming Soon
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-end p-6 z-10">
                  <div
                    className={`mb-3 flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${
                      sport.enabled
                        ? 'bg-accent/20 group-hover:bg-accent/30 group-hover:scale-110 group-hover:shadow-[0_0_30px_hsl(48_100%_50%/0.3)]'
                        : 'bg-muted/30'
                    }`}
                  >
                    <Trophy
                      className={`h-7 w-7 transition-colors duration-300 ${
                        sport.enabled ? 'text-accent' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <h2
                    className={`text-3xl sm:text-4xl tracking-wider transition-all duration-300 ${
                      sport.enabled
                        ? 'text-white group-hover:tracking-[0.15em]'
                        : 'text-muted-foreground'
                    }`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {sport.name}
                  </h2>
                  {sport.enabled && (
                    <p className="text-white/60 text-xs uppercase tracking-widest mt-2 group-hover:text-accent/80 transition-colors duration-300">
                      Select to continue
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
