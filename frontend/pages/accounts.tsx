import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useCreateAccountMutation, useUpdateAccountMutation, useReorderAccountsMutation } from '../lib/mutations';
import DragAndDropList from '../components/ui/DragAndDropList';
import Icon from '../components/ui/Icon';
import Amount from '../components/ui/Amount';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';

interface AccountFormValues {
  name: string;
  type: 'cash' | 'checking' | 'savings' | 'credit_card' | 'investment' | 'card' | 'credit' | 'other';
  currency: string;
  opening_balance: number;
  note: string;
}

const AccountsPage: React.FC = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [denseRows, setDenseRows] = useState(false);
  const [formValues, setFormValues] = useState<AccountFormValues>({
    name: '',
    type: 'checking',
    currency: 'RUB',
    opening_balance: 0,
    note: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Получаем ID текущего домохозяйства (в реальном приложении это будет из контекста или сессии)
  const householdId = 'current_household_id'; // Заменить на реальный ID домохозяйства

  // Загрузка счетов
  const { data: accounts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['accounts', householdId, true], // с балансами
    queryFn: () => api.getAccounts(householdId, true).then(res => {
      if (res.error) throw new Error(res.error);
      return res.data || [];
    }),
    staleTime: 1000 * 60 * 5, // 5 минут
  });

 // Фильтрация счетов по архивности
  const filteredAccounts = accounts.filter(account => 
    showArchived || !account.is_archived
  );

  // Мутации
  const createAccountMutation = useCreateAccountMutation();
  const updateAccountMutation = useUpdateAccountMutation();
  const reorderAccountsMutation = useReorderAccountsMutation();

  // Обработчики мутаций
  const handleCreateAccount = async () => {
    // Валидация формы
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      errors.name = 'Название обязательно';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        household_id: householdId,
        name: formValues.name,
        type: formValues.type,
        currency: formValues.currency,
        opening_balance: formValues.opening_balance,
        note: formValues.note
      });

      // Сброс формы
      setFormValues({
        name: '',
        type: 'checking',
        currency: 'RUB',
        opening_balance: 0,
        note: ''
      });
      setShowAddModal(false);
      setFormErrors({});
    } catch (err) {
      console.error('Ошибка при создании счета:', err);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    // Валидация формы
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      errors.name = 'Название обязательно';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await updateAccountMutation.mutateAsync({
        id: editingAccount.id,
        data: {
          name: formValues.name,
          type: formValues.type,
          currency: formValues.currency,
          note: formValues.note
        }
      });

      // Сброс формы
      setFormValues({
        name: '',
        type: 'checking',
        currency: 'RUB',
        opening_balance: 0,
        note: ''
      });
      setEditingAccount(null);
      setFormErrors({});
    } catch (err) {
      console.error('Ошибка при обновлении счета:', err);
    }
 };

  const handleArchiveAccount = async (account: any) => {
    try {
      await updateAccountMutation.mutateAsync({
        id: account.id,
        data: {
          is_archived: !account.is_archived
        }
      });
    } catch (err) {
      console.error('Ошибка при архивации счета:', err);
    }
  };

 const handleReorder = async (reorderedAccounts: any[]) => {
    // Оптимистичное обновление
    const previousData = queryClient.getQueryData(['accounts', householdId, true]);
    
    // Обновляем порядок локально
    const updatedAccounts = reorderedAccounts.map((account, index) => ({
      ...account,
      sort_order: index
    }));
    
    queryClient.setQueryData(['accounts', householdId, true], updatedAccounts);

    try {
      // Отправляем изменения на сервер
      const accountsForUpdate = updatedAccounts.map(account => ({
        id: account.id,
        sort_order: account.sort_order
      }));
      
      await reorderAccountsMutation.mutateAsync({
        accounts: accountsForUpdate,
        householdId
      });
    } catch (err) {
      // Восстанавливаем предыдущее состояние при ошибке
      queryClient.setQueryData(['accounts', householdId, true], previousData);
      console.error('Ошибка при изменении порядка счетов:', err);
    }
 };

  // Обработчики формы
  const handleInputChange = (field: keyof AccountFormValues, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Очистка ошибки при изменении поля
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
 };

  // Иконки для типов счетов
 const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return 'wallet';
      case 'checking':
        return 'bank';
      case 'savings':
        return 'piggy-bank';
      case 'credit_card':
        return 'credit-card';
      case 'investment':
        return 'trending-up';
      case 'card':
        return 'credit-card';
      case 'credit':
        return 'loan';
      default:
        return 'wallet';
    }
  };

  // Открытие модального окна редактирования
 const openEditModal = (account: any) => {
    setEditingAccount(account);
    setFormValues({
      name: account.name,
      type: account.type,
      currency: account.currency,
      opening_balance: account.opening_balance,
      note: account.note || ''
    });
  };

  // Закрытие модального окна
  const closeModal = () => {
    setEditingAccount(null);
    setShowAddModal(false);
    setFormValues({
      name: '',
      type: 'checking',
      currency: 'RUB',
      opening_balance: 0,
      note: ''
    });
    setFormErrors({});
  };

 if (isLoading) {
    return (
      <Layout title="Счета">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Счета">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-red-500">Ошибка загрузки счетов: {error.message}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Счета">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Счета</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredAccounts.length} {filteredAccounts.length === 1 ? 'счёт' : filteredAccounts.length < 5 ? 'счёта' : 'счетов'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <Toggle
                label="Плотные строки"
                checked={denseRows}
                onChange={setDenseRows}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Toggle
                label="Показать архивные"
                checked={showArchived}
                onChange={setShowArchived}
              />
            </div>
            
            <Button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center"
            >
              <Icon name="plus" className="mr-1" size="sm" />
              Новый счёт
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <DragAndDropList
            items={filteredAccounts}
            renderItem={(account, index) => (
              <div className={`flex-1 min-w-0 ${denseRows ? 'py-1' : 'py-2'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <div className="mr-3 flex-shrink-0">
                      <Icon name={getAccountIcon(account.type)} size="md" className="text-gray-500" />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 dark:text-white truncate">
                        {account.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                      </div>
                    </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right min-w-0">
                      <div className="font-medium text-gray-800 dark:text-white font-mono">
                        <Amount value={account.balance} currency={account.currency} />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {account.is_archived ? 'Архивный' : 'Активный'}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(account)}
                        className="p-2"
                      >
                        <Icon name="edit" size="sm" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleArchiveAccount(account)}
                        className="p-2"
                      >
                        <Icon 
                          name={account.is_archived ? 'archive' : 'archive'} 
                          size="sm" 
                          className={account.is_archived ? 'text-gray-400' : 'text-gray-500'}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            onReorder={handleReorder}
            getKey={(account) => account.id}
            className="space-y-2"
          />
        </div>
        
        {filteredAccounts.length === 0 && (
          <div className="text-center py-12 text-gray-50 dark:text-gray-400">
            <p>
              {showArchived 
                ? 'Нет архивных счетов' 
                : 'Нет счетов. Создайте первый счёт.'}
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно добавления/редактирования счёта */}
      <Modal 
        isOpen={showAddModal || !!editingAccount} 
        onClose={closeModal} 
        title={editingAccount ? 'Редактировать счёт' : 'Новый счёт'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название *
            </label>
            <Input
              value={formValues.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Например: Текущий счёт"
              error={formErrors.name}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Тип
            </label>
            <Select
              value={formValues.type}
              onChange={(value) => handleInputChange('type', value)}
              options={[
                { value: 'cash', label: 'Наличные' },
                { value: 'checking', label: 'Текущий счёт' },
                { value: 'savings', label: 'Сберегательный счёт' },
                { value: 'credit_card', label: 'Кредитная карта' },
                { value: 'investment', label: 'Инвестиции' },
                { value: 'card', label: 'Дебетовая карта' },
                { value: 'credit', label: 'Кредит' },
                { value: 'other', label: 'Другое' }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Валюта
            </label>
            <Select
              value={formValues.currency}
              onChange={(value) => handleInputChange('currency', value)}
              options={[
                { value: 'RUB', label: 'Рубль (RUB)' },
                { value: 'USD', label: 'Доллар (USD)' },
                { value: 'EUR', label: 'Евро (EUR)' },
                { value: 'GBP', label: 'Фунт стерлингов (GBP)' }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Начальный баланс
            </label>
            <Input
              type="number"
              value={formValues.opening_balance}
              onChange={(e) => handleInputChange('opening_balance', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Примечание
            </label>
            <Input
              value={formValues.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              placeholder="Дополнительная информация"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={closeModal}>
              Отмена
            </Button>
            <Button 
              onClick={editingAccount ? handleUpdateAccount : handleCreateAccount}
              loading={createAccountMutation.isPending || updateAccountMutation.isPending}
            >
              {editingAccount ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default AccountsPage;