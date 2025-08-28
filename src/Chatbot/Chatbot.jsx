import React from "react";

const ChatbotTab = () => (
  <div className="bg-white rounded-lg shadow h-96">
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold flex items-center">
        <MessageSquare className="mr-2 h-5 w-5" />
        Clinical Trial Data Assistant
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Ask questions about trial data, success factors, and predictions
      </p>
    </div>

    <div className="p-4 h-64 overflow-y-auto bg-gray-50">
      <div className="space-y-4">
        <div className="bg-blue-100 p-3 rounded-lg">
          <p className="text-sm">
            <strong>Bot:</strong> Welcome! I can help you analyze clinical trial
            data. Try asking:
          </p>
          <ul className="text-xs mt-2 space-y-1 text-gray-700">
            <li>• "Show me trials with PTS score above 50%"</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="p-4 border-t border-gray-200">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Ask about trial data, success factors, predictions..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
          Send
        </button>
      </div>
    </div>
  </div>
);
