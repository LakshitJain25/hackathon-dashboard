import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  Users,
  Globe,
  Calendar,
  Activity,
  Target,
  Zap,
  Eye,
  MapPin,
  Clock,
  ChevronRight,
  Info,
  Download,
  MessageCircle,
  Send,
  Bot,
  User,
} from "lucide-react";

// ============================================================================
// DATA SERVICES - Now using your Flask API
// ============================================================================

const API_BASE_URL = "https://workspace-qrp4.onrender.com"; // Replace with your actual Flask API URL if different

const DataService = {
  /**
   * Fetches clinical trials data from the API.
   * @param {object} params - Query parameters for filtering, pagination, and sorting.
   * @param {number} [params.page=1] - The page number for pagination.
   * @param {number} [params.limit=50] - The number of items per page.
   * @param {string} [params.sort='pts'] - The field to sort by (e.g., 'pts', 'Trial_ID').
   * @param {string} [params.order='desc'] - The sort order ('asc' or 'desc').
   * @param {string} [params.therapeuticArea] - Filter by therapeutic area.
   * @param {string} [params.status] - Filter by study status.
   * @param {string} [params.sponsor] - Filter by sponsor.
   * @param {string} [params.search] - Search term for Trial ID or title.
   * @returns {Promise<object>} The API response containing trials data.
   */
  async fetchTrials(params = {}) {
    const query = new URLSearchParams({
      sort: params.sort || "pts",
      order: params.order || "desc",
      ...(params.therapeuticArea && {
        "filter[therapeuticArea]": params.therapeuticArea,
      }),
      ...(params.status && { "filter[status]": params.status }),
      ...(params.sponsor && { "filter[sponsor]": params.sponsor }),
      ...(params.searchTerm && { search: params.searchTerm }),
    }).toString();

    const response = await fetch(`${API_BASE_URL}/api/trials?${query}`);
    console.log("fetched trials", response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data; // Return the 'data' array from the API response
  },

  /**
   * Fetches SHAP data for a specific trial from the API.
   * @param {string} trialId - The ID of the trial.
   * @returns {Promise<object>} The API response containing SHAP data.
   */
  async fetchSHAPData(trialId) {
    const response = await fetch(`${API_BASE_URL}/api/trials/${trialId}/shap`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // The Flask API returns { success: true, data: { ...shap_info... } }
    // We need the nested 'data' object.
    return data.data;
  },

  /**
   * Fetches aggregated analytics data from the API.
   * @returns {Promise<object>} The API response containing analytics data.
   */
  async fetchAnalytics() {
    console.log("FETCHING ANALYTICS");
    const response = await fetch(`${API_BASE_URL}/api/trials/analytics`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("fetched analytics", data.data);
    return data.data; // Return the 'data' object from the API response
  },

  // Mock implementation for Groq API call - keep as is, as it's not part of the Flask API
  async sendChatMessage(message, context) {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      // Line 70
      method: "POST", // Line 71
      headers: {
        // Line 72
        "Content-Type": "application/json", // Line 73
      }, // Line 74
      body: JSON.stringify({ message }), // Line 75
    }); // Line 76

    if (!response.ok) {
      // Line 78
      const errorData = await response.json(); // Line 79
      throw new Error(
        errorData.message || `HTTP error! Status: ${response.status}`
      ); // Line 80
    } // Line 81
    const data = await response.json(); // Line 82
    console.log(data.data);
    // The Flask /api/chat endpoint returns { success: true, data: {type: 'table', ...} }
    return data.data; // Line 84
  },

  // Mock implementation for Export data - keep as is, as it's not part of the Flask API
  async exportData(format = "csv") {
    console.log(`Exporting data in ${format} format (mocked).`);
    // In a real scenario, you'd fetch from your Flask /api/export endpoint:
    // const response = await fetch(`${API_BASE_URL}/api/export?format=${format}`);
    // if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
    // return response.blob(); // If the API returns a file directly
    return { success: true, message: "Export started (mocked)." };
  },
};

// ============================================================================
// MOCK DATA GENERATORS - Only keeping generateMockChatResponse
// ============================================================================

// Keeping this mock as the Flask API doesn't handle Groq integration directly.
const generateMockChatResponse = (query, context) => {
  const lowerQuery = query.toLowerCase();

  // Note: 'context' here refers to the filteredTrials from the React state.
  // In a real Groq integration, you might pass a more structured context or
  // have the LLM query your APIs directly.

  if (lowerQuery.includes("highest pts") && lowerQuery.includes("oncology")) {
    const oncologyTrials = context
      .filter((t) => t.therapeuticArea === "Oncology")
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5);

    return {
      type: "table",
      title: "Top 5 Oncology Trials by PTS Score",
      data: oncologyTrials,
      columns: ["id", "sponsor", "pts", "enrollment", "status"],
    };
  }

  if (lowerQuery.includes("sponsors") && lowerQuery.includes("pts > 80")) {
    const highPTSSponsors = {};
    context.forEach((trial) => {
      if (trial.pts > 80) {
        highPTSSponsors[trial.sponsor] =
          (highPTSSponsors[trial.sponsor] || 0) + 1;
      }
    });

    return {
      type: "list",
      title: "Sponsors with Most High-PTS Trials (>80%)",
      data: Object.entries(highPTSSponsors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sponsor, count]) => `${sponsor}: ${count} trials`),
    };
  }

  if (
    lowerQuery.includes("objective response rate") ||
    lowerQuery.includes("orr")
  ) {
    const orrTrials = context.filter((t) => t.hasORR);
    return {
      type: "summary",
      title: "Trials with Objective Response Rate (ORR) Endpoint",
      count: orrTrials.length,
      percentage: ((orrTrials.length / context.length) * 100).toFixed(1),
      avgPTS: (
        orrTrials.reduce((sum, t) => sum + t.pts, 0) / orrTrials.length
      ).toFixed(1),
    };
  }

  if (
    lowerQuery.includes("top 5 features") &&
    lowerQuery.includes("failures")
  ) {
    return {
      type: "features",
      title: "Top 5 Features Contributing to Trial Failures",
      features: [
        {
          name: "Inadequate Enrollment Size",
          impact: "23%",
          description: "Trials with <100 patients show 23% lower success rates",
        },
        {
          name: "Extended Study Duration",
          impact: "18%",
          description: "Trials >3 years show significantly lower PTS",
        },
        {
          name: "Lack of Biomarker Strategy",
          impact: "15%",
          description: "Trials without biomarker-driven selection underperform",
        },
        {
          name: "Single-Country Studies",
          impact: "12%",
          description: "Limited geographic diversity correlates with failure",
        },
        {
          name: "Unclear Primary Endpoints",
          impact: "10%",
          description:
            "Ambiguous endpoint definition reduces success probability",
        },
      ],
    };
  }

  return {
    type: "text",
    message:
      "I understand your query, but I need more specific information to provide accurate insights. Try asking about specific sponsors, therapeutic areas, or trial characteristics.",
  };
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useTrialsData = (filters) => {
  // Now accepts filters
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalTrials, setTotalTrials] = useState(0);

  // Fetch trials based on current filters
  const fetchTrials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DataService.fetchTrials({
        page: filters.page,
        limit: filters.limit,
        sort: filters.sort,
        order: filters.order,
        therapeuticArea: filters.therapeuticArea,
        status: filters.status,
        sponsor: filters.sponsor,
        searchTerm: filters.searchTerm,
      });
      console.log(data);
      setTrials(data); // Flask API returns {data: [...], total: ...}
      setTotalTrials(data.length);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching trials:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]); // Dependency on filters

  useEffect(() => {
    fetchTrials();
  }, [fetchTrials]); // Re-fetch when filters change

  return { trials, totalTrials, loading, error, refetch: fetchTrials };
};

const useFilters = () => {
  const [filters, setFilters] = useState({
    therapeuticArea: "",
    sponsor: "",
    ptsRange: [0, 100], // This filter will be applied client-side as the API doesn't have it
    status: "",
    searchTerm: "",
    page: 1, // Added for pagination
    limit: 20, // Added for pagination, matching explorer table limit
    sort: "pts", // Added for sorting
    order: "desc", // Added for sorting
  });

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 })); // Reset page on filter change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      therapeuticArea: "",
      sponsor: "",
      ptsRange: [0, 100],
      status: "",
      searchTerm: "",
      page: 1,
      limit: 20,
      sort: "pts",
      order: "desc",
    });
  }, []);

  // filteredTrials will now represent the trials fetched by the API
  // plus any client-side filters (like ptsRange) not handled by the API.
  const applyClientSideFilters = useCallback(
    (trialsData) => {
      if (!Array.isArray(trialsData)) {
        return []; // Return an empty array if it's not an array
      }
      return trialsData.filter((trial) => {
        return (
          trial.pts >= filters.ptsRange[0] && trial.pts <= filters.ptsRange[1]
        );
      });
    },
    [filters.ptsRange]
  );

  return { filters, updateFilter, clearFilters, applyClientSideFilters };
};

const useAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DataService.fetchAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Transform API data to fit existing component props where necessary
  const dashboardMetrics = useMemo(() => {
    if (!analyticsData)
      return { highRisk: 0, mediumRisk: 0, lowRisk: 0, avgPTS: "0" };
    return {
      highRisk: analyticsData.summary.highRiskTrials,
      mediumRisk:
        analyticsData.summary.totalTrials -
        analyticsData.summary.highRiskTrials -
        analyticsData.summary.lowRiskTrials, // Calculated
      lowRisk: analyticsData.summary.lowRiskTrials,
      avgPTS: analyticsData.summary.averagePTS.toFixed(1),
      totalTrials: analyticsData.summary.totalTrials,
    };
  }, [analyticsData]);

  const ptsDistribution = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.ptsDistribution;
  }, [analyticsData]);

  const sponsorData = useMemo(() => {
    if (!analyticsData) return [];
    // The API's sponsorPerformance matches the structure needed for sponsorData
    // We just need to ensure avgPTS is a string for .toFixed(1)
    return analyticsData.sponsorPerformance
      .map((s) => ({
        ...s,
        avgPTS: s.averagePTS.toFixed(1),
      }))
      .sort((a, b) => b.totalTrials - a.totalTrials)
      .slice(0, 8); // Slice to match original limit
  }, [analyticsData]);

  const therapeuticAreaData = useMemo(() => {
    if (!analyticsData) return [];
    // The API's therapeuticAreaBreakdown matches the structure needed
    return analyticsData.therapeuticAreaBreakdown
      .map((ta) => ({
        ...ta,
        avgPTS: ta.averagePTS.toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [analyticsData]);

  const detailedSponsorStats = useMemo(() => {
    if (!analyticsData) return [];
    // This is similar to sponsorData, but might need more detailed fields if they were in the original mock
    // For now, mapping directly from sponsorPerformance
    return analyticsData.sponsorPerformance
      .map((s) => ({
        name: s.sponsor,
        totalTrials: s.totalTrials,
        avgPTS: s.averagePTS.toFixed(1),
        // highRiskTrials and lowRiskTrials not directly in API, using placeholders or deriving
        highRiskTrials: Math.floor(s.totalTrials * 0.2), // Placeholder
        lowRiskTrials: Math.floor(s.totalTrials * 0.3), // Placeholder
        successRate: s.successRate.toFixed(1), // Already a percentage from API
        diversityScore: 3, // Placeholder
        globalReach: 5, // Placeholder
      }))
      .sort((a, b) => b.totalTrials - a.totalTrials);
  }, [analyticsData]);

  return {
    dashboardMetrics,
    ptsDistribution,
    sponsorData,
    therapeuticAreaData,
    detailedSponsorStats,
    loading,
    error,
    refetchAnalytics: fetchAnalytics,
  };
};

const useChatbot = (allTrials) => {
  // Changed to allTrials as filteredTrials is client-side now
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = useCallback(
    async (message) => {
      if (!message.trim()) return;

      const userMessage = {
        type: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        // Pass allTrials data as context for mock chat response
        // In a real Groq integration, you'd likely use your backend to call Groq
        // and pass necessary data/context to the backend, not directly from frontend.
        const response = await DataService.sendChatMessage(
          message,
          allTrials // Using allTrials as context for the mock
        );
        const botMessage = {
          type: "bot",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
        console.error("Chatbot error:", error);
        const errorMessage = {
          type: "bot",
          content: {
            type: "text",
            message: "Sorry, I encountered an error processing your request.",
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    },
    [allTrials] // Dependency on allTrials for mock context
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isProcessing, sendMessage, clearMessages };
};

// ============================================================================
// COMPONENTS
// ============================================================================

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#27a6a4]"></div>
  </div>
);

const ErrorMessage = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-red-900 mb-2">
      Error Loading Data
    </h3>
    <p className="text-red-700 mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      Try Again
    </button>
  </div>
);

// Updated SHAPForceChart to correctly display data from the API response
const SHAPForceChart = ({ shapData, trialId, baseValue, predictedPTS }) => (
  <div className="bg-white p-6 rounded-lg border">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <Zap className="h-5 w-5 text-[#27a6a4]" />
      SHAP Force Plot - {trialId}
    </h3>
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>Base Value: {baseValue}%</span>
        <span>Predicted PTS: {predictedPTS}%</span>
      </div>
      {shapData.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <span className="text-sm font-medium w-48 truncate">
            {item.feature}
          </span>
          <div className="flex items-center flex-1 mx-4">
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className={`absolute top-0 h-6 rounded-full transition-all ${
                  item.shapValue > 0 ? "bg-[#27a6a4]" : "bg-[#ec7200]"
                }`}
                style={{
                  width: `${Math.abs(item.shapValue) * 100}%`, // Scale for visualization
                  left:
                    item.shapValue > 0
                      ? "50%"
                      : `${50 - Math.abs(item.shapValue) * 100}%`,
                }}
              />
              <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-gray-400" />
            </div>
          </div>
          <span
            className={`text-sm font-semibold w-16 text-right ${
              item.shapValue > 0 ? "text-[#27a6a4]" : "text-[#ec7200]"
            }`}
          >
            {item.shapValue > 0 ? "+" : ""}
            {item.shapValue.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const TrialDetailModal = ({ trial, onClose }) => {
  const [shapData, setShapData] = useState(null); // Changed to null initially
  const [loadingShap, setLoadingShap] = useState(true); // Renamed to avoid confusion
  const [shapError, setShapError] = useState(null);

  useEffect(() => {
    // Using useEffect directly for SHAP data fetch
    const fetchShapData = async () => {
      try {
        setLoadingShap(true);
        setShapError(null);
        const data = await DataService.fetchSHAPData(trial.id);
        setShapData(data); // Store the full data object
      } catch (error) {
        setShapError(error.message);
        console.error("Error fetching SHAP data:", error);
      } finally {
        setLoadingShap(false);
      }
    };

    fetchShapData();
  }, [trial.id]); // Re-fetch when trial.id changes

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-[#ec7200e5] text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{trial.id}</h2>
              <p className="text-orange-100 mt-1">{trial.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-[#27a6a4]">
                {trial.pts}%
              </div>
              <div className="text-sm text-gray-600">PTS Score</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold">{trial.sponsor}</div>
              <div className="text-sm text-gray-600">Sponsor</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold">
                {trial.therapeuticArea}
              </div>
              <div className="text-sm text-gray-600">Therapeutic Area</div>
            </div>
          </div>

          {loadingShap ? (
            <LoadingSpinner />
          ) : shapError ? (
            <ErrorMessage error={shapError} onRetry={() => fetchShapData()} />
          ) : shapData ? (
            <SHAPForceChart
              shapData={shapData.features} // Pass only the features array
              trialId={trial.id}
              baseValue={shapData.baseValue}
              predictedPTS={shapData.predictedPTS}
            />
          ) : (
            <p className="text-gray-600">
              No SHAP data available for this trial.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Trial Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">{trial.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Enrollment:</span>
                  <span className="font-medium">{trial.enrollment}</span>
                </div>
                <div className="flex justify-between">
                  <span>Countries:</span>
                  <span className="font-medium">{trial.countries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{trial.duration} days</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Endpoints</h4>
              <div className="space-y-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs ${
                    trial.hasOS
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Overall Survival (OS) {trial.hasOS ? "✓" : "✗"}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs ${
                    trial.hasPFS
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Progression Free Survival (PFS) {trial.hasPFS ? "✓" : "✗"}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs ${
                    trial.hasORR
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Objective Response Rate (ORR) {trial.hasORR ? "✓" : "✗"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClinicalTrialsDashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [comparisonTrials, setComparisonTrials] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");

  // Custom hooks - filters are now passed to useTrialsData
  const { filters, updateFilter, clearFilters, applyClientSideFilters } =
    useFilters();
  const {
    trials: fetchedTrials,
    totalTrials,
    loading,
    error,
    refetch,
  } = useTrialsData(filters);
  console.log("Fetched Trials : ", fetchedTrials);
  // Apply client-side filters (like ptsRange) to the fetched trials
  const filteredTrials = useMemo(
    () => applyClientSideFilters(fetchedTrials),
    [fetchedTrials, applyClientSideFilters]
  );

  // Analytics data is now fetched directly by useAnalytics
  const analytics = useAnalytics();
  const { messages, isProcessing, sendMessage, clearMessages } =
    useChatbot(fetchedTrials); // Pass all fetched trials for mock chatbot context

  // Event handlers
  const handleExport = useCallback(async () => {
    try {
      // NOTE: This remains a mock as the Flask API server does not have an /api/export endpoint.
      // You would need to implement that in your Flask app to enable real export functionality.
      await DataService.exportData("csv");
      // Use a custom modal or toast for alerts, avoid window.alert() in Canvas.
      // For simplicity, keeping console.log here.
      console.log("Export started! You will receive a download link shortly.");
    } catch (error) {
      console.error("Export failed:", error);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    await sendMessage(currentMessage);
    setCurrentMessage("");
  }, [sendMessage, currentMessage]);

  // Render functions for different response types (from chatbot)
  const renderBotResponse = (content) => {
    switch (content.type) {
      case "table":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">{content.title}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Trial ID</th>
                    <th className="px-3 py-2 text-left">Sponsor</th>
                    <th className="px-3 py-2 text-left">PTS</th>
                    <th className="px-3 py-2 text-left">Enrollment</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {content.data.map((trial, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium">{trial.id}</td>
                      <td className="px-3 py-2">{trial.sponsor}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-semibold ${
                            trial.pts >= 70
                              ? "text-green-600"
                              : trial.pts >= 30
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {trial.pts}%
                        </span>
                      </td>
                      <td className="px-3 py-2">{trial.enrollment}</td>
                      <td className="px-3 py-2">{trial.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "whatif":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">
              What-if Scenario for {content.data.trial_id}
            </h4>
            <ul className="space-y-2 list-disc list-inside text-sm text-gray-700">
              {content.data.changes.map((change, idx) => {
                const {column,new_value,old_value} = change
                return <li key={idx}>{column} value was changed from {old_value} to {new_value}</li>
                })}
            </ul>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="text-center bg-gray-100 p-3 rounded-lg">
                <div className="text-gray-600">Original PTS</div>
                <div className="text-xl font-bold text-blue-600">
                  {content.data.old_pts}%
                </div>
              </div>
              <div className={`text-center bg-${content.data.old_pts < content.data.new_pts ? "green" : "red"}-100 p-3 rounded-lg`}>
                <div className="text-gray-600">What-if PTS</div>
                <div className={`text-xl font-bold text-${content.data.old_pts < content.data.new_pts ? "green" : "red"}-600`}>
                  {content.data.new_pts}%
                </div>
              </div>
            </div>
          </div>
        );

      case "list":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">{content.title}</h4>
            <ul className="space-y-2">
              {content.data.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#27a6a4] rounded-full"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );

      case "summary":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">{content.title}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {content.count}
                </div>
                <div className="text-xs text-gray-600">Total Trials</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {content.percentage}%
                </div>
                <div className="text-xs text-gray-600">Of All Trials</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {content.avgPTS}%
                </div>
                <div className="text-xs text-gray-600">Avg PTS</div>
              </div>
            </div>
          </div>
        );

      case "features":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">{content.title}</h4>
            <div className="space-y-3">
              {content.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="border-l-4 border-red-400 pl-4 py-2 bg-red-50 rounded-r-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-red-900">
                      {feature.name}
                    </div>
                    <div className="text-sm font-bold text-red-600">
                      {feature.impact}
                    </div>
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <p className="text-gray-700">{content.message}</p>;
    }
  };

  // Main render logic for dashboard
  // Use analytics.loading and analytics.error for the overview tab
  if (loading || analytics.loading) return <LoadingSpinner />;
  if (error || analytics.error)
    return (
      <ErrorMessage
        error={error?.message || analytics.error?.message}
        onRetry={refetch}
      />
    );

  const tabs = [
    { id: "overview", label: "Overview Dashboard", icon: TrendingUp },
    { id: "explorer", label: "Trials Explorer", icon: Search },
    { id: "explainability", label: "Feature Attribution", icon: Zap },
    { id: "sponsors", label: "Sponsor & TA Insights", icon: Users },
    { id: "chatbot", label: "AI Assistant", icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-[#ec7200] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Activity className="h-8 w-8 text-[#27a6a4]" />
            <h1 className="text-xl font-bold">Clinical Trials PTS Dashboard</h1>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-[#27a6a4] text-[#27a6a4] bg-[#27a6a4]/5"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`${
          activeTab === "chatbot"
            ? "p-0 h-[calc(100vh-120px)] flex flex-col"
            : "p-6"
        }`}
      >
        <div className={activeTab === "chatbot" ? "flex-1 flex flex-col" : ""}>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-[#27a6a4]">
                        {analytics.dashboardMetrics.avgPTS}%
                      </div>
                      <div className="text-sm text-gray-600">Average PTS</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-[#27a6a4]" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {analytics.dashboardMetrics.highRisk}
                      </div>
                      <div className="text-sm text-gray-600">
                        High Risk Trials
                      </div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.dashboardMetrics.lowRisk}
                      </div>
                      <div className="text-sm text-gray-600">
                        Low Risk Trials
                      </div>
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {analytics.dashboardMetrics.totalTrials}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Trials in Data
                      </div>
                    </div>
                    <Activity className="h-8 w-8 text-[#27a6a4]" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    PTS Score Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.ptsDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#27a6a4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    Therapeutic Areas
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.therapeuticAreaData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#27a6a4"
                        dataKey="count"
                        label={({ therapeuticArea, count }) =>
                          `${therapeuticArea}: ${count}`
                        }
                      >
                        {analytics.therapeuticAreaData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index % 2 === 0 ? "#27a6a4" : "#ec7200"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Trials Explorer Tab */}
          {activeTab === "explorer" && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by Trial ID, title, or enrollment number..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27a6a4]"
                        value={filters.searchTerm}
                        onChange={(e) =>
                          updateFilter("searchTerm", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <select
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27a6a4]"
                    value={filters.therapeuticArea}
                    onChange={(e) =>
                      updateFilter("therapeuticArea", e.target.value)
                    }
                  >
                    <option value="">All Therapeutic Areas</option>
                    {[
                      ...new Set(fetchedTrials.map((t) => t.therapeuticArea)),
                    ].map(
                      // Use fetchedTrials here for filter options
                      (ta) => (
                        <option key={ta} value={ta}>
                          {ta}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27a6a4]"
                    value={filters.sponsor}
                    onChange={(e) => updateFilter("sponsor", e.target.value)}
                  >
                    <option value="">All Sponsors</option>
                    {[...new Set(fetchedTrials.map((t) => t.sponsor))].map(
                      // Use fetchedTrials here for filter options
                      (sponsor) => (
                        <option key={sponsor} value={sponsor}>
                          {sponsor}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Trials Table */}
              <div className="bg-white rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#ec7200e5] text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Trial ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Sponsor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Therapeutic Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          PTS Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Enrollment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTrials.map((trial) => (
                        <tr key={trial.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {trial.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trial.sponsor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trial.therapeuticArea}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                trial.pts >= 70
                                  ? "bg-green-100 text-green-800"
                                  : trial.pts >= 30
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {trial.pts}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trial.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trial.enrollment}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedTrial(trial)}
                              className="text-[#27a6a4] hover:text-[#1e8280] mr-4"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {/* Comparison feature is not fully implemented with API, keeping as-is for now */}
                            {/* <button
                              onClick={() => {
                                setComparisonTrials((prev) =>
                                  prev.includes(trial.id)
                                    ? prev.filter((id) => id !== trial.id)
                                    : [...prev, trial.id]
                                );
                              }}
                              className={`text-gray-500 hover:text-blue-600 ${
                                comparisonTrials.includes(trial.id)
                                  ? "text-blue-600"
                                  : ""
                              }`}
                            >
                              <Balance className="h-4 w-4" />
                            </button> */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Feature Attribution Tab */}
          {activeTab === "explainability" && (
            <div className="space-y-6">
              {/* Global Feature Importance (still using mock for now) */}
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#27a6a4]" />
                  Global Feature Importance
                </h3>
                {/* NOTE: This chart is still using hardcoded mock data.
                          To make this dynamic, you'd need a separate API endpoint
                          in your Flask server that provides global feature importance.
                          Alternatively, you could calculate it client-side if you
                          fetch all SHAP data (which might be large). */}
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={[
                      { feature: "Therapeutic Area", importance: 0.18 },
                      { feature: "Sponsor Track Record", importance: 0.15 },
                      { feature: "Primary Endpoint Type", importance: 0.12 },
                      { feature: "Enrollment Size", importance: 0.11 },
                      { feature: "Study Duration", importance: 0.09 },
                      { feature: "Country Count", importance: 0.08 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="feature"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="importance" fill="#27a6a4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trial Comparison - Still relies on generateSHAPData mock */}
              {comparisonTrials.length > 0 && (
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    ⚖️ SHAP Comparison - Selected Trials
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* NOTE: This section for comparison still uses the old generateSHAPData mock
                              because the `DataService.fetchSHAPData` currently only supports
                              fetching for a single trial ID directly.
                              To make this dynamic, you'd need to either:
                              1. Fetch each comparison trial's SHAP data individually in a loop (might be slow).
                              2. Implement a new Flask API endpoint like `/api/trials/compareShap`
                                 that accepts multiple trial IDs and returns their SHAP data.
                                 For simplicity, it is left as is for now.
                    */}
                    {comparisonTrials.map((trialId) => {
                      const trial = fetchedTrials.find((t) => t.id === trialId);
                      // This part needs adjustment if you want real data here
                      // const shapData = await DataService.fetchSHAPData(trialId); // This would be async
                      // For demonstration, we'll assume a mock `generateSHAPData` is still available
                      // or just leave this as a placeholder. Since the mock was removed,
                      // this section will now error if left as is.
                      // For now, I'll comment out the SHAPForceChart in comparison to avoid errors.
                      // To enable, you'd fetch SHAP data for each comparison trial here as well.
                      return trial ? (
                        <div
                          key={trialId}
                          className="bg-gray-100 p-4 rounded-lg"
                        >
                          <p className="font-semibold">{trial.id}</p>
                          <p className="text-sm">
                            Comparison feature requires further API
                            implementation.
                          </p>
                          {/* <SHAPForceChart
                              shapData={generateSHAPData(trialId)}
                              trialId={trialId}
                            /> */}
                        </div>
                      ) : null;
                    })}
                  </div>
                  <button
                    onClick={() => setComparisonTrials([])}
                    className="mt-4 px-4 py-2 bg-[#ec7200] text-white rounded-lg hover:bg-[#d65000]"
                  >
                    Clear Comparison
                  </button>
                </div>
              )}

              {/* Instructions */}
              {comparisonTrials.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">
                      How to use SHAP Comparison
                    </h4>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Go to the "Trials Explorer" tab and click the compare icon
                    (⚖️) next to any trials to see their SHAP explanations
                    side-by-side. (Note: Comparison feature is not fully
                    implemented with live SHAP API).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sponsor Insights Tab */}
          {activeTab === "sponsors" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#27a6a4]" />
                  Sponsor Performance Analysis
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#ec7200e5] text-white">
                      <tr>
                        <th className="px-4 py-2 text-left">Sponsor</th>
                        <th className="px-4 py-2 text-center">Total Trials</th>
                        <th className="px-4 py-2 text-center">Avg PTS</th>
                        <th className="px-4 py-2 text-center">Success Rate</th>
                        <th className="px-4 py-2 text-center">TA Diversity</th>
                        <th className="px-4 py-2 text-center">Global Reach</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analytics.detailedSponsorStats
                        .slice(0, 10)
                        .map((sponsor, idx) => (
                          <tr
                            key={sponsor.name}
                            className={
                              idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                            }
                          >
                            <td className="px-4 py-2 font-medium">
                              {sponsor.name}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {sponsor.totalTrials}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span
                                className={`font-semibold ${
                                  parseFloat(sponsor.avgPTS) >= 60
                                    ? "text-green-600"
                                    : parseFloat(sponsor.avgPTS) >= 40
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {sponsor.avgPTS}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {sponsor.successRate}%
                            </td>
                            <td className="px-4 py-2 text-center">
                              {/* NOTE: diversityScore and globalReach are placeholders
                                        as they are not directly available from the analytics API.
                                        You might need to derive these or add them to your Flask API. */}
                              {sponsor.diversityScore}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {sponsor.globalReach}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Chatbot Tab */}
          {activeTab === "chatbot" && (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="bg-white border-b p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#27a6a4] rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Clinical Trials AI Assistant
                      </h3>
                      <p className="text-sm text-gray-600">
                        Ask me anything about your clinical trials data
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearMessages}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Clear Chat
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">
                      Welcome to the Clinical Trials AI Assistant!
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Try asking one of these questions:
                    </p>

                    <div className="grid grid-cols-1 gap-2 max-w-2xl mx-auto">
                      {[
                        "List Top Trials with PTS > 50%?",
                        "List all trials with Overall Survival Rate as an endpoint",
                      ].map((query, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentMessage(query)}
                          className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm transition-colors border border-blue-200"
                        >
                          "{query}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.type === "bot" && (
                      <div className="w-8 h-8 bg-[#27a6a4] rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}

                    <div className="max-w-3xl">
                      <div
                        className={`p-4 rounded-lg ${
                          message.type === "user"
                            ? "bg-[#27a6a4] text-white"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        {message.type === "user" ? (
                          <p>{message.content}</p>
                        ) : (
                          renderBotResponse(message.content)
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.type === "user" && (
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-[#27a6a4] rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                        <span className="text-sm text-gray-600 ml-2">
                          Processing your request...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t p-4 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ask about trials, PTS scores, or What if scenarios..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27a6a4] focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isProcessing || !currentMessage.trim()}
                    className="px-4 py-2 bg-[#27a6a4] text-white rounded-lg hover:bg-[#1e8280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Trial Detail Modal */}
      {selectedTrial && (
        <TrialDetailModal
          trial={selectedTrial}
          onClose={() => setSelectedTrial(null)}
        />
      )}
    </div>
  );
};

export default ClinicalTrialsDashboard;
