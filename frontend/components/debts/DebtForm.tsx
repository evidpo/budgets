import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ValidationError } from '../../components/ui/ValidationError';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DatePicker } from '../../components/ui/DatePicker';
import { 
 createDebtSchema, 
  updateDebtSchema, 
  DebtFormData, 
  UpdateDebtFormData 
} from '../../lib/validation/zodSchemas';
import { Debt } from '../../lib/types';

interface DebtFormProps {
  debt?: Debt;
  householdId: string;
 isOpen: boolean;
  onClose: () => void;
 onSubmit: (data: DebtFormData | UpdateDebtFormData) => void;
  isSubmitting?: boolean;
}

export default function DebtForm({ 
  debt, 
  householdId, 
  isOpen, 
  onClose, 
  onSubmit, 
 isSubmitting = false 
}: DebtFormProps) {
  const isEdit = !!debt;
  
  // Определяем схему валидации в зависимости от режима (создание или редактирование)
 const schema = isEdit 
    ? updateDebtSchema.partial() 
    : createDebtSchema.omit({ household_id: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<DebtFormData | UpdateDebtFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: debt?.name || '',
      counterparty: debt?.counterparty || '',
      amount: debt?.amount || 0,
      opening_balance: debt?.opening_balance || debt?.amount || 0,
      interest_rate: debt?.interest_rate || 0,
      minimum_payment: debt?.minimum_payment || 0,
      start_date: debt?.start_date || new Date().toISOString().split('T')[0],
      end_date: debt?.end_date || '',
      note: debt?.note || '',
    }
  });

 const [internalErrors, setInternalErrors] = useState<string[]>([]);

  const handleClose = () => {
    reset();
    setInternalErrors([]);
    onClose();
  };

  const onFormSubmit = (data: DebtFormData | UpdateDebtFormData) => {
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
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Редактировать долг' : 'Создать долг'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-30 mb-1">
            Название *
          </label>
          <Input
            id="name"
            {...register('name')}
            type="text"
            placeholder="Название долга"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <ValidationError errors={[errors.name.message || '']} />}
        </div>

        <div>
          <label htmlFor="counterparty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Контрагент *
          </label>
          <Input
            id="counterparty"
            {...register('counterparty')}
            type="text"
            placeholder="Кому/от кого долг"
            className={errors.counterparty ? 'border-red-500' : ''}
          />
          {errors.counterparty && <ValidationError errors={[errors.counterparty.message || '']} />}
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
          <label htmlFor="opening_balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Начальный баланс *
          </label>
          <Input
            id="opening_balance"
            {...register('opening_balance', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={errors.opening_balance ? 'border-red-500' : ''}
          />
          {errors.opening_balance && <ValidationError errors={[errors.opening_balance.message || '']} />}
        </div>

        <div>
          <label htmlFor="interest_rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Процентная ставка
          </label>
          <Input
            id="interest_rate"
            {...register('interest_rate', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={errors.interest_rate ? 'border-red-500' : ''}
          />
          {errors.interest_rate && <ValidationError errors={[errors.interest_rate.message || '']} />}
        </div>

        <div>
          <label htmlFor="minimum_payment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Минимальный платеж
          </label>
          <Input
            id="minimum_payment"
            {...register('minimum_payment', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={errors.minimum_payment ? 'border-red-500' : ''}
          />
          {errors.minimum_payment && <ValidationError errors={[errors.minimum_payment.message || '']} />}
        </div>

        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Дата начала *
          </label>
          <DatePicker
            id="start_date"
            value={debt?.start_date || new Date().toISOString().split('T')[0]}
            onChange={(date) => setValue('start_date', date)}
            className={errors.start_date ? 'border-red-500' : ''}
          />
          {errors.start_date && <ValidationError errors={[errors.start_date.message || '']} />}
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Дата окончания
          </label>
          <DatePicker
            id="end_date"
            value={debt?.end_date || ''}
            onChange={(date) => setValue('end_date', date)}
            className={errors.end_date ? 'border-red-500' : ''}
          />
          {errors.end_date && <ValidationError errors={[errors.end_date.message || '']} />}
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Примечание
          </label>
          <Input
            id="note"
            {...register('note')}
            type="text"
            placeholder="Примечание к долгу"
            className={errors.note ? 'border-red-500' : ''}
          />
          {errors.note && <ValidationError errors={[errors.note.message || '']} />}
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