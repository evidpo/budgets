import React, { useState, useEffect } from 'react';
import { useDebts, useTransactions } from '../lib/queries';
import { useCreateDebtMutation, useUpdateDebtMutation } from '../lib/mutations';
import { Debt, Transaction, CreateDebtData, UpdateDebtData } from '../lib/types';
import Layout from '../components/Layout';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatCurrency } from '../lib/utils';

interface DebtWithBalance extends Debt {
  currentBalance: number;
  transactions: Transaction[];
}

export default function DebtsPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(''); // В реальном приложении это будет получено из контекста
  const [debts, setDebts] = useState<DebtWithBalance[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [denseRows, setDenseRows] = useState(false);
  const [showAssets, setShowAssets] = useState(true);
  const [showLiabilities, setShowLiabilities] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [selectedDebtTransactions, setSelectedDebtTransactions] = useState<Transaction[] | null>(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  // Запросы данных
  const { data: debtsData, isLoading: debtsLoading, refetch: refetchDebts } = useDebts(selectedHouseholdId);
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions({
    debt_id: debtsData?.map(d => d.id).join(','),
  });

  // Мутации
  const createDebtMutation = useCreateDebtMutation();
  const updateDebtMutation = useUpdateDebtMutation();

  // Обновляем долги с вычисленным балансом
  useEffect(() => {
    if (debtsData) {
      const debtsWithBalance = debtsData.map(debt => {
        // Начальный баланс
        let balance = debt.opening_balance || 0;
        
        // Добавляем транзакции, связанные с этим долгом
        let debtTransactions: Transaction[] = [];
        if (transactionsData) {
          debtTransactions = transactionsData.filter(tx => tx.debt_id === debt.id);
          const transactionSum = debtTransactions.reduce((sum, tx) => sum + tx.amount, 0);
          balance += transactionSum;
        }
        
        return {
          ...debt,
          currentBalance: balance,
          transactions: debtTransactions
        };
      });
      
      setDebts(debtsWithBalance);
    }
  }, [debtsData, transactionsData]);

  // Обработчики форм
  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newDebt: CreateDebtData = {
      household_id: selectedHouseholdId,
      name: formData.get('name') as string,
      counterparty: formData.get('counterparty') as string,
      amount: parseFloat(formData.get('amount') as string),
      opening_balance: parseFloat(formData.get('opening_balance') as string) || 0,
      interest_rate: parseFloat(formData.get('interest_rate') as string) || 0,
      minimum_payment: parseFloat(formData.get('minimum_payment') as string) || 0,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      note: formData.get('note') as string,
    };

    createDebtMutation.mutate(newDebt, {
      onSuccess: () => {
        refetchDebts();
        setShowCreateModal(false);
      }
    });
 };

  const handleUpdateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updatedDebt: UpdateDebtData = {
      name: formData.get('name') as string,
      counterparty: formData.get('counterparty') as string,
      amount: parseFloat(formData.get('amount') as string),
      opening_balance: parseFloat(formData.get('opening_balance') as string) || 0,
      interest_rate: parseFloat(formData.get('interest_rate') as string) || 0,
      minimum_payment: parseFloat(formData.get('minimum_payment') as string) || 0,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      note: formData.get('note') as string,
    };

    updateDebtMutation.mutate({ id: editingDebt.id, data: updatedDebt }, {
      onSuccess: () => {
        refetchDebts();
        setShowEditModal(false);
        setEditingDebt(null);
      }
    });
  };

  const handleEditClick = (debt: Debt) => {
    setEditingDebt(debt);
    setShowEditModal(true);
  };

 const handleDeleteDebt = (id: string) => {
    // В реальном приложении здесь будет вызов мутации на удаление
    // Так как в API нет мутации на удаление, покажем уведомление
    alert('Функция удаления долгов будет реализована позже');
  };

  const handleViewTransactions = (debt: DebtWithBalance) => {
    setSelectedDebtTransactions(debt.transactions);
    setShowTransactionsModal(true);
  };

  // Фильтрация долгов
  const filteredDebts = debts.filter(debt => {
    const matchesText = debt.name.toLowerCase().includes(filterText.toLowerCase()) || 
                        debt.counterparty.toLowerCase().includes(filterText.toLowerCase());
    const isAsset = debt.currentBalance > 0;
    const isLiability = debt.currentBalance < 0;
    
    return matchesText && 
           ((showAssets && isAsset) || (showLiabilities && isLiability));
  });

  // Форматирование баланса для отображения
 const formatBalance = (balance: number) => {
    if (balance > 0) {
      return <span className="text-green-600 dark:text-green-40 font-mono">+{formatCurrency(balance)}</span>;
    } else if (balance < 0) {
      return <span className="text-red-600 dark:text-red-40 font-mono">{formatCurrency(Math.abs(balance))}</span>;
    } else {
      return <span className="text-gray-600 dark:text-gray-400 font-mono">{formatCurrency(balance)}</span>;
    }
  };

  // Типы долгов для отображения
  const debtType = (balance: number) => {
    if (balance > 0) return 'Актив';
    if (balance < 0) return 'Обязательство';
    return 'Нейтральный';
  };

  return (
    <Layout title="Долги" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Семейные долги</h2>
          
          <div className="flex flex-wrap gap-3">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
              onClick={() => setShowCreateModal(true)}
            >
              Новый долг
            </button>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showAssets}
                  onChange={(e) => setShowAssets(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">Активы</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showLiabilities}
                  onChange={(e) => setShowLiabilities(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">Обязательства</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={denseRows}
                  onChange={(e) => setDenseRows(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">Плотные строки</span>
              </label>
            </div>
            
            <input
              type="text"
              placeholder="Поиск..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
            />
          </div>
        </div>

        {/* Таблица долгов */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Контрагент</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Остаток</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Начальный баланс</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Дата начала</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${denseRows ? 'text-sm' : ''}`}>
              {filteredDebts.map((debt) => (
                <tr key={debt.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {debt.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {debt.counterparty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {debtType(debt.currentBalance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {formatBalance(debt.currentBalance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {formatCurrency(debt.opening_balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {debt.start_date ? new Date(debt.start_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(debt)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-30"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredDebts.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {debtsLoading ? 'Загрузка долгов...' : 'Нет долгов для отображения'}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно создания долга */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать новый долг"
      >
        <form onSubmit={handleCreateDebt} className="space-y-4">
          <Input
            label="Название"
            name="name"
            required
            placeholder="Например: Долг Алексею"
          />
          <Input
            label="Контрагент"
            name="counterparty"
            required
            placeholder="Имя должника или кредитора"
          />
          <Input
            label="Сумма"
            name="amount"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
          />
          <Input
            label="Начальный баланс"
            name="opening_balance"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
          <Input
            label="Процентная ставка (%)"
            name="interest_rate"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
          <Input
            label="Минимальный платеж"
            name="minimum_payment"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Дата начала"
              name="start_date"
              type="date"
            />
            <Input
              label="Дата окончания"
              name="end_date"
              type="date"
            />
          </div>
          <Input
            label="Примечание"
            name="note"
            placeholder="Дополнительная информация"
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createDebtMutation.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {createDebtMutation.isPending ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно редактирования долга */}
      {editingDebt && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Редактировать долг"
        >
          <form onSubmit={handleUpdateDebt} className="space-y-4">
            <Input
              label="Название"
              name="name"
              defaultValue={editingDebt.name}
              required
              placeholder="Например: Долг Алексею"
            />
            <Input
              label="Контрагент"
              name="counterparty"
              defaultValue={editingDebt.counterparty}
              required
              placeholder="Имя должника или кредитора"
            />
            <Input
              label="Сумма"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={editingDebt.amount}
              required
              placeholder="0.00"
            />
            <Input
              label="Начальный баланс"
              name="opening_balance"
              type="number"
              step="0.01"
              defaultValue={editingDebt.opening_balance || 0}
              placeholder="0.00"
            />
            <Input
              label="Процентная ставка (%)"
              name="interest_rate"
              type="number"
              step="0.01"
              defaultValue={editingDebt.interest_rate || 0}
              placeholder="0.00"
            />
            <Input
              label="Минимальный платеж"
              name="minimum_payment"
              type="number"
              step="0.01"
              defaultValue={editingDebt.minimum_payment || 0}
              placeholder="0.00"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Дата начала"
                name="start_date"
                type="date"
                defaultValue={editingDebt.start_date || ''}
              />
              <Input
                label="Дата окончания"
                name="end_date"
                type="date"
                defaultValue={editingDebt.end_date || ''}
              />
            </div>
            <Input
              label="Примечание"
              name="note"
              defaultValue={editingDebt.note || ''}
              placeholder="Дополнительная информация"
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={updateDebtMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updateDebtMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}