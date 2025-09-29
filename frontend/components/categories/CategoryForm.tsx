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
 createCategorySchema, 
  updateCategorySchema, 
  CategoryFormData, 
  UpdateCategoryFormData 
} from '../../lib/validation/zodSchemas';
import { Category } from '../../lib/types';

interface CategoryFormProps {
  category?: Category;
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData | UpdateCategoryFormData) => void;
  isSubmitting?: boolean;
}

export default function CategoryForm({ 
  category, 
  householdId, 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting = false 
}: CategoryFormProps) {
  const isEdit = !!category;
  
  // Определяем схему валидации в зависимости от режима (создание или редактирование)
  const schema = isEdit 
    ? updateCategorySchema.partial() 
    : createCategorySchema.omit({ household_id: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<CategoryFormData | UpdateCategoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name || '',
      type: category?.type || 'expense',
      parent_id: category?.parent_id || null,
      icon: category?.icon || '',
      color: category?.color || '',
    }
  });

  const [internalErrors, setInternalErrors] = useState<string[]>([]);

 const handleClose = () => {
    reset();
    setInternalErrors([]);
    onClose();
  };

  const onFormSubmit = (data: CategoryFormData | UpdateCategoryFormData) => {
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
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Редактировать категорию' : 'Создать категорию'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Название *
          </label>
          <Input
            id="name"
            {...register('name')}
            type="text"
            placeholder="Название категории"
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
            value={category?.type || 'expense'}
            onChange={(value) => setValue('type', value as any)}
            className={errors.type ? 'border-red-500' : ''}
          >
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </Select>
          {errors.type && <ValidationError errors={[errors.type.message || '']} />}
        </div>

        <div>
          <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Иконка
          </label>
          <Input
            id="icon"
            {...register('icon')}
            type="text"
            placeholder="Иконка категории"
            className={errors.icon ? 'border-red-500' : ''}
          />
          {errors.icon && <ValidationError errors={[errors.icon.message || '']} />}
        </div>

        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Цвет
          </label>
          <Input
            id="color"
            {...register('color')}
            type="text"
            placeholder="#RRGGBB"
            className={errors.color ? 'border-red-500' : ''}
          />
          {errors.color && <ValidationError errors={[errors.color.message || '']} />}
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