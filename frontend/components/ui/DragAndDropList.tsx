import React, { useState } from 'react';

interface DragAndDropListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
  getKey: (item: T) => string | number;
  className?: string;
}

export default function DragAndDropList<T>({ 
  items, 
  renderItem, 
  onReorder, 
  getKey,
  className = '' 
}: DragAndDropListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragIndex(null);
    
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);
    
    onReorder(newItems);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={getKey(item)}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center p-3 mb-2 rounded-lg border ${
            dragIndex === index 
              ? 'bg-blue-50 border-blue-500 dark:bg-blue-90/30 dark:border-blue-700 opacity-50' 
              : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
          } transition-all cursor-move hover:shadow-sm`}
        >
          <div className="mr-3 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}