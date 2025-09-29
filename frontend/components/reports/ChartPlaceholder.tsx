import React from 'react';

interface ChartPlaceholderProps {
  title: string;
}

export default function ChartPlaceholder({ title }: ChartPlaceholderProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="bg-gray-100 border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center">
        <p className="text-gray-500">График будет отображаться здесь</p>
      </div>
    </div>
  );
}