import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import HealthScoreCard from '../components/insights/HealthScoreCard';
import AnomalyTimeline from '../components/insights/AnomalyTimeline';
import ArchitectureAnalysis from '../components/insights/ArchitectureAnalysis';
import { Loader2, Lightbulb } from 'lucide-react';
import { calculateHealthScore } from '../utils/healthScore';
import { detectAllAnomalies } from '../utils/anomalyDetection';
import { runArchitectureAnalysis, calculateArchitectureScore } from '../utils/architectureAnalysis';
import { HealthScore, Anomaly, ArchitectureIssue } from '../types';

export default function Insights() {
  const {
    usage,
    fetchUsage,
    isLoadingUsage,
    selectedAccountId,
    selectedAppId,
    selectedKeyId,
    startDate,
    endDate,
  } = useAuth();

  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [architectureIssues, setArchitectureIssues] = useState<ArchitectureIssue[]>([]);
  const [architectureScore, setArchitectureScore] = useState<number>(100);

  // Fetch usage when selection changes
  useEffect(() => {
    if (selectedAccountId && (selectedAppId || selectedKeyId)) {
      fetchUsage();
    }
  }, [selectedAccountId, selectedAppId, selectedKeyId, startDate, endDate, fetchUsage]);

  // Calculate insights when usage data changes
  useEffect(() => {
    if (usage) {
      try {
        // Calculate health score
        const health = calculateHealthScore(usage, startDate, endDate);
        setHealthScore(health);

        // Detect anomalies
        const detectedAnomalies = detectAllAnomalies(usage, startDate, endDate);
        setAnomalies(detectedAnomalies);

        // Run architecture analysis
        const issues = runArchitectureAnalysis(usage);
        setArchitectureIssues(issues);
        const score = calculateArchitectureScore(issues);
        setArchitectureScore(score);
      } catch (error) {
        console.error('Error calculating insights:', error);
      }
    }
  }, [usage, startDate, endDate]);

  return (
    <div className="flex h-screen bg-pn-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Lightbulb className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-pn-text-primary">Insights</h1>
                <p className="text-sm text-pn-text-secondary">
                  Account health, anomaly detection, and architecture recommendations
                </p>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingUsage && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-pn-accent animate-spin mx-auto mb-4" />
                  <p className="text-pn-text-secondary">Loading usage data...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingUsage && !usage && (
              <div className="text-center py-20">
                <p className="text-pn-text-secondary mb-2">No usage data available</p>
                <p className="text-sm text-pn-text-secondary">
                  Select an account, app, or keyset to view insights
                </p>
              </div>
            )}

            {/* Insights Content */}
            {!isLoadingUsage && usage && (
              <div className="space-y-6">
                {/* Health Score Section */}
                {healthScore && <HealthScoreCard healthScore={healthScore} />}

                {/* Anomaly Detection Section */}
                <AnomalyTimeline anomalies={anomalies} />

                {/* Architecture Health Section */}
                <ArchitectureAnalysis issues={architectureIssues} score={architectureScore} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
