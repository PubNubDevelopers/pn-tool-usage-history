import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { AppFeatures, KeySet, FeatureStatus, MessagePersistenceConfig, PresenceConfig, AccessManagerConfig, PushConfig, AppContextConfig, FilesConfig } from '../types';
import { detectFeaturesFromConfig, detectFeatures, hasAnyFeature, parseMessagePersistenceConfig, parsePresenceConfig, parseAccessManagerConfig, parsePushConfig, parseAppContextConfig, parseFilesConfig, parseFunctionsConfig, parseEventsActionsConfig } from '../utils/featureDetection';
import { Loader2, Check, X, ChevronDown, ChevronRight, Download, FileDown, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import FeatureCell from '../components/features/FeatureCell';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortField = 'name' | 'history' | 'presence' | 'accessManager' | 'push' | 'appContext' | 'files' | 'functions' | 'eventsActions' | 'insights' | 'bizops' | 'illuminate';
type SortDirection = 'asc' | 'desc' | null;

interface FilterState {
  history: boolean;
  presence: boolean;
  accessManager: boolean;
  push: boolean;
  appContext: boolean;
  files: boolean;
  functions: boolean;
  eventsActions: boolean;
  insights: boolean;
  bizops: boolean;
  illuminate: boolean;
}

export default function Features() {
  const {
    selectedAccountId,
    selectedAccount,
    apps,
    startDate,
    endDate,
    session,
    fetchUsageForKey,
    getCachedUsageForKey,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [appFeaturesData, setAppFeaturesData] = useState<AppFeatures[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    history: false,
    presence: false,
    accessManager: false,
    push: false,
    appContext: false,
    files: false,
    functions: false,
    eventsActions: false,
    insights: false,
    bizops: false,
    illuminate: false,
  });

  // State for detailed configs and loading states
  const [detailedConfigs, setDetailedConfigs] = useState<Map<number, {
    historyConfig?: MessagePersistenceConfig;
    presenceConfig?: PresenceConfig;
    accessManagerConfig?: AccessManagerConfig;
    pushConfig?: PushConfig;
    appContextConfig?: AppContextConfig;
    filesConfig?: FilesConfig;
  }>>(new Map());
  const [loadingConfigs, setLoadingConfigs] = useState<Map<number, Set<'history' | 'presence' | 'accessManager' | 'push' | 'appContext' | 'files'>>>(new Map());
  const [configErrors, setConfigErrors] = useState<Map<number, Map<'history' | 'presence' | 'accessManager' | 'push' | 'appContext' | 'files', string>>>(new Map());

  // Fetch feature data for all apps and keys
  const fetchAllFeatures = async () => {
    if (!selectedAccountId) {
      setError('Please select an account first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const featuresData: AppFeatures[] = [];

      // For each app
      for (const app of apps) {
        const appFeatures: AppFeatures = {
          appId: app.id,
          appName: app.name,
          keysets: [],
          appLevelFeatures: {
            insights: false, // TODO: Detect from app properties
            bizops: false,   // TODO: Detect from app properties
          },
          expanded: true, // Expanded by default
        };

        // Fetch keys for this app
        const keysResponse = await fetch(
          `/api/keys?appid=${app.id}&token=${session?.token}`
        );

        if (keysResponse.ok) {
          const keys = await keysResponse.json();

          // For each key, detect features from config and usage
          for (const key of keys) {
            try {
              // Use keyset name fields in priority order
              const keysetName = key.name ||
                                key.keyset_name ||
                                key.key_name ||
                                key.properties?.name ||
                                `Keyset ${key.id}`;

              // First, detect features from keyset config (fast and accurate)
              const features = detectFeaturesFromConfig(key as KeySet);

              // Check if config detection found anything, otherwise fall back to usage detection
              const hasAnyConfigFeature = Object.values(features).some(v => v === true);

              if (!hasAnyConfigFeature) {
                // Fallback to usage-based detection if config has no features
                try {
                  let keyUsage = getCachedUsageForKey(key.id, startDate, endDate);

                  if (!keyUsage) {
                    keyUsage = await fetchUsageForKey(key.id, startDate, endDate);
                  }

                  const usageFeatures = detectFeatures(keyUsage);
                  features.presence = usageFeatures.presence;
                  features.history = usageFeatures.history;
                  features.accessManager = usageFeatures.accessManager;
                  features.push = usageFeatures.push;
                  features.appContext = usageFeatures.appContext;
                  features.files = usageFeatures.files;
                  features.functions = usageFeatures.functions;
                  features.eventsActions = usageFeatures.eventsActions;
                  features.illuminate = usageFeatures.illuminate;
                } catch (usageErr) {
                  // Silently continue with config-based features only
                }
              } else {
                // For Functions, Events & Actions, and Illuminate, we still need to check usage
                // since they're not in pnconfig
                try {
                  let keyUsage = getCachedUsageForKey(key.id, startDate, endDate);

                  if (!keyUsage) {
                    keyUsage = await fetchUsageForKey(key.id, startDate, endDate);
                  }

                  const usageFeatures = detectFeatures(keyUsage);
                  features.functions = usageFeatures.functions;
                  features.eventsActions = usageFeatures.eventsActions;
                  features.illuminate = usageFeatures.illuminate;
                } catch (usageErr) {
                  // Continue with config-based features only
                }
              }

              // Parse initial configs from pnconfig for immediate display
              const initialHistoryConfig = parseMessagePersistenceConfig(key);
              const initialPresenceConfig = parsePresenceConfig(key);
              const initialAccessManagerConfig = parseAccessManagerConfig(key);
              const initialPushConfig = parsePushConfig(key);
              const initialAppContextConfig = parseAppContextConfig(key);
              const initialFilesConfig = parseFilesConfig(key);

              if (initialHistoryConfig) {
                features.historyConfig = initialHistoryConfig;
              }
              if (initialPresenceConfig) {
                features.presenceConfig = initialPresenceConfig;
              }
              if (initialAccessManagerConfig) {
                features.accessManagerConfig = initialAccessManagerConfig;
              }
              if (initialPushConfig) {
                features.pushConfig = initialPushConfig;
              }
              if (initialAppContextConfig) {
                features.appContextConfig = initialAppContextConfig;
              }
              if (initialFilesConfig) {
                features.filesConfig = initialFilesConfig;
              }

              // Always try to fetch Functions configuration
              if (key.id) {
                try {
                  const subscribeKey = key.subscribe_key || key.subscribeKey;
                  console.log(`[Functions] Fetching for key ${key.id}, account ${selectedAccountId}, subscribe_key: ${subscribeKey?.substring(0, 20)}...`);
                  const functionsResponse = await fetch(
                    `/api/functions?keyid=${key.id}&token=${session?.token}&accountid=${selectedAccountId}&subscribekey=${subscribeKey}`
                  );
                  console.log(`[Functions] Response status: ${functionsResponse.status}`);
                  if (functionsResponse.ok) {
                    const functionsData = await functionsResponse.json();
                    console.log(`[Functions] Raw data:`, functionsData);
                    const initialFunctionsConfig = parseFunctionsConfig(functionsData);
                    console.log(`[Functions] Parsed config:`, initialFunctionsConfig);
                    if (initialFunctionsConfig) {
                      features.functions = true;
                      features.functionsConfig = initialFunctionsConfig;
                      console.log(`[Functions] ✓ Set features.functions = true`);
                    } else {
                      // No functions configured - clear the flag that usage detection might have set
                      features.functions = false;
                      features.functionsConfig = undefined;
                      console.log(`[Functions] ✗ No functions configured, set features.functions = false`);
                    }
                  } else {
                    // API returned error (404, etc.) - clear the flag
                    features.functions = false;
                    features.functionsConfig = undefined;
                    console.log(`[Functions] ✗ API error ${functionsResponse.status}, set features.functions = false`);
                  }
                } catch (err) {
                  console.error(`[Functions] Failed to fetch for key ${key.id}:`, err);
                  // Clear the flag on error too
                  features.functions = false;
                  features.functionsConfig = undefined;
                }
              }

              // Always try to fetch Events & Actions configuration
              if (key.id) {
                try {
                  const subscribeKey = key.subscribe_key || key.subscribeKey;
                  console.log(`[Events&Actions] Fetching for key ${key.id}, subscribe_key: ${subscribeKey?.substring(0, 20)}...`);
                  const eventsActionsResponse = await fetch(
                    `/api/events-actions?keyid=${key.id}&token=${session?.token}&accountid=${selectedAccountId}&appid=${app.id}&subscribekey=${subscribeKey}`
                  );
                  console.log(`[Events&Actions] Response status: ${eventsActionsResponse.status}`);
                  if (eventsActionsResponse.ok) {
                    const eventsActionsData = await eventsActionsResponse.json();
                    console.log(`[Events&Actions] Raw data:`, eventsActionsData);
                    const initialEventsActionsConfig = parseEventsActionsConfig(eventsActionsData);
                    console.log(`[Events&Actions] Parsed config:`, initialEventsActionsConfig);
                    if (initialEventsActionsConfig) {
                      features.eventsActions = true;
                      features.eventsActionsConfig = initialEventsActionsConfig;
                      console.log(`[Events&Actions] ✓ Set features.eventsActions = true`);
                    } else {
                      features.eventsActions = false;
                      features.eventsActionsConfig = undefined;
                      console.log(`[Events&Actions] ✗ No config parsed, set features.eventsActions = false`);
                    }
                  } else {
                    features.eventsActions = false;
                    features.eventsActionsConfig = undefined;
                    console.log(`[Events&Actions] ✗ API error ${eventsActionsResponse.status}`);
                  }
                } catch (err) {
                  console.error(`[Events&Actions] Failed to fetch for key ${key.id}:`, err);
                  features.eventsActions = false;
                  features.eventsActionsConfig = undefined;
                }
              }

              appFeatures.keysets.push({
                keyId: key.id,
                keyName: keysetName,
                subscribeKey: key.subscribe_key || key.subscribeKey,
                publishKey: key.publish_key || key.publishKey,
                features,
              });
            } catch (err) {
              // Continue with next key
            }
          }
        }

        // Only add app if it has keysets
        if (appFeatures.keysets.length > 0) {
          featuresData.push(appFeatures);
        }
      }

      setAppFeaturesData(featuresData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feature data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed keyset config from API
  const fetchDetailedConfig = async (keysetId: number, subscribeKey: string, publishKey: string, featureName: 'history' | 'presence' | 'accessManager' | 'push' | 'appContext' | 'files') => {
    // Check if already loading
    const currentLoading = loadingConfigs.get(keysetId) || new Set();
    if (currentLoading.has(featureName)) {
      return; // Already loading
    }

    // Check if already cached
    const cached = detailedConfigs.get(keysetId);
    const configKey = `${featureName}Config` as 'historyConfig' | 'presenceConfig' | 'accessManagerConfig' | 'pushConfig' | 'appContextConfig' | 'filesConfig';
    if (cached && cached[configKey]) {
      return; // Already have config
    }

    // Mark as loading
    setLoadingConfigs(prev => {
      const newMap = new Map(prev);
      const keysetLoading = new Set(newMap.get(keysetId) || []);
      keysetLoading.add(featureName);
      newMap.set(keysetId, keysetLoading);
      return newMap;
    });

    try {
      // Fetch keyset details from our API endpoint
      const response = await fetch(
        `/api/keyset-details?keyid=${keysetId}&token=${session?.token}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch keyset details');
      }

      const data = await response.json();

      // Parse the relevant config
      const newConfigs = detailedConfigs.get(keysetId) || {};

      if (featureName === 'history') {
        const historyConfig = parseMessagePersistenceConfig(data);
        if (historyConfig) {
          newConfigs.historyConfig = historyConfig;
        }
      } else if (featureName === 'presence') {
        const presenceConfig = parsePresenceConfig(data);
        if (presenceConfig) {
          newConfigs.presenceConfig = presenceConfig;
        }
      } else if (featureName === 'accessManager') {
        const pamConfig = parseAccessManagerConfig(data);
        if (pamConfig) {
          newConfigs.accessManagerConfig = pamConfig;
        }
      } else if (featureName === 'push') {
        const pushConfig = parsePushConfig(data);
        if (pushConfig) {
          newConfigs.pushConfig = pushConfig;
        }
      } else if (featureName === 'appContext') {
        const appContextConfig = parseAppContextConfig(data);
        if (appContextConfig) {
          newConfigs.appContextConfig = appContextConfig;
        }
      } else if (featureName === 'files') {
        const filesConfig = parseFilesConfig(data);
        if (filesConfig) {
          newConfigs.filesConfig = filesConfig;
        }
      }

      setDetailedConfigs(prev => {
        const newMap = new Map(prev);
        newMap.set(keysetId, newConfigs);
        return newMap;
      });
    } catch (err: any) {
      // Store error
      setConfigErrors(prev => {
        const newMap = new Map(prev);
        const keysetErrors = new Map(newMap.get(keysetId) || []);
        keysetErrors.set(featureName, err.message || 'Failed to load details');
        newMap.set(keysetId, keysetErrors);
        return newMap;
      });
    } finally {
      // Remove from loading
      setLoadingConfigs(prev => {
        const newMap = new Map(prev);
        const keysetLoading = new Set(newMap.get(keysetId) || []);
        keysetLoading.delete(featureName);
        if (keysetLoading.size === 0) {
          newMap.delete(keysetId);
        } else {
          newMap.set(keysetId, keysetLoading);
        }
        return newMap;
      });
    }
  };

  // Toggle app expansion
  const toggleApp = (appId: number) => {
    setAppFeaturesData(prev =>
      prev.map(app =>
        app.appId === appId ? { ...app, expanded: !app.expanded } : app
      )
    );
  };

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(v => v === true);

  // Get filtered and sorted data
  const getFilteredAndSortedData = () => {
    let data = [...appFeaturesData];

    // Apply filters if any are active
    if (hasActiveFilters) {
      data = data.map(app => {
        // Filter keysets based on selected features
        const filteredKeysets = app.keysets.filter(keyset => {
          // Check if keyset matches ALL selected filters (AND logic)
          for (const [feature, enabled] of Object.entries(filters)) {
            if (enabled) {
              if (feature === 'insights' || feature === 'bizops') {
                // For app-level features, check app level
                if (!app.appLevelFeatures[feature as 'insights' | 'bizops']) {
                  return false;
                }
              } else {
                // For keyset features, check keyset level
                if (!keyset.features[feature as keyof FeatureStatus]) {
                  return false;
                }
              }
            }
          }
          return true;
        });

        return {
          ...app,
          keysets: filteredKeysets,
        };
      }).filter(app => app.keysets.length > 0); // Remove apps with no matching keysets
    }

    // Apply sorting
    if (sortDirection) {
      data.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortField === 'name') {
          aValue = a.appName.toLowerCase();
          bValue = b.appName.toLowerCase();
        } else if (sortField === 'insights' || sortField === 'bizops') {
          aValue = a.appLevelFeatures[sortField] ? 1 : 0;
          bValue = b.appLevelFeatures[sortField] ? 1 : 0;
        } else {
          // Count how many keysets have this feature enabled
          aValue = a.keysets.filter(k => k.features[sortField]).length;
          bValue = b.keysets.filter(k => k.features[sortField]).length;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return data;
  };

  const filteredData = getFilteredAndSortedData();

  // Toggle filter
  const toggleFilter = (feature: keyof FilterState) => {
    setFilters(prev => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      history: false,
      presence: false,
      accessManager: false,
      push: false,
      appContext: false,
      files: false,
      functions: false,
      eventsActions: false,
      insights: false,
      bizops: false,
      illuminate: false,
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFontSize(18);
    doc.setTextColor(231, 76, 60); // PubNub red
    doc.text('PubNub Features Report', 14, 15);

    // Account info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Account ID: ${selectedAccountId}`, 14, 22);
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    // Prepare table data
    const tableData: any[] = [];

    appFeaturesData.forEach(app => {
      // App row
      const appRow = [
        app.appName,
        hasAnyFeature(app, 'history') ? '✓' : '-',
        hasAnyFeature(app, 'presence') ? '✓' : '-',
        hasAnyFeature(app, 'accessManager') ? '✓' : '-',
        hasAnyFeature(app, 'push') ? '✓' : '-',
        hasAnyFeature(app, 'appContext') ? '✓' : '-',
        hasAnyFeature(app, 'files') ? '✓' : '-',
        hasAnyFeature(app, 'functions') ? '✓' : '-',
        hasAnyFeature(app, 'eventsActions') ? '✓' : '-',
        app.appLevelFeatures.insights ? '✓' : '-',
        app.appLevelFeatures.bizops ? '✓' : '-',
        hasAnyFeature(app, 'illuminate') ? '✓' : '-',
      ];
      tableData.push(appRow);

      // Keyset rows
      app.keysets.forEach(keyset => {
        const keysetRow = [
          `  └─ ${keyset.keyName}`,
          keyset.features.history ? '✓' : '-',
          keyset.features.presence ? '✓' : '-',
          keyset.features.accessManager ? '✓' : '-',
          keyset.features.push ? '✓' : '-',
          keyset.features.appContext ? '✓' : '-',
          keyset.features.files ? '✓' : '-',
          keyset.features.functions ? '✓' : '-',
          keyset.features.eventsActions ? '✓' : '-',
          app.appLevelFeatures.insights ? '✓' : '-',
          app.appLevelFeatures.bizops ? '✓' : '-',
          keyset.features.illuminate ? '✓' : '-',
        ];
        tableData.push(keysetRow);
      });
    });

    // Create table
    autoTable(doc, {
      startY: 40,
      head: [[
        'App / Keyset',
        'Message Persistence',
        'Presence',
        'Access Manager',
        'Mobile Push',
        'App Context',
        'Files',
        'Functions',
        'Events & Actions',
        'Insights',
        'BizOps',
        'Illuminate',
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'center',
      },
      headStyles: {
        fillColor: [231, 76, 60],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          if (!data.cell.text[0].startsWith('  └─')) {
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [100, 100, 100];
          }
        }
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    const filename = `pubnub-features-${selectedAccountId}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'App / Keyset',
      'Message Persistence',
      'Presence',
      'Access Manager',
      'Mobile Push',
      'App Context',
      'Files',
      'Functions',
      'Events & Actions',
      'Insights',
      'BizOps',
      'Illuminate',
    ];

    const rows: string[][] = [];

    appFeaturesData.forEach(app => {
      // App row
      rows.push([
        app.appName,
        hasAnyFeature(app, 'history') ? 'Yes' : 'No',
        hasAnyFeature(app, 'presence') ? 'Yes' : 'No',
        hasAnyFeature(app, 'accessManager') ? 'Yes' : 'No',
        hasAnyFeature(app, 'push') ? 'Yes' : 'No',
        hasAnyFeature(app, 'appContext') ? 'Yes' : 'No',
        hasAnyFeature(app, 'files') ? 'Yes' : 'No',
        hasAnyFeature(app, 'functions') ? 'Yes' : 'No',
        hasAnyFeature(app, 'eventsActions') ? 'Yes' : 'No',
        app.appLevelFeatures.insights ? 'Yes' : 'No',
        app.appLevelFeatures.bizops ? 'Yes' : 'No',
        hasAnyFeature(app, 'illuminate') ? 'Yes' : 'No',
      ]);

      // Keyset rows
      app.keysets.forEach(keyset => {
        rows.push([
          `  ${keyset.keyName}`,
          keyset.features.history ? 'Yes' : 'No',
          keyset.features.presence ? 'Yes' : 'No',
          keyset.features.accessManager ? 'Yes' : 'No',
          keyset.features.push ? 'Yes' : 'No',
          keyset.features.appContext ? 'Yes' : 'No',
          keyset.features.files ? 'Yes' : 'No',
          keyset.features.functions ? 'Yes' : 'No',
          keyset.features.eventsActions ? 'Yes' : 'No',
          app.appLevelFeatures.insights ? 'Yes' : 'No',
          app.appLevelFeatures.bizops ? 'Yes' : 'No',
          keyset.features.illuminate ? 'Yes' : 'No',
        ]);
      });
    });

    // CSV format with proper escaping
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `pubnub-features-${selectedAccountId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (selectedAccountId && apps.length > 0) {
      fetchAllFeatures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, apps, startDate, endDate]);

  if (!selectedAccountId) {
    return (
      <div className="h-screen bg-pn-bg flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Check className="w-16 h-16 text-pn-text-secondary mx-auto mb-4" />
                <p className="text-pn-text-secondary text-lg">
                  Select an account to view features
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-pn-bg flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">Features</h1>
              <p className="text-pn-text-secondary mb-3">
                Feature configuration across all apps and keysets (from keyset config + usage data)
              </p>
              {selectedAccount && (
                <div className="bg-pn-surface border border-pn-border rounded-lg p-4 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-pn-text-secondary uppercase tracking-wider">Account ID</span>
                      <p className="text-white font-mono text-sm mt-1">{selectedAccount.id}</p>
                    </div>
                    <div>
                      <span className="text-xs text-pn-text-secondary uppercase tracking-wider">Email</span>
                      <p className="text-white text-sm mt-1">{selectedAccount.email}</p>
                    </div>
                    {selectedAccount.properties?.company && (
                      <div className="col-span-2">
                        <span className="text-xs text-pn-text-secondary uppercase tracking-wider">Company</span>
                        <p className="text-white text-sm mt-1">{selectedAccount.properties.company}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {appFeaturesData.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilterDialog(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                    hasActiveFilters
                      ? 'bg-pn-blue text-white hover:bg-pn-blue-hover'
                      : 'bg-pn-surface-light text-white hover:bg-pn-border'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white text-pn-blue text-xs rounded-full font-semibold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-pn-blue hover:bg-pn-blue-hover text-white rounded transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export to PDF
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-pn-surface-light hover:bg-pn-border text-white rounded transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export to CSV
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-pn-blue animate-spin" />
              <span className="ml-3 text-pn-text-secondary">Loading feature data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
              {error}
            </div>
          ) : appFeaturesData.length === 0 ? (
            <div className="text-center py-12 text-pn-text-secondary">
              No feature data found for the selected time period
            </div>
          ) : (
            <div className="bg-pn-surface rounded-lg border border-pn-border overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
                <table className="w-full">
                  <thead className="bg-pn-surface-light sticky top-0 z-20">
                    <tr>
                      <th
                        className="text-left px-4 py-3 text-sm font-medium text-pn-text-secondary sticky left-0 bg-pn-surface-light z-30 cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          <span>App / Keyset</span>
                          {sortField === 'name' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                          {sortField !== 'name' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('history')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="whitespace-normal leading-tight">Message Persistence</span>
                          {sortField === 'history' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('presence')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Presence</span>
                          {sortField === 'presence' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('accessManager')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="whitespace-normal leading-tight">Access Manager</span>
                          {sortField === 'accessManager' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('push')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="whitespace-normal leading-tight">Mobile Push</span>
                          {sortField === 'push' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('appContext')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="whitespace-normal leading-tight">App Context</span>
                          {sortField === 'appContext' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('files')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Files</span>
                          {sortField === 'files' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('functions')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Functions</span>
                          {sortField === 'functions' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('eventsActions')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="whitespace-normal leading-tight">Events & Actions</span>
                          {sortField === 'eventsActions' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('insights')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Insights</span>
                          {sortField === 'insights' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('bizops')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>BizOps</span>
                          {sortField === 'bizops' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary bg-pn-surface-light cursor-pointer hover:bg-pn-border transition-colors"
                        onClick={() => handleSort('illuminate')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Illuminate</span>
                          {sortField === 'illuminate' && sortDirection && (
                            sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((app) => (
                      <>
                        {/* App Row */}
                        <tr
                          key={`app-${app.appId}`}
                          className="border-t border-pn-border hover:bg-pn-surface-light transition-colors"
                        >
                          <td className="px-4 py-3 text-white font-medium sticky left-0 bg-pn-surface hover:bg-pn-surface-light z-10">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleApp(app.appId)}
                                className="flex items-center"
                              >
                                {app.expanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://internal-admin.pubnub.com/account/${selectedAccountId}/app/${app.appId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white hover:text-pn-blue transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {app.appName}
                                  </a>
                                  <span className="text-xs text-pn-text-secondary">
                                    ({app.appId})
                                  </span>
                                </div>
                                <span className="text-xs text-pn-text-secondary">
                                  {app.keysets.length} {app.keysets.length === 1 ? 'keyset' : 'keysets'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'history') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'presence') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'accessManager') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'push') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'appContext') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'files') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'functions') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'eventsActions') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {app.appLevelFeatures.insights ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {app.appLevelFeatures.bizops ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            {hasAnyFeature(app, 'illuminate') ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-pn-text-secondary/30 mx-auto" />
                            )}
                          </td>
                        </tr>

                        {/* Keyset Rows (shown when expanded) */}
                        {app.expanded &&
                          app.keysets.map((keyset) => (
                            <tr
                              key={`key-${keyset.keyId}`}
                              className="border-t border-pn-border/50 bg-pn-bg hover:bg-pn-surface transition-colors"
                            >
                              <td className="px-4 py-2 text-pn-text-secondary text-sm sticky left-0 bg-pn-bg hover:bg-pn-surface z-10">
                                <div className="pl-8 flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={`https://internal-admin.pubnub.com/account/${selectedAccountId}/app/${app.appId}/key/${keyset.keyId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-pn-text-secondary hover:text-pn-blue transition-colors"
                                    >
                                      {keyset.keyName}
                                    </a>
                                    <span className="text-xs opacity-60">
                                      ({keyset.keyId})
                                    </span>
                                  </div>
                                  {keyset.subscribeKey && (
                                    <span className="text-xs opacity-50 font-mono">
                                      {keyset.subscribeKey}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="history"
                                  enabled={keyset.features.history}
                                  config={keyset.features.historyConfig || detailedConfigs.get(keyset.keyId)?.historyConfig}
                                  isLoading={loadingConfigs.get(keyset.keyId)?.has('history')}
                                  error={configErrors.get(keyset.keyId)?.get('history')}
                                  onHover={() => {
                                    if (keyset.subscribeKey && keyset.publishKey) {
                                      fetchDetailedConfig(keyset.keyId, keyset.subscribeKey, keyset.publishKey, 'history');
                                    }
                                  }}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="presence"
                                  enabled={keyset.features.presence}
                                  config={keyset.features.presenceConfig || detailedConfigs.get(keyset.keyId)?.presenceConfig}
                                  isLoading={loadingConfigs.get(keyset.keyId)?.has('presence')}
                                  error={configErrors.get(keyset.keyId)?.get('presence')}
                                  onHover={() => {
                                    if (keyset.subscribeKey && keyset.publishKey) {
                                      fetchDetailedConfig(keyset.keyId, keyset.subscribeKey, keyset.publishKey, 'presence');
                                    }
                                  }}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="accessManager"
                                  enabled={keyset.features.accessManager}
                                  config={keyset.features.accessManagerConfig || detailedConfigs.get(keyset.keyId)?.accessManagerConfig}
                                  isLoading={loadingConfigs.get(keyset.keyId)?.has('accessManager')}
                                  error={configErrors.get(keyset.keyId)?.get('accessManager')}
                                  onHover={() => {
                                    if (keyset.subscribeKey && keyset.publishKey) {
                                      fetchDetailedConfig(keyset.keyId, keyset.subscribeKey, keyset.publishKey, 'accessManager');
                                    }
                                  }}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="push"
                                  enabled={keyset.features.push}
                                  config={keyset.features.pushConfig || detailedConfigs.get(keyset.keyId)?.pushConfig}
                                  isLoading={loadingConfigs.get(keyset.keyId)?.has('push')}
                                  error={configErrors.get(keyset.keyId)?.get('push')}
                                  onHover={() => {
                                    if (keyset.subscribeKey && keyset.publishKey) {
                                      fetchDetailedConfig(keyset.keyId, keyset.subscribeKey, keyset.publishKey, 'push');
                                    }
                                  }}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="appContext"
                                  enabled={keyset.features.appContext}
                                  config={keyset.features.appContextConfig || detailedConfigs.get(keyset.keyId)?.appContextConfig}
                                  isLoading={loadingConfigs.get(keyset.keyId)?.has('appContext')}
                                  error={configErrors.get(keyset.keyId)?.get('appContext')}
                                  onHover={() => {
                                    if (keyset.subscribeKey && keyset.publishKey) {
                                      fetchDetailedConfig(keyset.keyId, keyset.subscribeKey, keyset.publishKey, 'appContext');
                                    }
                                  }}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="files"
                                  enabled={keyset.features.files}
                                  config={keyset.features.filesConfig || detailedConfigs.get(keyset.keyId)?.filesConfig}
                                  isLoading={loadingConfigs.get(keyset.keyId)?.has('files')}
                                  error={configErrors.get(keyset.keyId)?.get('files')}
                                  onHover={() => {
                                    if (keyset.subscribeKey && keyset.publishKey) {
                                      fetchDetailedConfig(keyset.keyId, keyset.subscribeKey, keyset.publishKey, 'files');
                                    }
                                  }}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="functions"
                                  enabled={keyset.features.functions}
                                  config={keyset.features.functionsConfig}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                <FeatureCell
                                  featureName="eventsActions"
                                  enabled={keyset.features.eventsActions}
                                  config={keyset.features.eventsActionsConfig}
                                />
                              </td>
                              <td className="text-center px-4 py-2">
                                {app.appLevelFeatures.insights ? (
                                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-pn-text-secondary/30 mx-auto" />
                                )}
                              </td>
                              <td className="text-center px-4 py-2">
                                {app.appLevelFeatures.bizops ? (
                                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-pn-text-secondary/30 mx-auto" />
                                )}
                              </td>
                              <td className="text-center px-4 py-2">
                                {keyset.features.illuminate ? (
                                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-pn-text-secondary/30 mx-auto" />
                                )}
                              </td>
                            </tr>
                          ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Filter Dialog */}
      {showFilterDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFilterDialog(false)}>
          <div
            className="bg-pn-surface border border-pn-border rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Filter Features</h2>
                <button
                  onClick={() => setShowFilterDialog(false)}
                  className="text-pn-text-secondary hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-pn-text-secondary mb-4">
                Show only keysets with selected features enabled
              </p>

              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.history}
                    onChange={() => toggleFilter('history')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Message Persistence</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.presence}
                    onChange={() => toggleFilter('presence')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Presence</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.accessManager}
                    onChange={() => toggleFilter('accessManager')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Access Manager</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.push}
                    onChange={() => toggleFilter('push')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Mobile Push</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.appContext}
                    onChange={() => toggleFilter('appContext')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">App Context</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.files}
                    onChange={() => toggleFilter('files')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Files</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.functions}
                    onChange={() => toggleFilter('functions')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Functions</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.eventsActions}
                    onChange={() => toggleFilter('eventsActions')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Events & Actions</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.insights}
                    onChange={() => toggleFilter('insights')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Insights</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.bizops}
                    onChange={() => toggleFilter('bizops')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">BizOps</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded hover:bg-pn-bg transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.illuminate}
                    onChange={() => toggleFilter('illuminate')}
                    className="w-4 h-4 rounded border-pn-border bg-pn-bg text-pn-blue focus:ring-2 focus:ring-pn-blue"
                  />
                  <span className="text-white">Illuminate</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 bg-pn-bg hover:bg-pn-border text-white rounded transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterDialog(false)}
                  className="flex-1 px-4 py-2 bg-pn-blue hover:bg-pn-blue-hover text-white rounded transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
