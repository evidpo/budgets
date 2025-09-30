import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useRules, useCategories } from '../lib/queries';
import { useCreateRuleMutation, useUpdateRuleMutation } from '../lib/mutations';
import { Rule, Category } from '../lib/types';
import Modal from '../components/ui/Modal';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';
import Table from '../components/ui/Table';

interface RuleFormData {
  type: 'payee' | 'regex' | 'amount_pattern';
  priority: number;
  category_id: string;
  pattern: string;
  is_active: boolean;
}

const RulesPage = ({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [denseRows, setDenseRows] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [householdId, setHouseholdId] = useState<string | null>(null);
  
  useEffect(() => {
    setHouseholdId('placeholder_household_id');
  }, []);

  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useRules(householdId || '');
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(householdId || '');
  
  const createMutation = useCreateRuleMutation();
  const updateMutation = useUpdateRuleMutation();

  const [formData, setFormData] = useState<RuleFormData>({
    type: 'payee',
    priority: 0,
    category_id: '',
    pattern: '',
    is_active: true,
  });

  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categories.find(cat => cat.id === rule.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'active') {
      return matchesSearch && rule.is_active;
    } else if (activeFilter === 'inactive') {
      return matchesSearch && !rule.is_active;
    } else {
      return matchesSearch;
    }
  });

  const handleOpenModal = (rule?: Rule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        type: rule.type,
        priority: rule.priority,
        category_id: rule.category_id,
        pattern: rule.pattern || '',
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        type: 'payee',
        priority: 0,
        category_id: '',
        pattern: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormData({
      type: 'payee',
      priority: 0,
      category_id: '',
      pattern: '',
      is_active: true,
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priority' ? parseInt(value, 10) : value
    }));
  };

  const handleToggleChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!householdId) {
      console.error('No household ID available');
      return;
    }
    
    const ruleData = {
      household_id: householdId,
      ...formData
    };
    
    try {
      if (editingRule) {
        await updateMutation.mutateAsync({
          id: editingRule.id,
          data: ruleData
        });
      } else {
        await createMutation.mutateAsync(ruleData);
      }
      handleCloseModal();
      refetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const columns = [
    {
      key: 'type',
      title: 'Тип',
      render: (value: string) => {
        const typeLabels: Record<string, string> = {
          'payee': 'Получатель',
          'regex': 'Регулярное выражение',
          'amount_pattern': 'По сумме'
        };
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
            {typeLabels[value] || value}
          </span>
        );
      }
    },
    {
      key: 'pattern',
      title: 'Условие'
    },
    {
      key: 'category_id',
      title: 'Категория',
      render: (value: string) => {
        const category = categories.find(cat => cat.id === value);
        return category ? (
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: category.color }}
            ></div>
            {category.name}
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">-</span>
        );
      }
    },
    {
      key: 'priority',
      title: 'Приоритет',
      render: (value: number) => (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
          {value}
        </span>
      )
    },
    {
      key: 'is_active',
      title: 'Статус',
      render: (value: boolean) => (
        <div className="flex items-center">
          <Toggle checked={value} onChange={() => {}} disabled={true} />
          <span className="ml-2 text-xs">
            {value ? 'Активно' : 'Неактивно'}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (value: any, record: Rule) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenModal(record)}
          >
            <Icon name="edit" size="sm" />
          </Button>
        </div>
      )
    }
  ];

  const tableRowClass = denseRows ? 'py-2' : 'py-4';

  return (
    <Layout title="Правила автокатегоризации" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Финансовые правила</h2>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Поиск правил..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Icon name="search" size="sm" />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveFilter('all')}
                variant={activeFilter === 'all' ? 'primary' : 'outline'}
                size="sm"
              >
                Все
              </Button>
              <Button
                onClick={() => setActiveFilter('active')}
                variant={activeFilter === 'active' ? 'primary' : 'outline'}
                size="sm"
              >
                Активные
              </Button>
              <Button
                onClick={() => setActiveFilter('inactive')}
                variant={activeFilter === 'inactive' ? 'primary' : 'outline'}
                size="sm"
              >
                Неактивные
              </Button>
            </div>
            
            <Button
              onClick={() => handleOpenModal()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
            >
              <Icon name="plus" size="sm" className="mr-1" />
              Новое правило
            </Button>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={denseRows}
                    onChange={() => setDenseRows(!denseRows)}
                  />
                  <div className={`block w-10 h-6 rounded-full ${denseRows ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${denseRows ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-2 text-sm text-gray-700 dark:text-gray-300">Плотные строки</div>
              </label>
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {rulesLoading ? (
            <div className="p-6 text-center text-gray-500">Загрузка правил...</div>
          ) : filteredRules.length > 0 ? (
            <Table
              data={filteredRules}
              columns={columns}
              loading={rulesLoading}
              emptyText="Правила не найдены"
            />
          ) : (
            <div className="p-6 text-center text-gray-500">Правила не найдены</div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingRule ? 'Редактировать правило' : 'Создать правило'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Тип правила
              </label>
              <Select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                className="w-full"
              >
                <option value="payee">По получателю</option>
                <option value="regex">Регулярное выражение</option>
                <option value="amount_pattern">По сумме</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Приоритет
              </label>
              <Input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleFormChange}
                min="0"
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Условие
            </label>
            <Input
              type="text"
              name="pattern"
              value={formData.pattern}
              onChange={handleFormChange}
              placeholder={
                formData.type === 'payee' 
                  ? 'Введите название получателя или его часть' 
                  : formData.type === 'regex' 
                    ? 'Введите регулярное выражение' 
                    : 'Введите шаблон суммы'
              }
              className="w-full"
            />
            {formData.type === 'regex' && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Пример: /магазин|супер|прод/i
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Целевая категория
            </label>
            <Select
              name="category_id"
              value={formData.category_id}
              onChange={handleFormChange}
              className="w-full"
              disabled={categoriesLoading}
            >
              <option value="">Выберите категорию</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formData.is_active ? 'Правило активно' : 'Правило неактивно'}
            </span>
            <Toggle 
              checked={formData.is_active} 
              onChange={handleToggleChange} 
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCloseModal}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending 
                ? 'Сохранение...' 
                : editingRule 
                  ? 'Обновить' 
                  : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default RulesPage;