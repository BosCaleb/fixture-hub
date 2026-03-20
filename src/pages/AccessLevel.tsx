import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import statedgeLogo from '@/assets/statedge-logo.png';
import lntBackground from '@/assets/LNT_Background.jpeg';
import { LoginPage } from '@/components/LoginPage';

export default function AccessLevel() {
  const { sport, tournamentId } = useParams<{ sport: string; tournamentId: string }>();
  const navigate = useNavigate();

  function handleViewerAccess() {
    navigate(`/${sport}/tournament/${tournamentId}/manage?role=viewer`);
  }

  async function handleAdminAuthenticated() {
    navigate(`/${sport}/tournament/${tournamentId}/manage?role=admin`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Header */}
      <div className="relative z-10">
        <div className="h-1 gold-gradient" />
        <div className="tournament-gradient py-4">
          <div className="container flex items-center gap-3 px-4">
            <button onClick={() => navigate(`/${sport}/tournaments`)} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img src={statedgeLogo} alt="StatEdge Logo" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <h1 className="text-2xl tracking-wider text-white">Select Access</h1>
              <p className="text-xs tracking-widest uppercase text-white/80">Powered by StatEdge</p>
            </div>
          </div>
        </div>
        <div className="h-1 gold-gradient" />
      </div>

      <div
        className="absolute inset-0 top-[calc(2px+3.5rem+2px)] bg-center bg-no-repeat bg-contain opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${lntBackground})` }}
      />

      <div className="relative z-10 flex-1">
        <LoginPage onViewerAccess={handleViewerAccess} onAdminAuthenticated={handleAdminAuthenticated} />
      </div>
    </div>
  );
}
