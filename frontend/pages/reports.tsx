import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import Table from '../components/ui/Table';
import DatePicker from '../components/ui/DatePicker';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';
import Card from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { useAccounts } from '../lib/queries';
import { useCategories } from '../lib/queries';
import { Household } from '../lib/types';

interface ReportRow {
  [key: string]: any;
}

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('overall-balance');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [excludeTransfers, setExcludeTransfers] = useState<boolean>(false);
  const [groupRoot, setGroupRoot] = useState<boolean>(false);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHousehold = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('members')
          .select('household_id')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          setError('Ошибка при получении данных домохозяйства');
          return;
        }
        
        if (data) {
          setHouseholdId(data.household_id);
        }
      }
    };
    
    fetchHousehold();
  }, []);

  const { data: accounts = [] } = useAccounts(householdId, true);
  const { data: categories = [] } = useCategories(householdId);

  const formatDateForApi = (date: Date | null): string | null => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  };

  const formatCurrency = (amount: number, currency: string = 'RUB'): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const fetchReportData = async () => {
    if (!householdId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = `/reports/${reportType}`;
      const params = new URLSearchParams();
      
      if (reportType === 'overall-balance' || reportType === 'by-budgets') {
        if (reportType === 'by-budgets') {
          params.append('as_of', formatDateForApi(asOfDate) || new Date().toISOString().split('T')[0]);
        }
      } else if (reportType === 'overall-movement' || reportType === 'by-accounts') {
        if (fromDate) params.append('from', formatDateForApi(fromDate)!);
        if (toDate) params.append('to', formatDateForApi(toDate)!);
        params.append('exclude_transfers', excludeTransfers.toString());
      } else if (reportType === 'income-by-category' || reportType === 'expense-by-category') {
        if (fromDate) params.append('from', formatDateForApi(fromDate)!);
        if (toDate) params.append('to', formatDateForApi(toDate)!);
        params.append('group_root', groupRoot.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1${url}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при получении отчета: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      let transformedData: ReportRow[] = [];
      
      switch (reportType) {
        case 'overall-balance':
          transformedData = (data.accounts || []).map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            currency: acc.currency,
            balance: acc.balance
          }));
          break;
          
        case 'by-budgets':
          transformedData = (data || []).map((budget: any) => ({
            id: budget.budget_id,
            name: budget.budget_name,
            period: budget.period,
            limit: budget.limit,
            spent: budget.spent,
            available: budget.available,
            direction: budget.direction
          }));
          break;
          
        case 'by-accounts':
          transformedData = (data || []).map((acc: any) => ({
            id: acc.account_id,
            name: acc.account_name,
            type: acc.account_type,
            currency: acc.currency,
            deposits: acc.deposits,
            withdrawals: acc.withdrawals,
            net: acc.net
          }));
          break;
          
        case 'overall-movement':
          transformedData = (data.accounts || []).map((acc: any) => ({
            id: acc.account_id,
            name: acc.account_name,
            type: acc.account_type,
            currency: acc.currency,
            beginning_balance: acc.beginning_balance,
            deposits: acc.deposits,
            withdrawals: acc.withdrawals,
            net: acc.net,
            ending_balance: acc.ending_balance
          }));
          break;
          
        case 'income-by-category':
        case 'expense-by-category':
          transformedData = (data || []).map((cat: any, index: number) => ({
            id: cat.category_id || `cat-${index}`,
            name: cat.category_name,
            path: cat.path,
            total: cat.total
          }));
          break;
          
        default:
          transformedData = [];
      }
      
      setReportData(transformedData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType, fromDate, toDate, excludeTransfers, groupRoot, asOfDate, householdId]);

  const columns = useMemo(() => {
    switch (reportType) {
      case 'overall-balance':
        return [
          { key: 'name', title: 'Счет', sortable: true },
          { key: 'type', title: 'Тип', sortable: true },
          { key: 'currency', title: 'Валюта', sortable: true },
          {
            key: 'balance',
            title: 'Баланс',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          }
        ];
        
      case 'by-budgets':
        return [
          { key: 'name', title: 'Бюджет', sortable: true },
          { key: 'period', title: 'Период', sortable: true },
          {
            key: 'limit',
            title: 'Лимит',
            sortable: true,
            render: (value: number) => formatCurrency(value)
          },
          {
            key: 'spent',
            title: 'Факт',
            sortable: true,
            render: (value: number) => formatCurrency(value)
          },
          {
            key: 'available',
            title: 'Доступно',
            sortable: true,
            render: (value: number) => formatCurrency(value)
          },
          { key: 'direction', title: 'Направление', sortable: true }
        ];
        
      case 'by-accounts':
        return [
          { key: 'name', title: 'Счет', sortable: true },
          { key: 'type', title: 'Тип', sortable: true },
          { key: 'currency', title: 'Валюта', sortable: true },
          {
            key: 'deposits',
            title: 'Поступления',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          },
          {
            key: 'withdrawals',
            title: 'Списания',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          },
          {
            key: 'net',
            title: 'Нетто',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          }
        ];
        
      case 'overall-movement':
        return [
          { key: 'name', title: 'Счет', sortable: true },
          { key: 'type', title: 'Тип', sortable: true },
          { key: 'currency', title: 'Валюта', sortable: true },
          {
            key: 'beginning_balance',
            title: 'Начальный баланс',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          },
          {
            key: 'deposits',
            title: 'Поступления',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          },
          {
            key: 'withdrawals',
            title: 'Списания',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          },
          {
            key: 'net',
            title: 'Нетто',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          },
          {
            key: 'ending_balance',
            title: 'Конечный баланс',
            sortable: true,
            render: (value: number, record: any) => formatCurrency(value, record.currency)
          }
        ];
        
      case 'income-by-category':
      case 'expense-by-category':
        return [
          { key: 'name', title: 'Категория', sortable: true },
          {
            key: 'total',
            title: 'Сумма',
            sortable: true,
            render: (value: number) => formatCurrency(value)
          }
        ];
        
      default:
        return [];
    }
  }, [reportType]);

  const exportToCSV = () => {
    if (!reportData.length) return;
    
    const headers = columns.map(col => col.title).join(',');
    const rows = reportData.map(row => 
      columns.map(col => {
        let value = row[col.key as keyof typeof row];
        if (typeof value === 'number') {
          if (['balance', 'limit', 'spent', 'available', 'deposits', 'withdrawals', 'net', 'total'].includes(col.key)) {
            value = formatCurrency(value).replace(/[^0-9.,-]/g, '');
          }
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="Отчёты" darkMode={false} toggleDarkMode={() => {}}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Финансовые отчёты</h2>
          
          <Button 
            onClick={exportToCSV} 
            disabled={loading || !reportData.length}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Экспорт в CSV
          </Button>
        </div>
        
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Тип отчёта"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'overall-balance', label: 'Общий баланс' },
                { value: 'by-budgets', label: 'По бюджетам' },
                { value: 'by-accounts', label: 'По счетам' },
                { value: 'overall-movement', label: 'Движение по счетам' },
                { value: 'income-by-category', label: 'Доходы по категориям' },
                { value: 'expense-by-category', label: 'Расходы по категориям' }
              ]}
            />
            
            {(reportType === 'by-budgets') ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата (для бюджетов)
                </label>
                <DatePicker
                  value={asOfDate}
                  onChange={setAsOfDate}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Начальная дата
                  </label>
                  <DatePicker
                    value={fromDate}
                    onChange={setFromDate}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Конечная дата
                  </label>
                  <DatePicker
                    value={toDate}
                    onChange={setToDate}
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end">
              {['overall-movement', 'by-accounts', 'income-by-category', 'expense-by-category'].includes(reportType) && (
                <Toggle
                  checked={excludeTransfers}
                  onChange={setExcludeTransfers}
                  label="Исключить переводы"
                />
              )}
            </div>
            
            <div className="flex items-end">
              {['income-by-category', 'expense-by-category'].includes(reportType) && (
                <Toggle
                  checked={groupRoot}
                  onChange={setGroupRoot}
                  label="Группировать по корню"
                />
              )}
            </div>
          </div>
        </Card>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : reportData.length > 0 ? (
            <Table
              data={reportData}
              columns={columns}
              loading={loading}
              emptyText="Нет данных для отображения"
            />
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
              Нет данных для отображения
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;