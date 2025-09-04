'use client';

import React from 'react';
import { TrendingUp, BarChart3, Loader2 } from 'lucide-react';

interface SymbolPrice {
  symbol: string;
  price: string;
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

    return (
      <div
        key={cardKey}
        className={`
          relative bg-white p-4 rounded-xl border cursor-pointer transition-all duration-300 
          min-h-[80px] flex flex-col justify-center items-center text-center
          ${isSelected
            ? 'border-blue-500 shadow-lg shadow-blue-500/25 transform scale-105 bg-gradient-to-br from-blue-50 to-indigo-50'
            : isHovered
              ? 'border-blue-400 shadow-lg shadow-blue-400/20 transform scale-102 bg-gray-50'
              : 'border-gray-200 shadow-md hover:shadow-lg'
          }
        `}
        onMouseEnter={() => onCardHover(cardKey)}
        onMouseLeave={() => onCardHover(null)}
        onClick={() => onSymbolClick(symbol.symbol)}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp
            size={16}
            className={`transition-colors duration-200 ${
              isSelected || isHovered ? 'text-blue-600' : 'text-gray-500'
            }`}
          />
          <h3 className={`
            text-sm font-bold transition-colors duration-200 truncate
            ${isSelected || isHovered ? 'text-blue-600' : 'text-gray-800'}
          `}>
            {symbol.symbol}
          </h3>
        </div>

        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          Active
        </div>

        <BarChart3
          size={14}
          className={`
            absolute top-2 right-2 transition-all duration-200
            ${isSelected || isHovered ? 'text-blue-600 scale-110' : 'text-gray-300'}
          `}
        />

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        )}
      </div>
    );
  };

  const renderSkeletonCard = (key: string) => (
    <div key={key} className="bg-white p-4 rounded-xl border border-gray-200 shadow-md min-h-[80px] flex flex-col justify-center items-center">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 font-medium">Loading symbols...</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3 mb-4">
          {Array(10).fill(0).map((_, index) => renderSkeletonCard(`skeleton-1-${index}`))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {Array(10).fill(0).map((_, index) => renderSkeletonCard(`skeleton-2-${index}`))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Trading Pairs</h2>
        <p className="text-sm text-gray-600">Select a symbol to view detailed analysis</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3 mb-4">
        {firstRow.map((symbol, index) => renderSymbolCard(symbol, 'row1', index))}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {secondRow.map((symbol, index) => renderSymbolCard(symbol, 'row2', index))}
      </div>
    </div>
  );
}