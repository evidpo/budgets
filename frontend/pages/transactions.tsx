import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useTransactions } from '../lib/queries';
import { useCreateTransactionMutation, useCreateTransferMutation } from '../lib/mutations';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../lib/queries';
import { useDebts } from '../lib/queries';
import { useMembers } from '../lib/queries';
import { Transaction, TransactionFilter, CreateTransactionData, CreateTransferData } from '../lib/types';
import Amount from '../components/ui/Amount';
import CategoryTag from '../components/ui/CategoryTag';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DatePicker from '../components/ui/DatePicker';
import Icon from '../components/ui/Icon';

export default function TransactionsPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  // Состояния для фильтров
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [filterAccountId, setFilterAccountId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterMemberId, setFilterMemberId] = useState<string>('');
  const [filterDebtId, setFilterDebtId] = useState<string>('');

  // Состояния для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Состояния для модального окна создания транзакции
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer'>('expense');
  
  // Состояния для формы создания транзакции
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [debtId, setDebtId] = useState('');
  const [note, setNote] = useState('');
  
  // Состояния для формы перевода
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  
  // Хуки для получения данных
  const { data: accounts = [] } = useAccounts('household-1', true);
  const { data: categories = [] } = useCategories('household-1');
  const { data: debts = [] } = useDebts('household-1');
  const { data: members = [] } = useMembers('household-1');
  
  // Фильтр для получения транзакций
  const filter: TransactionFilter = {
    from_date: filterFromDate || undefined,
    to_date: filterToDate || undefined,
    account_ids: filterAccountId ? [filterAccountId] : undefined,
    category_ids: filterCategoryId ? [filterCategoryId] : undefined,
    member_id: filterMemberId || undefined,
    debt_id: filterDebtId || undefined,
  };
  
  const { data: transactions = [], isLoading } = useTransactions(filter);
  const createTransactionMutation = useCreateTransactionMutation();
  const createTransferMutation = useCreateTransferMutation();

  // Функция для создания транзакции
  const handleCreateTransaction = async () => {
    if (!accountId || !amount) return;
    
    const transactionData: CreateTransactionData = {
      household_id: 'household-1',
      account_id: accountId,
      amount: parseFloat(amount) * (transactionType === 'income' ? 1 : -1),
      date,
      description: description || (transactionType === 'income' ? 'Доход' : 'Расход'),
      category_id: categoryId || undefined,
      member_id: memberId || undefined,
      debt_id: debtId || undefined,
      note: note || undefined,
      payee: description || undefined,
      type: transactionType,
    };

    try {
      await createTransactionMutation.mutateAsync(transactionData);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setAccountId('');
      setCategoryId('');
      setMemberId('');
      setDebtId('');
      setNote('');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Ошибка при создании транзакции:', error);
    }
  };

  // Функция для создания перевода
  const handleCreateTransfer = async () => {
    if (!fromAccountId || !toAccountId || !amount) return;
    
    const transferData: CreateTransferData = {
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount: parseFloat(amount),
      date,
      note: note || undefined,
    };

    try {
      await createTransferMutation.mutateAsync(transferData);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setFromAccountId('');
      setToAccountId('');
      setNote('');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Ошибка при создании перевода:', error);
    }
  };

  // Функция для определения иконки транзакции
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income': return 'plus';
      case 'expense': return 'minus';
      case 'transfer': return 'arrow-right-left';
      default: return 'plus';
    }
  };

  // Функция для определения цвета транзакции
  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 dark:text-green-400';
      case 'expense': return 'text-red-600 dark:text-red-400';
      case 'transfer': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Функция для получения категории по ID
  const getCategoryById = (id: string) => {
    return categories.find(cat => cat.id === id);
  };

  // Функция для получения счета по ID
  const getAccountById = (id: string) => {
    return accounts.find(acc => acc.id === id);
  };

  // Пагинация
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout title="Транзакции" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">С даты</label>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">По дату</label>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Счет</label>
            <select
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Все счета</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Все категории</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Участник</label>
            <select
              value={filterMemberId}
              onChange={(e) => setFilterMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Все участники</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>{member.user_id}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Долг</label>
            <select
              value={filterDebtId}
              onChange={(e) => setFilterDebtId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Все долги</option>
              {debts.map(debt => (
                <option key={debt.id} value={debt.id}>{debt.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Кнопка создания новой транзакции */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Финансовые транзакции</h2>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center"
          >
            <Icon name="plus" className="mr-2" /> Новая транзакция
          </Button>
        </div>

        {/* Список транзакций */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-4">Загрузка транзакций...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Дата</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Описание</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Категория</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Счет</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Сумма</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Тип</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedTransactions.map((transaction: Transaction) => {
                  const category = getCategoryById(transaction.category_id || '');
                  const account = getAccountById(transaction.account_id);
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(transaction.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.description || transaction.payee}
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap text-sm">
                        {category ? (
                          <CategoryTag
                            name={category.name}
                            color={category.color}
                            icon={category.icon}
                          />
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 italic">Без категории</span>
                        )}
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {account?.name}
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap text-sm font-mono">
                        <Amount
                          value={transaction.amount}
                          currency="₽"
                          className={transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                        />
                      </td>
                      <td className="px-4 py-1 whitespace-nowrap text-sm">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionColor(transaction.type)}`}>
                          <Icon name={getTransactionIcon(transaction.type)} size="sm" className="mr-1" />
                          {transaction.type === 'income' ? 'Доход' :
                           transaction.type === 'expense' ? 'Расход' : 'Перевод'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          
          {transactions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Транзакции не найдены. Создайте первую транзакцию, нажав на кнопку "Новая транзакция".
            </div>
          )}
        </div>

        {/* Пагинация */}
        {transactions.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                  currentPage === 1 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Назад
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                  currentPage === totalPages 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Вперед
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Страница <span className="font-medium">{currentPage}</span> из <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                      currentPage === 1 
                        ? 'cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-700' 
                        : 'bg-white dark:bg-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="sr-only">Предыдущая</span>
                    <Icon name="chevron-up" className="h-5 w-5 transform rotate-90" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-600 dark:border-blue-600 dark:text-white'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                        } border`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                      currentPage === totalPages 
                        ? 'cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-700' 
                        : 'bg-white dark:bg-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="sr-only">Следующая</span>
                    <Icon name="chevron-up" className="h-5 w-5 transform -rotate-90" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно создания транзакции */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="md">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Создать новую транзакцию
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Тип транзакции
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      transactionType === 'income'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                    onClick={() => setTransactionType('income')}
                  >
                    Доход
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      transactionType === 'expense'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                    onClick={() => setTransactionType('expense')}
                  >
                    Расход
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      transactionType === 'transfer'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                    onClick={() => setTransactionType('transfer')}
                  >
                    Перевод
                  </button>
                </div>
              </div>
              
              {transactionType !== 'transfer' ? (
                <>
                  <div>
                    <Input
                      label="Описание"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Например, Зарплата или Продукты"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Сумма"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <DatePicker
                        label="Дата"
                        value={new Date(date)}
                        onChange={(newDate) => setDate(newDate.toISOString().split('T')[0])}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Счет
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Выберите счет</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({account.balance} {account.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Категория
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Без категории</option>
                        {categories
                          .filter(cat => cat.type === transactionType)
                          .map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Участник
                      </label>
                      <select
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Не указан</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.user_id}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Долг
                      </label>
                      <select
                        value={debtId}
                        onChange={(e) => setDebtId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Не указан</option>
                        {debts.map(debt => (
                          <option key={debt.id} value={debt.id}>
                            {debt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Input
                      label="Примечание"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Дополнительная информация"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Счет отправителя
                      </label>
                      <select
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Выберите счёт</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({account.balance} {account.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Счет получателя
                      </label>
                      <select
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Выберите счёт</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({account.balance} {account.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Сумма"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <DatePicker
                        label="Дата"
                        value={new Date(date)}
                        onChange={(newDate) => setDate(newDate.toISOString().split('T')[0])}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Input
                      label="Примечание"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Дополнительная информация о переводе"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Отмена
              </Button>
              <Button 
                onClick={transactionType === 'transfer' ? handleCreateTransfer : handleCreateTransaction}
                disabled={
                  transactionType === 'transfer' 
                    ? !fromAccountId || !toAccountId || !amount
                    : !accountId || !amount
                }
              >
                Создать {transactionType === 'transfer' ? 'перевод' : 'транзакцию'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}