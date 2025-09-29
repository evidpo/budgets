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
 createTransactionSchema, 
  updateTransactionSchema, 
  TransactionFormData, 
  UpdateTransactionFormData 
} from '../../lib/validation/zodSchemas';
import { Transaction } from '../../lib/types';

interface TransactionFormProps {
  transaction?: Transaction;
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData | UpdateTransactionFormData) => void;
  isSubmitting?: boolean;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export default function TransactionForm({ 
  transaction, 
  householdId, 
  isOpen, 
  onClose, 
 onSubmit, 
  isSubmitting = false,
  accounts,
  categories
}: TransactionFormProps) {
  const isEdit = !!transaction;
  
  // Определяем схему валидации в зависимости от режима (создание или редактирование)
  const schema = isEdit 
    ? updateTransactionSchema.partial() 
    : createTransactionSchema.omit({ household_id: true, user_id: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<TransactionFormData | UpdateTransactionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_id: transaction?.account_id || accounts[0]?.id || '',
      category_id: transaction?.category_id || '',
      description: transaction?.description || '',
      amount: transaction?.amount || 0,
      type: transaction?.type || 'expense',
      date: transaction?.date || new Date().toISOString().split('T')[0],
      payee: transaction?.payee || '',
      note: transaction?.note || '',
      debt_id: transaction?.debt_id || null,
      member_id: transaction?.member_id || null,
    }
 });

  const [internalErrors, setInternalErrors] = useState<string[]>([]);

  const handleClose = () => {
    reset();
    setInternalErrors([]);
    onClose();
  };

  const onFormSubmit = (data: TransactionFormData | UpdateTransactionFormData) => {
    // Добавляем household_id и user_id при создании
    if (!isEdit) {
      onSubmit({ 
        ...data, 
        household_id: householdId,
        user_id: 'current_user_id' // В реальном приложении нужно получить ID текущего пользователя
      });
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

  // Отслеживаем тип транзакции для корректного отображения
  const transactionType = watch('type');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Редактировать транзакцию' : 'Создать транзакцию'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Тип *
            </label>
            <Select
              id="type"
              value={transaction?.type || 'expense'}
              onChange={(value) => setValue('type', value as any)}
              className={errors.type ? 'border-red-500' : ''}
            >
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </Select>
            {errors.type && <ValidationError errors={[errors.type.message || '']} />}
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Дата *
            </label>
            <DatePicker
              id="date"
              value={watch('date') || new Date().toISOString().split('T')[0]}
              onChange={(date) => setValue('date', date)}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && <ValidationError errors={[errors.date.message || '']} />}
          </div>

          <div>
            <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Счёт *
            </label>
            <Select
              id="account_id"
              value={watch('account_id') || accounts[0]?.id || ''}
              onChange={(value) => setValue('account_id', value)}
              className={errors.account_id ? 'border-red-500' : ''}
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </Select>
            {errors.account_id && <ValidationError errors={[errors.account_id.message || '']} />}
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
              <option value="">Без категории</option>
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
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Описание
            </label>
            <Input
              id="description"
              {...register('description')}
              type="text"
              placeholder="Описание транзакции"
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <ValidationError errors={[errors.description.message || '']} />}
          </div>

          <div>
            <label htmlFor="payee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Получатель
            </label>
            <Input
              id="payee"
              {...register('payee')}
              type="text"
              placeholder="Получатель/место покупки"
              className={errors.payee ? 'border-red-500' : ''}
            />
            {errors.payee && <ValidationError errors={[errors.payee.message || '']} />}
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Примечание
            </label>
            <Input
              id="note"
              {...register('note')}
              type="text"
              placeholder="Примечание к транзакции"
              className={errors.note ? 'border-red-500' : ''}
            />
            {errors.note && <ValidationError errors={[errors.note.message || '']} />}
          </div>
        </div>

        {internalErrors.length > 0 && <ValidationError errors={internalErrors} className="mt-2" />}

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Создать')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}