import React from 'react';

const TokenInfo = ({ info }: { info: any }) => {
  if (!info) return <div>No token information available</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        {info.name} ({info.symbol.toUpperCase()})
      </h3>
      <p>Price: ${info.market_data.current_price.usd}</p>
      <p>Market Cap: ${info.market_data.market_cap.usd}</p>
      <p>24h Volume: ${info.market_data.total_volume.usd}</p>
      {/* Add more details as needed */}
    </div>
  );
};

export default TokenInfo;
