'use client';

import React from 'react';
import { TrendingUp, BarChart3, Loader2 } from 'lucide-react';

interface SymbolPrice {
  symbol: string;
  price: string;
  change?: string;
  volume?: string;
}

interface SymbolCardsProps {
  symbols: SymbolPrice[];
  loading: boolean;
  selectedSymbol: string;
  onSymbolClick: (symbol: string) => void;
  hoveredCard: string | null;
  onCardHover: (cardKey: string | null) => void;
}

export default function SymbolCards({
  symbols,
  loading,
  selectedSymbol,
  onSymbolClick,
  hoveredCard,
  onCardHover
}: SymbolCardsProps) {
  const firstRow = symbols.slice(0, 10);
  const secondRow = symbols.slice(10, 20);

  const renderSymbolCard = (symbol: SymbolPrice, rowPrefix: string, index: number) => {
    const cardKey = `${rowPrefix}-${symbol.symbol}`;
    const isHovered = hoveredCard === cardKey;
    const isSelected = selectedSymbol === symbol.symbol;
    const isPositive = symbol.change && parseFloat(symbol.change) >= 0;

    return (
      <div
        key={cardKey}
        className={`
          relative bg-white p-2 rounded-lg border cursor-pointer transition-all duration-200 
          min-h-[60px] flex flex-col justify-between
          ${isSelected
            ? 'border-blue-500 shadow-md shadow-blue-500/15 bg-blue-50'
            : isHovered
              ? 'border-gray-300 shadow-md bg-gray-50'
              : 'border-gray-200 shadow-sm'
          }
        `}
        onMouseEnter={() => onCardHover(cardKey)}
        onMouseLeave={() => onCardHover(null)}
        onClick={() => onSymbolClick(symbol.symbol)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TrendingUp
              size={12}
              className={`transition-colors duration-200 ${
                isSelected ? 'text-blue-600' : isHovered ? 'text-gray-700' : 'text-gray-500'
              }`}
            />
            <span className={`
              text-xs font-semibold transition-colors duration-200
              ${isSelected ? 'text-blue-600' : 'text-gray-800'}
            `}>
              {symbol.symbol}
            </span>
          </div>
          
          <BarChart3
            size={12}
            className={`
              transition-all duration-200
              ${isSelected ? 'text-blue-600' : isHovered ? 'text-gray-600' : 'text-gray-400'}
            `}
          />
        </div>

        <div className="flex items-end justify-between mt-1">
          <span className="text-xs font-medium text-gray-900">
            {symbol.price}
          </span>
          {symbol.change && (
            <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{symbol.change}%
            </span>
          )}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></div>
        )}
      </div>
    );
  };

  const renderSkeletonCard = (key: string) => (
    <div key={key} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[60px] flex flex-col justify-between animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
          <div className="h-3 bg-gray-200 rounded w-10"></div>
        </div>
        <div className="h-3 w-3 bg-gray-200 rounded"></div>
      </div>
      <div className="flex items-end justify-between mt-1">
        <div className="h-3 bg-gray-200 rounded w-8"></div>
        <div className="h-3 bg-gray-200 rounded w-6"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-center mb-3">
          <Loader2 size={16} className="animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-600 font-medium">Loading symbols...</span>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-2">
          {Array(10).fill(0).map((_, index) => renderSkeletonCard(`skeleton-1-${index}`))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array(10).fill(0).map((_, index) => renderSkeletonCard(`skeleton-2-${index}`))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-gray-800">Trading Pairs</h2>
        <p className="text-xs text-gray-500">Select a symbol to view detailed analysis</p>
      </div>
      
      <div className="grid grid-cols-5 gap-2 mb-2">
        {firstRow.map((symbol, index) => renderSymbolCard(symbol, 'row1', index))}
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {secondRow.map((symbol, index) => renderSymbolCard(symbol, 'row2', index))}
      </div>
    </div>
  );
}