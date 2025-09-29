import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ValidationError } from '../../components/ui/ValidationError';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DatePicker } from '../../components/ui/DatePicker';
import { 
 createBudgetSchema, 
  updateBudgetSchema, 
  BudgetFormData, 
  UpdateBudgetFormData 
} from '../../lib/validation/zodSchemas';
import { Budget } from '../../lib/types';

interface BudgetFormProps {
  budget?: Budget;
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BudgetFormData | UpdateBudgetFormData) => void;
  isSubmitting?: boolean;
  categories: { id: string; name: string }[];
}

export default function BudgetForm({ 
  budget, 
  householdId, 
  isOpen, 
 onClose, 
  onSubmit, 
  isSubmitting = false,
  categories
}: BudgetFormProps) {
  const isEdit = !!budget;
  
  // Определяем схему валидации в зависимости от режима (создание или редактирование)
 const schema = isEdit 
    ? updateBudgetSchema.partial() 
    : createBudgetSchema.omit({ household_id: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<BudgetFormData | UpdateBudgetFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: budget?.name || '',
      category_id: budget?.category_id || '',
      amount: budget?.amount || 0,
      period: budget?.period || 'monthly',
      start_date: budget?.start_date || new Date().toISOString().split('T')[0],
      end_date: budget?.end_date || new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString().split('T')[0], // +30 дней
      direction: budget?.direction || 'expense',
      rollover: budget?.rollover || false,
      include_subtree: budget?.include_subtree || false,
    }
  });

  const [internalErrors, setInternalErrors] = useState<string[]>([]);

  const handleClose = () => {
    reset();
    setInternalErrors([]);
    onClose();
  };

  const onFormSubmit = (data: BudgetFormData | UpdateBudgetFormData) => {
    // Добавляем household_id при создании
    if (!isEdit) {
      onSubmit({ ...data, household_id: householdId });
    } else {
      onSubmit(data);
    }
    handleClose();
  };

  // Обработчик для отображения ошибок, которые могут возникнуть извне
  React.useEffect(() => {
    if (!isOpen) {
      reset();
      setInternalErrors([]);
    }
  }, [isOpen, reset]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Редактировать бюджет' : 'Создать бюджет'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Название *
          </label>
          <Input
            id="name"
            {...register('name')}
            type="text"
            placeholder="Название бюджета"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <ValidationError errors={[errors.name.message || '']} />}
        </div>

        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Категория
          </label>
          <Select
            id="category_id"
            value={watch('category_id') || ''}
            onChange={(value) => setValue('category_id', value)}
            className={errors.category_id ? 'border-red-500' : ''}
          >
            <option value="">Все категории</option>
            {categories.filter(cat => cat.id).map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </Select>
          {errors.category_id && <ValidationError errors={[errors.category_id.message || '']} />}
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Сумма *
          </label>
          <Input
            id="amount"
            {...register('amount', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={errors.amount ? 'border-red-500' : ''}
          />
          {errors.amount && <ValidationError errors={[errors.amount.message || '']} />}
        </div>

        <div>
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Период *
          </label>
          <Select
            id="period"
            value={watch('period') || 'monthly'}
            onChange={(value) => setValue('period', value as any)}
            className={errors.period ? 'border-red-500' : ''}
          >
            <option value="daily">Ежедневно</option>
            <option value="weekly">Еженедельно</option>
            <option value="monthly">Ежемесячно</option>
            <option value="yearly">Ежегодно</option>
            <option value="custom">Пользовательский</option>
          </Select>
          {errors.period && <ValidationError errors={[errors.period.message || '']} />}
        </div>

        <div>
          <label htmlFor="direction" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Направление *
          </label>
          <Select
            id="direction"
            value={watch('direction') || 'expense'}
            onChange={(value) => setValue('direction', value as any)}
            className={errors.direction ? 'border-red-500' : ''}
          >
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </Select>
          {errors.direction && <ValidationError errors={[errors.direction.message || '']} />}
        </div>

        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Дата начала *
          </label>
          <DatePicker
            id="start_date"
            value={watch('start_date') || new Date().toISOString().split('T')[0]}
            onChange={(date) => setValue('start_date', date)}
            className={errors.start_date ? 'border-red-500' : ''}
          />
          {errors.start_date && <ValidationError errors={[errors.start_date.message || '']} />}
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-30 mb-1">
            Дата окончания *
          </label>
          <DatePicker
            id="end_date"
            value={watch('end_date') || new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString().split('T')[0]}
            onChange={(date) => setValue('end_date', date)}
            className={errors.end_date ? 'border-red-500' : ''}
          />
          {errors.end_date && <ValidationError errors={[errors.end_date.message || '']} />}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="rollover"
            checked={watch('rollover') || false}
            onChange={(e) => setValue('rollover', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="rollover" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Перенос остатка
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="include_subtree"
            checked={watch('include_subtree') || false}
            onChange={(e) => setValue('include_subtree', e.target.checked)}
            className="h-4 w-4 text-blue-60 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="include_subtree" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Включить подкатегории
          </label>
        </div>

        {internalErrors.length > 0 && <ValidationError errors={internalErrors} className="mt-2" />}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Создать')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}