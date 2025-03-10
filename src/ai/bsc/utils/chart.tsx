import React from 'react';

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

const Chart = ({ data }: { data: any[] }) => {
  const chartData = {
    labels: data.map((item) => new Date(item[0]).toLocaleDateString()),
    datasets: [
      {
        label: 'Price (USD)',
        data: data.map((item) => item[1]),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
      },
    ],
  };

  return (
    <div className="chart-container">
      <Line data={chartData} />
    </div>
  );
};

export default Chart;
