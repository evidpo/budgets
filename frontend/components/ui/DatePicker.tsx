import React, { useState } from 'react';
import Input from './Input';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
 error?: string;
  className?: string;
}

export default function DatePicker({ 
  value, 
  onChange, 
  label, 
  error, 
  className = '' 
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date());

  const selectedDate = value ? new Date(value) : null;
 const today = new Date();

  // Генерация дней месяца
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const startDay = firstDay.getDay(); // 0 = воскресенье, 1 = понедельник, etc.
    
    const days = [];
    
    // Добавляем пустые дни в начале месяца
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (date: Date | null) => {
    if (date) {
      onChange(date);
    }
    setIsOpen(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <Input
        type="text"
        value={formatDate(selectedDate)}
        onClick={() => setIsOpen(true)}
        readOnly
        error={error}
        placeholder="Выберите дату"
        className="cursor-pointer"
        onFocus={(e) => e.target.blur()} // Отключаем фокус для стандартного поведения
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Icon name="chevron-up" className="transform rotate-90" />
            </button>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button 
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Icon name="chevron-up" className="transform -rotate-90" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const isToday = date && date.toDateString() === today.toDateString();
              const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();
              
              return (
                <div 
                  key={index} 
                  className={`h-8 flex items-center justify-center rounded cursor-pointer text-sm ${
                    date 
                      ? isSelected 
                        ? 'bg-blue-500 text-white' 
                        : isToday 
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                      : ''
                  }`}
                  onClick={() => date && handleDateSelect(date)}
                >
                  {date ? date.getDate() : ''}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => handleDateSelect(today)}>
              Сегодня
            </Button>
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}