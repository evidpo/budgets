import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ValidationError } from '../../components/ui/ValidationError';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { 
 createAccountSchema, 
  updateAccountSchema, 
  AccountFormData, 
  UpdateAccountFormData 
} from '../../lib/validation/zodSchemas';
import { Account } from '../../lib/types';

interface AccountFormProps {
  account?: Account;
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
 onSubmit: (data: AccountFormData | UpdateAccountFormData) => void;
  isSubmitting?: boolean;
}

export default function AccountForm({ 
  account, 
  householdId, 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting = false 
}: AccountFormProps) {
  const isEdit = !!account;
  
  // Определяем схему валидации в зависимости от режима (создание или редактирование)
  const schema = isEdit 
    ? updateAccountSchema.partial() 
    : createAccountSchema.omit({ household_id: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<AccountFormData | UpdateAccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name || '',
      type: account?.type || 'checking',
      currency: account?.currency || 'RUB',
      opening_balance: account?.opening_balance || 0,
      note: account?.note || '',
    }
  });

  const [internalErrors, setInternalErrors] = useState<string[]>([]);

  const handleClose = () => {
    reset();
    setInternalErrors([]);
    onClose();
  };

 const onFormSubmit = (data: AccountFormData | UpdateAccountFormData) => {
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
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Редактировать счёт' : 'Создать счёт'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Название *
          </label>
          <Input
            id="name"
            {...register('name')}
            type="text"
            placeholder="Название счёта"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <ValidationError errors={[errors.name.message || '']} />}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Тип *
          </label>
          <Select
            id="type"
            value={account?.type || 'checking'}
            onChange={(value) => setValue('type', value as any)}
            className={errors.type ? 'border-red-500' : ''}
          >
            <option value="cash">Наличные</option>
            <option value="checking">Текущий счёт</option>
            <option value="savings">Сберегательный счёт</option>
            <option value="credit_card">Кредитная карта</option>
            <option value="investment">Инвестиции</option>
            <option value="card">Дебетовая карта</option>
            <option value="credit">Кредит</option>
            <option value="other">Другое</option>
          </Select>
          {errors.type && <ValidationError errors={[errors.type.message || '']} />}
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Валюта *
          </label>
          <Input
            id="currency"
            {...register('currency')}
            type="text"
            placeholder="Код валюты (например, RUB)"
            className={errors.currency ? 'border-red-500' : ''}
          />
          {errors.currency && <ValidationError errors={[errors.currency.message || '']} />}
        </div>

        <div>
          <label htmlFor="opening_balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Начальный баланс
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
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Примечание
          </label>
          <Input
            id="note"
            {...register('note')}
            type="text"
            placeholder="Примечание к счёту"
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