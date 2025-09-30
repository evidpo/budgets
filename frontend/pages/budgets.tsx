import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useBudgets, useBudget, useBudgetCompute, useCategories, useAccounts } from '../lib/queries';
import { useCreateBudgetMutation, useUpdateBudgetMutation } from '../lib/mutations';
import { Budget, Category, Account, BudgetComputeParams, BudgetComputeResult } from '../lib/types';

interface BudgetFilter {
  period?: string;
  search?: string;
}

interface BudgetWizardStep {
  step: 'period' | 'limit' | 'filters';
  budget: Partial<Budget>;
}

interface BudgetCardProps {
  budget: Budget;
  computeResult?: BudgetComputeResult;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, computeResult, onEdit, onDelete }) => {
  const spent = computeResult?.spent || 0;
  const limit = computeResult?.limit || budget.amount || 0;
  const available = computeResult?.available || 0;
  const carryPrev = computeResult?.carry_prev || 0;

  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const isOverBudget = spent > limit;

  return (
    <Card className="mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{budget.name}</h3>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Период:</span>
              <span className="font-medium">
                {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Лимит:</span>
              <span className="font-medium">{limit.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Факт:</span>
              <span className="font-medium">{spent.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Доступно:</span>
              <span className={`font-medium ${available < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {available.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            {carryPrev !== 0 && (
              <div className="flex justify-between mt-1">
                <span>Перенос:</span>
                <span className={`font-medium ${carryPrev < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {carryPrev.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => onEdit(budget)}>
            Редактировать
          </Button>
          <Button variant="outline" onClick={() => onDelete(budget.id)} className="text-red-600">
            Удалить
          </Button>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>{spent.toLocaleString('ru-RU')} ₽</span>
          <span>{limit.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${
              percentage > 100 ? 'bg-red-500' : percentage > 90 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2">
          <Badge variant={isOverBudget ? 'destructive' : 'default'}>
            {isOverBudget ? 'Перерасход' : 'В пределах лимита'}
          </Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  );
};

interface BudgetWizardProps {
  budget?: Partial<Budget>;
  onClose: () => void;
  onSave: (budget: Partial<Budget>) => void;
  isEditing?: boolean;
}

const BudgetWizard: React.FC<BudgetWizardProps> = ({ budget, onClose, onSave, isEditing = false }) => {
  const [currentStep, setCurrentStep] = useState<BudgetWizardStep['step']>('period');
  const [formData, setFormData] = useState<Partial<Budget>>({
    name: budget?.name || '',
    amount: budget?.amount || 0,
    period: budget?.period || 'monthly',
    start_date: budget?.start_date || new Date().toISOString().split('T')[0],
    end_date: budget?.end_date || new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString().split('T')[0],
    direction: budget?.direction || 'expense',
    rollover: budget?.rollover !== undefined ? budget?.rollover : true,
    include_subtree: budget?.include_subtree !== undefined ? budget?.include_subtree : true,
  });
  
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      
      if (start > end) {
        setDateError('Дата начала не может быть позже даты окончания');
      } else {
        setDateError(null);
      }
    }
  }, [formData.start_date, formData.end_date]);

  const handleNext = () => {
    if (currentStep === 'period') {
      if (!formData.name || !formData.start_date || !formData.end_date || dateError) return;
      setCurrentStep('limit');
    } else if (currentStep === 'limit') {
      if (!formData.amount || formData.amount <= 0) return;
      setCurrentStep('filters');
    } else if (currentStep === 'filters') {
      onSave(formData);
    }
  };

  const handlePrev = () => {
    if (currentStep === 'limit') {
      setCurrentStep('period');
    } else if (currentStep === 'filters') {
      setCurrentStep('limit');
    }
  };

  const handleChange = (field: keyof Budget, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={isEditing ? "Редактировать бюджет" : "Создать бюджет"}>
      <div className="mb-6">
        <div className="flex justify-between mb-4">
          <button 
            className={`px-4 py-2 rounded-md ${currentStep === 'period' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setCurrentStep('period')}
          >
            Период
          </button>
          <button
            className={`px-4 py-2 rounded-md ${currentStep === 'limit' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setCurrentStep('limit')}
          >
            Лимит/Перенос
          </button>
          <button 
            className={`px-4 py-2 rounded-md ${currentStep === 'filters' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setCurrentStep('filters')}
          >
            Фильтры
          </button>
        </div>

        {currentStep === 'period' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Название бюджета
              </label>
              <Input
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Например, Ежемесячный бюджет"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата начала
                </label>
                <Input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                />
                {dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата окончания
                </label>
                <Input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Период
              </label>
              <Select
                value={formData.period || 'monthly'}
                onChange={(value) => handleChange('period', value)}
                options={[
                  { value: 'daily', label: 'Ежедневный' },
                  { value: 'weekly', label: 'Еженедельный' },
                  { value: 'monthly', label: 'Ежемесячный' },
                  { value: 'yearly', label: 'Ежегодный' },
                  { value: 'custom', label: 'Пользовательский' }
                ]}
              />
            </div>
          </div>
        )}

        {currentStep === 'limit' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Лимит (₽)
              </label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', Number(e.target.value))}
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Направление
              </label>
              <Select
                value={formData.direction || 'expense'}
                onChange={(value) => handleChange('direction', value as 'expense' | 'income')}
                options={[
                  { value: 'expense', label: 'Расход' },
                  { value: 'income', label: 'Доход' }
                ]}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rollover"
                checked={formData.rollover}
                onChange={(e) => handleChange('rollover', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="rollover" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Перенос остатка на следующий период
              </label>
            </div>
          </div>
        )}

        {currentStep === 'filters' && (
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="include_subtree"
                checked={formData.include_subtree}
                onChange={(e) => handleChange('include_subtree', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="include_subtree" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Включать подкатегории
              </label>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Дополнительные фильтры будут добавлены позже
            </p>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button 
            onClick={handlePrev} 
            disabled={currentStep === 'period'}
            variant="outline"
          >
            Назад
          </Button>
          
          <Button 
            onClick={handleNext} 
            disabled={
              (currentStep === 'period' && (!formData.name || dateError)) || 
              (currentStep === 'limit' && (!formData.amount || formData.amount <= 0))
            }
          >
            {currentStep === 'filters' ? 'Сохранить' : 'Далее'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default function BudgetsPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  const [filters, setFilters] = useState<BudgetFilter>({});
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'period'>('none');
  
  const householdId = 'test-household-id';
  
  const { data: budgets = [], isLoading, refetch } = useBudgets(householdId);
  const { data: categories = [] } = useCategories(householdId);
  const { data: accounts = [] } = useAccounts(householdId);
  
  const createBudgetMutation = useCreateBudgetMutation();
  const updateBudgetMutation = useUpdateBudgetMutation();
  
  const computeParams: BudgetComputeParams = {
    as_of: new Date().toISOString().split('T')[0]
  };
  
  const filteredBudgets = budgets.filter(budget => {
    const matchesPeriod = !filters.period || budget.period === filters.period;
    const matchesSearch = !filters.search || 
      budget.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (budget.category_id && 
        categories.some(cat => 
          cat.id === budget.category_id && 
          cat.name.toLowerCase().includes(filters.search.toLowerCase())
        )
      );
    return matchesPeriod && matchesSearch;
  });
  
  const groupedBudgets = groupBy === 'period' 
    ? filteredBudgets.reduce((acc, budget) => {
        const periodKey = `${budget.start_date} - ${budget.end_date}`;
        if (!acc[periodKey]) {
          acc[periodKey] = [];
        }
        acc[periodKey].push(budget);
        return acc;
      }, {} as Record<string, Budget[]>)
    : { 'all': filteredBudgets };

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setIsWizardOpen(true);
  };
  
  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setIsWizardOpen(true);
  };
  
  const handleDeleteBudget = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот бюджет?')) {
      console.log('Удаление бюджета с ID:', id);
      refetch();
    }
  };
  
  const handleSaveBudget = async (budgetData: Partial<Budget>) => {
    try {
      if (editingBudget) {
        await updateBudgetMutation.mutateAsync({
          id: editingBudget.id,
          data: budgetData as any
        });
      } else {
        await createBudgetMutation.mutateAsync({
          ...budgetData,
          household_id: householdId
        } as any);
      }
      setIsWizardOpen(false);
      refetch();
    } catch (error) {
      console.error('Ошибка при сохранении бюджета:', error);
    }
  };

  const budgetTableColumns = [
    {
      key: 'name',
      title: 'Название',
      render: (value: string, record: Budget) => (
        <span className="font-medium">{record.name}</span>
      )
    },
    {
      key: 'period',
      title: 'Период',
      render: (value: string, record: Budget) => (
        <span>
          {new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Лимит',
      render: (value: number, record: Budget) => (
        <span>{record.amount?.toLocaleString('ru-RU')} ₽</span>
      ),
      align: 'right' as const
    },
    {
      key: 'spent',
      title: 'Факт',
      render: (value: number, record: Budget) => {
        const { data: computeResult } = useBudgetCompute(record.id, computeParams);
        const spent = computeResult?.spent || 0;
        return <span>{spent.toLocaleString('ru-RU')} ₽</span>;
      },
      align: 'right' as const
    },
    {
      key: 'available',
      title: 'Доступно',
      render: (value: number, record: Budget) => {
        const { data: computeResult } = useBudgetCompute(record.id, computeParams);
        const available = computeResult?.available || 0;
        return <span className={available < 0 ? 'text-red-600' : 'text-green-600'}>
          {available.toLocaleString('ru-RU')} ₽
        </span>;
      },
      align: 'right' as const
    },
    {
      key: 'status',
      title: 'Статус',
      render: (value: string, record: Budget) => {
        const { data: computeResult } = useBudgetCompute(record.id, computeParams);
        const spent = computeResult?.spent || 0;
        const limit = computeResult?.limit || record.amount || 0;
        const isOverBudget = spent > limit;
        return (
          <Badge variant={isOverBudget ? 'destructive' : 'default'}>
            {isOverBudget ? 'Перерасход' : 'В пределах'}
          </Badge>
        );
      }
    }
  ];

  return (
    <Layout title="Бюджеты" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Бюджеты</h1>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button onClick={handleCreateBudget}>
              Новый бюджет
            </Button>
            
            <div className="flex gap-2">
              <Input
                placeholder="Поиск бюджетов..."
                value={filters.search || ''}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-48"
              />
              
              <Select
                value={filters.period || ''}
                onChange={(value) => setFilters({...filters, period: value || undefined})}
                options={[
                  { value: '', label: 'Все периоды' },
                  { value: 'daily', label: 'Ежедневный' },
                  { value: 'weekly', label: 'Еженедельный' },
                  { value: 'monthly', label: 'Ежемесячный' },
                  { value: 'yearly', label: 'Ежегодный' },
                  { value: 'custom', label: 'Пользовательский' }
                ]}
              />
              
              <Select
                value={groupBy}
                onChange={(value) => setGroupBy(value as any)}
                options={[
                  { value: 'none', label: 'Без группировки' },
                  { value: 'period', label: 'По периодам' }
                ]}
              />
            </div>
          </div>
        </div>

        <Card>
          <Table
            data={filteredBudgets}
            columns={budgetTableColumns}
            loading={isLoading}
            emptyText="Нет бюджетов для отображения"
          />
        </Card>

        {Object.entries(groupedBudgets).map(([period, periodBudgets]) => (
          <div key={period}>
            {groupBy !== 'none' && (
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                {period}
              </h2>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {periodBudgets.map(budget => {
                const { data: computeResult } = useBudgetCompute(budget.id, computeParams);
                
                return (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    computeResult={computeResult}
                    onEdit={handleEditBudget}
                    onDelete={handleDeleteBudget}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {isWizardOpen && (
          <BudgetWizard
            budget={editingBudget || undefined}
            isEditing={!!editingBudget}
            onClose={() => setIsWizardOpen(false)}
            onSave={handleSaveBudget}
          />
        )}
      </div>
    </Layout>
  );
}