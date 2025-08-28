import React from "react";

const SponsorInsightsTab = () => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">
        Sponsor Performance Analysis
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sponsorPerformanceData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="sponsor" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="avg_pts" fill="#8884d8" name="Average PTS Score" />
          <Bar
            dataKey="success_rate"
            fill="#82ca9d"
            name="Historical Success Rate"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Trial Initiation Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="trials_started"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);
export default SponsorInsightsTab;
