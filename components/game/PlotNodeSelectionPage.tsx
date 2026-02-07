import React, { useState } from 'react';

interface PlotNodeSelectionPageProps {
  plotNodes: string[];
  customStartNode: string;
  selectedNodeId: number | null;
  onNodeSelect: (id: number | null) => void;
  onCustomInputChange: (value: string) => void;
  onEnterWorld: () => void;
}

export const PlotNodeSelectionPage: React.FC<PlotNodeSelectionPageProps> = ({
  plotNodes,
  customStartNode,
  selectedNodeId,
  onNodeSelect,
  onCustomInputChange,
  onEnterWorld,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen relative z-10 px-4 py-10">
      <h2 className="font-serif text-2xl text-ink mb-8">Choose your starting point in timeline.</h2>
      
      <div className="space-y-4 w-full max-w-2xl max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        {plotNodes.map((node, index) => {
          const isSelected = selectedNodeId === index;
          return (
            <div 
              key={index} 
              onClick={() => {
                onNodeSelect(index);
                if (customStartNode.trim()) {
                  onCustomInputChange('');
                }
              }}
              className={`border border-[#8D6E63] rounded-xl p-4 cursor-pointer flex items-start gap-4 ${
                isSelected 
                  ? 'shadow-inner' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              style={isSelected ? {
                background: 'radial-gradient(0.5% 0.5% at 50% 50%, rgba(180,154,132,1) 0%, rgba(180,154,154,0.67) 100%)',
                color: 'rgba(231,224,197,1)'
              } : {}}
            >
              <p className={`font-serif text-sm leading-relaxed ${isSelected ? '' : 'text-ink'}`}>
                {node}
              </p>
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-2xl mt-8">
        <label className="font-serif text-lg text-ink mb-2 block">Or enter your own</label>
        <input
          type="text"
          value={customStartNode}
          onChange={(e) => {
            onCustomInputChange(e.target.value);
            if (e.target.value.trim() && selectedNodeId !== null) {
              onNodeSelect(null as any);
            }
          }}
          placeholder="Enter your preferred starting point"
          className="w-full bg-white rounded-xl py-3 px-4 text-lg font-serif text-gray-700 shadow-md border-none focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
      </div>

      <div className="mt-10">
        <button 
          onClick={onEnterWorld}
          className="font-hand text-4xl text-ink hover:scale-105 transition-transform font-bold">
          Enter World
        </button>
      </div>
    </div>
  );
};
