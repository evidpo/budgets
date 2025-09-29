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
 createRuleSchema, 
  updateRuleSchema, 
  RuleFormData, 
  UpdateRuleFormData 
} from '../../lib/validation/zodSchemas';
import { Rule } from '../../lib/types';

interface RuleFormProps {
  rule?: Rule;
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
 onSubmit: (data: RuleFormData | UpdateRuleFormData) => void;
 isSubmitting?: boolean;
  categories: { id: string; name: string }[];
}

export default function RuleForm({ 
  rule, 
  householdId, 
  isOpen, 
  onClose, 
 onSubmit, 
  isSubmitting = false,
  categories
}: RuleFormProps) {
  const isEdit = !!rule;
  
  // Определяем схему валидации в зависимости от режима (создание или редактирование)
  const schema = isEdit 
    ? updateRuleSchema.partial() 
    : createRuleSchema.omit({ household_id: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<RuleFormData | UpdateRuleFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: rule?.type || 'payee',
      priority: rule?.priority || 0,
      category_id: rule?.category_id || categories[0]?.id || '',
      pattern: rule?.pattern || '',
      is_active: rule?.is_active !== undefined ? rule.is_active : true,
    }
  });

  const [internalErrors, setInternalErrors] = useState<string[]>([]);

  const handleClose = () => {
    reset();
    setInternalErrors([]);
    onClose();
  };

  const onFormSubmit = (data: RuleFormData | UpdateRuleFormData) => {
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
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Редактировать правило' : 'Создать правило'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Тип *
          </label>
          <Select
            id="type"
            value={watch('type') || 'payee'}
            onChange={(value) => setValue('type', value as any)}
            className={errors.type ? 'border-red-500' : ''}
          >
            <option value="payee">По получателю</option>
            <option value="regex">По регулярному выражению</option>
            <option value="amount_pattern">По сумме</option>
          </Select>
          {errors.type && <ValidationError errors={[errors.type.message || '']} />}
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Приоритет *
          </label>
          <Input
            id="priority"
            {...register('priority', { valueAsNumber: true })}
            type="number"
            placeholder="0"
            className={errors.priority ? 'border-red-500' : ''}
          />
          {errors.priority && <ValidationError errors={[errors.priority.message || '']} />}
        </div>

        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Категория *
          </label>
          <Select
            id="category_id"
            value={watch('category_id') || categories[0]?.id || ''}
            onChange={(value) => setValue('category_id', value)}
            className={errors.category_id ? 'border-red-500' : ''}
          >
            {categories.filter(cat => cat.id).map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </Select>
          {errors.category_id && <ValidationError errors={[errors.category_id.message || '']} />}
        </div>

        <div>
          <label htmlFor="pattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Шаблон *
          </label>
          <Input
            id="pattern"
            {...register('pattern')}
            type="text"
            placeholder="Шаблон для сопоставления"
            className={errors.pattern ? 'border-red-500' : ''}
          />
          {errors.pattern && <ValidationError errors={[errors.pattern.message || '']} />}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={watch('is_active') || false}
            onChange={(e) => setValue('is_active', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Активно
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