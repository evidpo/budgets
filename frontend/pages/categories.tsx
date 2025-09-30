import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useCategories } from '../lib/queries';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../lib/mutations';
import { Category } from '../lib/types';
import Modal from '../components/ui/Modal';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
  icon: string;
  color: string;
}

interface CategoryTreeItem extends Category {
  children: CategoryTreeItem[];
  level: number;
}

const CategoriesPage = ({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [denseRows, setDenseRows] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryTree, setCategoryTree] = useState<CategoryTreeItem[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  
  useEffect(() => {
    setHouseholdId('placeholder_household_id');
  }, []);
  
  const { data: categories = [], isLoading, refetch } = useCategories(householdId || '');
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    parent_id: null,
    icon: 'plus',
    color: '#3B82F6',
  });

  useEffect(() => {
    if (categories.length > 0) {
      const rootCategories = buildCategoryTree(categories);
      setCategoryTree(rootCategories);
    }
  }, [categories]);

  const buildCategoryTree = (categories: Category[]): CategoryTreeItem[] => {
    const categoryMap: Record<string, CategoryTreeItem> = {};
    const rootCategories: CategoryTreeItem[] = [];

    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [], level: 0 };
    });

    categories.forEach(cat => {
      const node = categoryMap[cat.id];
      
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        const parent = categoryMap[cat.parent_id];
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        node.level = 0;
        rootCategories.push(node);
      }
    });

    return rootCategories;
  };

  const flattenTree = (tree: CategoryTreeItem[]): Category[] => {
    const result: Category[] = [];
    
    const traverse = (nodes: CategoryTreeItem[], level = 0) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      });
    };
    
    traverse(tree);
    return result;
  };

  const toggleCategoryExpansion = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        parent_id: category.parent_id,
        icon: category.icon || 'plus',
        color: category.color || '#3B82F6',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'expense',
        parent_id: null,
        icon: 'plus',
        color: '#3B82F6',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'expense',
      parent_id: null,
      icon: 'plus',
      color: '#3B82F6',
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorChange = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };

  const handleIconChange = (icon: string) => {
    setFormData(prev => ({
      ...prev,
      icon
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!householdId) {
      console.error('No household ID available');
      return;
    }
    
    const categoryData = {
      household_id: householdId,
      ...formData
    };
    
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data: categoryData
        });
      } else {
        await createMutation.mutateAsync(categoryData);
      }
      handleCloseModal();
      refetch();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const renderCategoryTree = (categories: CategoryTreeItem[], level = 0) => {
    return categories.map(category => {
      const isExpanded = expandedCategories.has(category.id);
      const hasChildren = category.children.length > 0;
      
      return (
        <div key={category.id} className="border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center p-3 ${denseRows ? 'py-2' : 'py-3'}`}>
            <div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center flex-1">
              {hasChildren && (
                <button 
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Icon 
                    name={isExpanded ? 'chevron-down' : 'chevron-up'} 
                    size="sm" 
                  />
                </button>
              )}
              {!hasChildren && <div className="w-6 mr-2" />}
              
              <div className="flex items-center">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  {category.icon || '+'}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {category.name}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {category.type === 'income' ? 'Доход' : 'Расход'}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleOpenModal(category)}
              >
                <Icon name="edit" size="sm" />
              </Button>
            </div>
          </div>
          
          {hasChildren && isExpanded && (
            <div className="ml-6">
              {renderCategoryTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const colorOptions = [
    { value: '#3B82F6', label: 'Синий' },
    { value: '#EF4444', label: 'Красный' },
    { value: '#10B981', label: 'Зеленый' },
    { value: '#F59E0B', label: 'Желтый' },
    { value: '#8B5CF6', label: 'Фиолетовый' },
    { value: '#EC4899', label: 'Розовый' },
  ];

  const iconOptions = [
    { value: 'shopping-cart', label: '🛒' },
    { value: 'dollar', label: '💰' },
    { value: 'car', label: '🚗' },
    { value: 'home', label: '🏠' },
    { value: 'medical', label: '🏥' },
    { value: 'education', label: '🎓' },
    { value: 'entertainment', label: '🎬' },
    { value: 'gift', label: '🎁' },
  ];

  return (
    <Layout title="Категории" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Категории расходов и доходов</h2>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Поиск категорий..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Icon name="search" size="sm" />
              </div>
            </div>
            
            <Button
              onClick={() => handleOpenModal()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
            >
              <Icon name="plus" size="sm" className="mr-1" />
              Новая категория
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
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Загрузка категорий...</div>
          ) : categoryTree.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {renderCategoryTree(categoryTree)}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">Категории не найдены</div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Название"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Тип"
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              options={[
                { value: 'expense', label: 'Расход' },
                { value: 'income', label: 'Доход' }
              ]}
            />
            
            <Select
              label="Родительская категория"
              name="parent_id"
              value={formData.parent_id || ''}
              onChange={handleFormChange}
              options={[
                { value: '', label: 'Без родителя (корневая)' },
                ...categories
                  .filter(cat => cat.id !== editingCategory?.id)
                  .map(category => ({
                    value: category.id,
                    label: category.name
                  }))
              ]}
            />
          </div>
            
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Иконка
            </label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map(icon => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => handleIconChange(icon.value)}
                  className={`p-2 rounded border ${
                    formData.icon === icon.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {icon.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Цвет
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  className={`w-8 h-8 rounded-full border ${
                    formData.color === color.value
                      ? 'border-gray-800 dark:border-gray-200'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>
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
                : editingCategory 
                  ? 'Обновить' 
                  : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default CategoriesPage;